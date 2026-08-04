import { WebSocket } from "ws";
import { db, AuctionStatus } from "./db";
import { User } from "./utils/SocketManager";
import { publicBidSelect, type PublicBidT } from "@repo/db/types";
import { AUCTION_ENDED, NEW_BID, TIME_LEFT } from "./utils/messages";

export type bids = PublicBidT;

export { AuctionStatus };

export type BidRejection =
  | "not-active"
  | "not-a-number"
  | "not-an-integer"
  | "too-low"
  | "outbid";

export type BidResult =
  | { ok: true; bid: PublicBidT }
  | { ok: false; reason: BidRejection; minimum: number };

export class Auction {
  public auctionId: string;
  public users: User[];
  public currentPrice: number;
  public startingPrice: number;
  public startDate: Date;
  public endDate: Date;
  public bids: bids[];
  /** Was misspelled `curentBidder`, and was never reassigned after a bid. */
  public currentBidder: string | null;
  public status: AuctionStatus;

  /** One timer per auction, not one per connected user. See startTicking(). */
  private ticker: NodeJS.Timeout | null = null;

  constructor(params: {
    auctionId: string;
    currentBidder: string | null;
    currentPrice: number;
    startingPrice: number;
    startDate: Date;
    endDate: Date;
    bids: bids[];
    status: AuctionStatus;
  }) {
    this.auctionId = params.auctionId;
    this.users = [];
    this.currentPrice = params.currentPrice;
    this.startingPrice = params.startingPrice;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.bids = params.bids;
    this.currentBidder = params.currentBidder;
    this.status = params.status;
  }

  addUser(user: User) {
    this.users.push(user);
  }

  /**
   * Was `this.users.filter(...)` with the result discarded, so the array only
   * ever grew — every socket ever connected stayed in it forever, and
   * broadcasting then called send() on closed sockets, which throws.
   *
   * Matches on object identity rather than userId so a user with two tabs open
   * does not lose both entries when one closes.
   */
  removeUser(user: User) {
    this.users = this.users.filter((candidate) => candidate !== user);
  }

  get isEmpty(): boolean {
    return this.users.length === 0;
  }

  /** The smallest amount that would be accepted right now. */
  get minimumBid(): number {
    return Math.max(this.currentPrice, this.startingPrice) + 1;
  }

  /**
   * There was no server-side validation of any kind here. The only check on a
   * bid amount lived in the client's BidDialog, so a raw socket could win a
   * 30-lakh auction with a bid of 1 -- or send a string, or NaN, or a fractional
   * amount, each of which produced a Prisma error inside an unawaited promise
   * and took the process down with it.
   */
  async createBid(amount: unknown, user: User): Promise<BidResult> {
    if (this.status !== AuctionStatus.ACTIVE || this.hasEnded()) {
      return { ok: false, reason: "not-active", minimum: this.minimumBid };
    }
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      return { ok: false, reason: "not-a-number", minimum: this.minimumBid };
    }
    if (!Number.isInteger(amount)) {
      // Bid.amount and Auction.currentPrice are both Int columns.
      return { ok: false, reason: "not-an-integer", minimum: this.minimumBid };
    }
    if (amount < this.minimumBid) {
      return { ok: false, reason: "too-low", minimum: this.minimumBid };
    }

    // Two concurrent bids each used to run an independent create + update with
    // no transaction and no guard, so a lower bid arriving second overwrote a
    // higher currentPrice. The conditional update makes the loser fail instead.
    let bid: PublicBidT;
    try {
      bid = await db.$transaction(async (tx) => {
        const claimed = await tx.auction.updateMany({
          where: { id: this.auctionId, currentPrice: { lt: amount } },
          data: { currentPrice: amount },
        });

        if (claimed.count === 0) {
          throw new OutbidError();
        }

        return tx.bid.create({
          data: {
            userId: user.userId,
            auctionId: this.auctionId,
            amount,
          },
          select: publicBidSelect,
        });
      });
    } catch (error) {
      if (error instanceof OutbidError) {
        // Refresh from the database so the rejection carries the real minimum.
        await this.refreshPrice();
        return { ok: false, reason: "outbid", minimum: this.minimumBid };
      }
      throw error;
    }

    // Only record in memory once the write succeeded. The push used to happen
    // first, so a failed write left a phantom bid in the list. Unshift rather
    // than push: bids are loaded newest-first.
    this.bids.unshift(bid);
    this.currentPrice = amount;
    this.currentBidder = user.userId;

    this.broadcast({ type: NEW_BID, bid });
    return { ok: true, bid };
  }

  private async refreshPrice(): Promise<void> {
    const row = await db.auction.findUnique({
      where: { id: this.auctionId },
      select: { currentPrice: true },
    });
    if (row) this.currentPrice = row.currentPrice;
  }

  /**
   * Sending to a closed socket throws. This used to run unguarded inside a
   * setInterval, so one stale socket crashed the process on the next tick.
   */
  broadcast(message: unknown) {
    if (this.users.length === 0) return;
    const payload = JSON.stringify(message);
    for (const user of this.users) {
      if (user.socket.readyState !== WebSocket.OPEN) continue;
      try {
        user.socket.send(payload);
      } catch (error) {
        console.error("failed to send to participant", error);
      }
    }
  }

  broadcastExcept(message: unknown, exclude: User) {
    const payload = JSON.stringify(message);
    for (const user of this.users) {
      if (user === exclude) continue;
      if (user.socket.readyState !== WebSocket.OPEN) continue;
      try {
        user.socket.send(payload);
      } catch (error) {
        console.error("failed to send to participant", error);
      }
    }
  }

  public async setStatus(status: AuctionStatus) {
    // Was an if/else chain with three identical update calls that silently
    // dropped CANCELLED, leaving that transition in memory only.
    await db.auction.update({
      where: { id: this.auctionId },
      data: { status },
    });
    this.status = status;
  }

  public hasEnded(): boolean {
    return this.calculateTimeLeft() <= 0;
  }

  public calculateTimeLeft(): number {
    return Math.max(0, new Date(this.endDate).getTime() - Date.now());
  }

  /**
   * One interval for the whole auction.
   *
   * This used to be created per connected user inside AuctionManager.addHandler,
   * was never stored and never cleared. Each one broadcast to *all* users, so N
   * participants produced N-squared TIME_LEFT messages per second, and every
   * connection ever made leaked a timer that outlived its socket.
   */
  public startTicking(onEnded: (auction: Auction) => void) {
    if (this.ticker) return;

    this.ticker = setInterval(() => {
      const timeLeft = this.calculateTimeLeft();
      this.broadcast({ type: TIME_LEFT, timeLeft });

      if (timeLeft > 0) return;

      if (this.status !== AuctionStatus.ENDED) {
        // calculateTimeLeft used to set this.status = ENDED in memory and never
        // persist it, so the database row stayed ACTIVE after expiry.
        this.setStatus(AuctionStatus.ENDED)
          .then(() => this.broadcast({ type: AUCTION_ENDED }))
          .catch((error) => console.error("failed to end auction", error));
      }

      this.stopTicking();
      onEnded(this);
    }, 1000);
  }

  public stopTicking() {
    if (!this.ticker) return;
    clearInterval(this.ticker);
    this.ticker = null;
  }
}

class OutbidError extends Error {}
