import { AuctionStatus, db } from './db';
import { User } from './User';
import { enqueueEmail } from './queue';
import {
  MIN_BID_AMOUNT,
  minimumNextBid,
  type BidRejectionReason,
} from '@repo/db/auction-rules';
import type { BidsWithUser } from '@repo/db/types';

export type BidResult =
  | { ok: true; bid: BidsWithUser }
  | { ok: false; reason: BidRejectionReason; minimum?: number };

/** Thrown inside the bid transaction to roll it back with a reason attached. */
class BidRejected extends Error {
  constructor(
    readonly reason: BidRejectionReason,
    readonly minimum?: number
  ) {
    super(reason);
  }
}

/**
 * One auction's live state plus the sockets watching it. The authoritative
 * record is the database; this holds only what the tick loop needs so it can
 * broadcast a countdown without querying every second.
 */
export class Auction {
  private users: User[] = [];

  constructor(
    readonly auctionId: string,
    public status: AuctionStatus,
    public currentPrice: number,
    readonly startingPrice: number,
    readonly startDate: Date,
    readonly endDate: Date,
    readonly ownerId: string
  ) {}

  addUser(user: User) {
    this.users.push(user);
  }

  /**
   * Removal is by socket, not by user id: someone with the lot open in two tabs
   * should not lose both when they close one. (The old implementation called
   * filter and discarded the result, so nobody was ever removed at all.)
   */
  removeSocket(socket: User['socket']) {
    this.users = this.users.filter((user) => user.socket !== socket);
  }

  get isEmpty(): boolean {
    return this.users.length === 0;
  }

  get participantCount(): number {
    return this.users.length;
  }

  broadcast(payload: unknown) {
    for (const user of this.users) user.send(payload);
  }

  broadcastExcept(payload: unknown, exclude: User) {
    for (const user of this.users) {
      if (user !== exclude) user.send(payload);
    }
  }

  timeLeft(): number {
    return Math.max(0, this.endDate.getTime() - Date.now());
  }

  async setStatus(status: AuctionStatus) {
    if (this.status === status) return;
    await db.auction.update({ where: { id: this.auctionId }, data: { status } });
    this.status = status;
  }

  /**
   * Accepts a bid or explains why not. Everything that decides the outcome is
   * read and written inside one transaction, and the price update is guarded by
   * `currentPrice < amount`, so two simultaneous bids cannot both win and a
   * late bid can never lower the price.
   */
  async placeBid(amount: number, user: User): Promise<BidResult> {
    if (!user.userId) return { ok: false, reason: 'NOT_AUTHENTICATED' };
    if (!Number.isInteger(amount) || amount < MIN_BID_AMOUNT) {
      return { ok: false, reason: 'INVALID_AMOUNT' };
    }
    const bidderId = user.userId;

    try {
      const { bid, outbid, auctionTitle } = await db.$transaction(async (tx) => {
        const auction = await tx.auction.findUnique({
          where: { id: this.auctionId },
          select: {
            userId: true,
            status: true,
            title: true,
            startDate: true,
            endDate: true,
            currentPrice: true,
            startingPrice: true,
          },
        });
        if (!auction) throw new BidRejected('AUCTION_NOT_FOUND');

        const now = new Date();
        if (
          auction.status !== AuctionStatus.ACTIVE ||
          now < auction.startDate ||
          now >= auction.endDate
        ) {
          throw new BidRejected('NOT_ACTIVE');
        }
        if (auction.userId === bidderId) throw new BidRejected('OWN_AUCTION');

        const minimum = minimumNextBid(auction.currentPrice, auction.startingPrice);
        if (amount < minimum) throw new BidRejected('TOO_LOW', minimum);

        // Read the standing top bid before we replace it, so we know who to notify.
        const previous = await tx.bid.findFirst({
          where: { auctionId: this.auctionId },
          orderBy: [{ amount: 'desc' }, { createdAt: 'desc' }],
          select: { userId: true, user: { select: { email: true, userName: true } } },
        });

        const updated = await tx.auction.updateMany({
          where: { id: this.auctionId, currentPrice: { lt: amount } },
          data: { currentPrice: amount },
        });
        if (updated.count === 0) throw new BidRejected('OUTBID');

        const created = await tx.bid.create({
          data: { userId: bidderId, auctionId: this.auctionId, amount },
          include: { user: true },
        });

        return {
          bid: created,
          auctionTitle: auction.title,
          outbid:
            previous && previous.userId !== bidderId ? previous.user : null,
        };
      });

      this.currentPrice = bid.amount;

      if (outbid) {
        // Detached on purpose so the bidder is not kept waiting on Redis, with
        // an explicit catch so a queue failure cannot become an unhandled
        // rejection and take the process down.
        void enqueueEmail({
          type: 'outbid',
          to: outbid.email,
          username: outbid.userName,
          auctionId: this.auctionId,
          auctionTitle,
          newAmount: bid.amount,
          newBidder: bid.user.userName,
        }).catch((error) =>
          console.error('[auction %s] outbid notice failed:', this.auctionId, error)
        );
      }

      return { ok: true, bid };
    } catch (error) {
      if (error instanceof BidRejected) {
        return { ok: false, reason: error.reason, minimum: error.minimum };
      }
      console.error('[auction %s] bid failed:', this.auctionId, error);
      return { ok: false, reason: 'AUCTION_NOT_FOUND' };
    }
  }
}
