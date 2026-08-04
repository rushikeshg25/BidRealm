import { Auction, AuctionStatus, bids } from "./Auction";
import { User } from "./utils/SocketManager";
import { db } from "./db";
import { publicBidSelect } from "@repo/db/types";
import { BID, ERROR, JOINED, TIME_LEFT } from "./utils/messages";

/** How long a socket may go without responding to a ping before it is closed. */
const HEARTBEAT_INTERVAL_MS = 30_000;

export class AuctionManager {
  public auctions: Map<string, Auction>;

  /**
   * Guards against the check-then-await race in addUsertoAuction: two sockets
   * joining a cold auction both passed `if (!this.auctions.get(id))`, both
   * awaited the database, both constructed an Auction, and the second `set()`
   * overwrote the first -- leaving the first user attached to an orphaned
   * instance that never received a broadcast. Callers now await the same promise.
   */
  private loading: Map<string, Promise<Auction>>;

  private heartbeat: NodeJS.Timeout;

  constructor() {
    this.auctions = new Map<string, Auction>();
    this.loading = new Map<string, Promise<Auction>>();

    // Without a heartbeat, half-open connections (a laptop closing its lid, a
    // dropped mobile network) are never reaped: no close event fires, so the
    // participant list keeps a socket that will never respond.
    this.heartbeat = setInterval(() => this.reapDeadSockets(), HEARTBEAT_INTERVAL_MS);
    this.heartbeat.unref?.();
  }

  public async addUsertoAuction(user: User): Promise<void> {
    const auction = await this.getOrLoad(user.auctionId);

    auction.addUser(user);
    this.addHandler(user, auction);

    // One ticker per auction, started on the first join.
    auction.startTicking((ended) => {
      if (ended.isEmpty) this.evict(ended.auctionId);
    });

    user.socket.send(JSON.stringify({ type: JOINED, data: "Auction Joined" }));
    user.socket.send(
      JSON.stringify({ type: TIME_LEFT, timeLeft: auction.calculateTimeLeft() })
    );
  }

  private async getOrLoad(auctionId: string): Promise<Auction> {
    const existing = this.auctions.get(auctionId);
    if (existing) return existing;

    const inFlight = this.loading.get(auctionId);
    if (inFlight) return inFlight;

    const promise = this.load(auctionId);
    this.loading.set(auctionId, promise);

    try {
      const auction = await promise;
      this.auctions.set(auctionId, auction);
      return auction;
    } finally {
      this.loading.delete(auctionId);
    }
  }

  private async load(auctionId: string): Promise<Auction> {
    const row = await db.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          select: publicBidSelect,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Previously every field was cast off a possibly-null row
    // (`auction?.currentPrice as number`), so a missing auction produced an
    // instance full of undefined and `undefined` was used as a database key.
    if (!row) throw new Error(`auction ${auctionId} not found`);

    return new Auction({
      auctionId: row.id,
      currentBidder: row.bids[0]?.userId ?? null,
      currentPrice: row.currentPrice,
      startingPrice: row.startingPrice,
      startDate: row.startDate,
      endDate: row.endDate,
      bids: row.bids as bids[],
      status: row.status,
    });
  }

  public isAuctionWsActive(auctionId: string): boolean {
    return this.auctions.has(auctionId);
  }

  removeHandler(user: User) {
    const auction = this.auctions.get(user.auctionId);
    if (!auction) return;

    // Takes the User rather than (ws, userId, auctionId) so removal matches on
    // socket identity: two tabs are two entries, and removing by userId evicted
    // both at once.
    auction.removeUser(user);

    // Nothing ever removed an auction from the map, nor stopped its timers, so
    // both the map and every Auction's bid list grew without bound for the
    // lifetime of the process.
    if (auction.isEmpty) this.evict(user.auctionId);
  }

  private evict(auctionId: string) {
    const auction = this.auctions.get(auctionId);
    if (!auction) return;
    auction.stopTicking();
    this.auctions.delete(auctionId);
  }

  public updateAuctionStatuses() {
    const now = new Date();

    this.auctions.forEach((auction) => {
      const target =
        now > auction.endDate
          ? AuctionStatus.ENDED
          : now > auction.startDate
            ? AuctionStatus.ACTIVE
            : AuctionStatus.INACTIVE;

      if (auction.status === target) return;
      if (auction.status === AuctionStatus.CANCELLED) return;

      // setStatus was called fire-and-forget with no catch; an unhandled
      // rejection terminates Node 18+.
      auction.setStatus(target).catch((error) => {
        console.error(`failed to set status for ${auction.auctionId}`, error);
      });
    });
  }

  private reapDeadSockets() {
    this.auctions.forEach((auction) => {
      for (const user of [...auction.users]) {
        if (!user.isAlive) {
          user.socket.terminate();
          auction.removeUser(user);
          continue;
        }
        user.isAlive = false;
        user.socket.ping();
      }
      if (auction.isEmpty) this.evict(auction.auctionId);
    });
  }

  private addHandler(user: User, auction: Auction) {
    user.socket.on("pong", () => {
      user.isAlive = true;
    });

    user.socket.on("message", async (data) => {
      let message: { type?: unknown; amount?: unknown };

      try {
        message = JSON.parse(data.toString());
      } catch {
        // An unguarded JSON.parse in a 'message' listener means any malformed
        // frame from any client throws out of the handler and crashes the
        // process.
        this.reject(user, "malformed message");
        return;
      }

      if (message.type !== BID) return;

      try {
        // createBid was called without await or .catch(), so any rejection --
        // including the Prisma error from a fractional amount -- became an
        // unhandled rejection.
        const result = await auction.createBid(message.amount, user);
        if (!result.ok) {
          this.reject(
            user,
            result.reason === "not-active"
              ? "This auction is not accepting bids."
              : result.reason === "outbid"
                ? `Someone bid higher first. Minimum is now ${result.minimum}.`
                : result.reason === "too-low"
                  ? `Bid must be at least ${result.minimum}.`
                  : "Bid amount must be a whole number.",
            result.reason
          );
        }
      } catch (error) {
        console.error("failed to record bid", error);
        this.reject(user, "Could not record your bid. Please try again.");
      }
    });
  }

  private reject(user: User, message: string, reason?: string) {
    if (user.socket.readyState !== user.socket.OPEN) return;
    // The old error path replied "Auction not found" for a perfectly live
    // auction, because the status comparison was `"ACTIVE" === 1`.
    user.socket.send(JSON.stringify({ type: ERROR, message, reason }));
  }

  public shutdown() {
    clearInterval(this.heartbeat);
    this.auctions.forEach((auction) => auction.stopTicking());
    this.auctions.clear();
  }
}
