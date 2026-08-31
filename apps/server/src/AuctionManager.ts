import { WebSocket } from 'ws';
import { Auction } from './Auction';
import { User } from './User';
import { AuctionStatus, db } from './db';
import { enqueueEmail } from './queue';
import { minimumNextBid, bidRejectionMessage } from '@repo/db/auction-rules';
import {
  AUCTION_ENDED,
  BID,
  BID_ACCEPTED,
  BID_PLACED,
  BID_REJECTED,
  ERROR,
  JOINED,
  TIME_LEFT,
  parseIncomingMessage,
} from './utils/messages';

/** How often connected clients get a fresh countdown. */
const TICK_MS = 1_000;
/** How often the database is swept for auctions that should start or end. */
const SWEEP_MS = 15_000;

export class AuctionManager {
  private readonly auctions = new Map<string, Auction>();
  /** Auctions mid-settlement, so the tick and the sweep cannot both settle one. */
  private readonly settling = new Set<string>();
  private tick: NodeJS.Timeout | null = null;
  private sweep: NodeJS.Timeout | null = null;

  start() {
    // One ticker for the whole process. This used to be one interval per
    // connection, never cleared, each broadcasting to every user in the
    // auction -- so N users produced N intervals x N recipients per second,
    // and the intervals outlived the sockets that created them.
    this.tick = setInterval(() => void this.onTick(), TICK_MS);
    this.sweep = setInterval(() => void this.onSweep(), SWEEP_MS);
    void this.onSweep();
  }

  async stop() {
    if (this.tick) clearInterval(this.tick);
    if (this.sweep) clearInterval(this.sweep);
    this.tick = null;
    this.sweep = null;
  }

  async join(user: User) {
    let auction = this.auctions.get(user.auctionId);

    if (!auction) {
      const record = await db.auction.findUnique({
        where: { id: user.auctionId },
        select: {
          status: true,
          currentPrice: true,
          startingPrice: true,
          startDate: true,
          endDate: true,
          userId: true,
        },
      });

      if (!record) {
        user.send({ type: ERROR, message: 'This lot does not exist.' });
        user.socket.close();
        return;
      }

      auction = new Auction(
        user.auctionId,
        record.status,
        record.currentPrice,
        record.startingPrice,
        record.startDate,
        record.endDate,
        record.userId
      );
      this.auctions.set(user.auctionId, auction);
    }

    auction.addUser(user);
    this.attachHandlers(user, auction);

    user.send({
      type: JOINED,
      auctionId: auction.auctionId,
      status: auction.status,
      currentPrice: auction.currentPrice,
      minimumBid: minimumNextBid(auction.currentPrice, auction.startingPrice),
      timeLeft: auction.timeLeft(),
      // Spectators get every broadcast but no bidding, so the UI can say so
      // rather than failing a bid after the fact.
      canBid: user.canBid && user.userId !== auction.ownerId,
    });
  }

  leave(socket: WebSocket, auctionId: string) {
    const auction = this.auctions.get(auctionId);
    if (!auction) return;

    auction.removeSocket(socket);
    // Nobody is watching, so nothing needs ticking. The lifecycle sweep still
    // starts and ends this auction from the database.
    if (auction.isEmpty) this.auctions.delete(auctionId);
  }

  private attachHandlers(user: User, auction: Auction) {
    user.socket.on('message', (raw) => {
      const parsed = parseIncomingMessage(raw.toString());
      if (!parsed.ok) {
        user.send({ type: ERROR, message: parsed.error });
        return;
      }

      if (parsed.message.type === BID) {
        void this.handleBid(parsed.message.amount, user, auction);
      }
    });
  }

  private async handleBid(amount: number, user: User, auction: Auction) {
    const result = await auction.placeBid(amount, user);

    if (!result.ok) {
      // The bidder used to get nothing back at all, or a misleading
      // "Auction not found" for every rejection.
      user.send({
        type: BID_REJECTED,
        reason: result.reason,
        message: bidRejectionMessage(result.reason, result.minimum),
        minimumBid: result.minimum,
      });
      return;
    }

    const minimumBid = minimumNextBid(auction.currentPrice, auction.startingPrice);
    user.send({ type: BID_ACCEPTED, bid: result.bid, minimumBid });
    auction.broadcastExcept(
      { type: BID_PLACED, bid: result.bid, minimumBid },
      user
    );
  }

  private async onTick() {
    for (const auction of this.auctions.values()) {
      const timeLeft = auction.timeLeft();
      auction.broadcast({ type: TIME_LEFT, timeLeft });

      // Watched auctions end on the second. Unwatched ones are caught by the
      // sweep within SWEEP_MS.
      if (timeLeft === 0 && auction.status !== AuctionStatus.ENDED) {
        void this.settle(auction.auctionId);
      }
    }
  }

  /**
   * Advances auction status straight from the database, so a lot starts and
   * ends on time whether or not anyone has it open. The previous implementation
   * ran only on connect and only over auctions already in memory, which meant
   * an auction nobody was watching never ended at all.
   */
  private async onSweep() {
    try {
      const now = new Date();

      const started = await db.auction.updateMany({
        where: {
          status: AuctionStatus.INACTIVE,
          startDate: { lte: now },
          endDate: { gt: now },
        },
        data: { status: AuctionStatus.ACTIVE },
      });
      if (started.count > 0) {
        for (const auction of this.auctions.values()) {
          if (
            auction.status === AuctionStatus.INACTIVE &&
            auction.startDate <= now
          ) {
            auction.status = AuctionStatus.ACTIVE;
          }
        }
      }

      const due = await db.auction.findMany({
        where: {
          status: { in: [AuctionStatus.INACTIVE, AuctionStatus.ACTIVE] },
          endDate: { lte: now },
        },
        select: { id: true },
      });
      for (const { id } of due) await this.settle(id);
    } catch (error) {
      console.error('[manager] lifecycle sweep failed:', error);
    }
  }

  /** Closes an auction: marks it ENDED, notifies the room, queues the emails. */
  private async settle(auctionId: string) {
    if (this.settling.has(auctionId)) return;
    this.settling.add(auctionId);

    try {
      const closed = await db.auction.updateMany({
        where: { id: auctionId, status: { not: AuctionStatus.ENDED } },
        data: { status: AuctionStatus.ENDED },
      });

      const live = this.auctions.get(auctionId);
      if (live) live.status = AuctionStatus.ENDED;

      // Another process (or an earlier tick) already settled this one; don't
      // send a second round of emails.
      if (closed.count === 0) return;

      const auction = await db.auction.findUnique({
        where: { id: auctionId },
        select: {
          title: true,
          user: { select: { email: true, userName: true } },
          bids: {
            orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }],
            take: 1,
            select: {
              amount: true,
              user: { select: { email: true, userName: true } },
            },
          },
        },
      });
      if (!auction) return;

      const winning = auction.bids[0] ?? null;

      live?.broadcast({
        type: AUCTION_ENDED,
        winner: winning
          ? { userName: winning.user.userName, amount: winning.amount }
          : null,
      });

      if (winning) {
        await enqueueEmail({
          type: 'winner',
          to: winning.user.email,
          username: winning.user.userName,
          auctionId,
          auctionTitle: auction.title,
          amount: winning.amount,
        });
      }

      await enqueueEmail({
        type: 'finishOwner',
        to: auction.user.email,
        username: auction.user.userName,
        auctionId,
        auctionTitle: auction.title,
        amount: winning?.amount ?? null,
        winner: winning?.user.userName ?? null,
      });
    } catch (error) {
      console.error('[manager] could not settle auction %s:', auctionId, error);
    } finally {
      this.settling.delete(auctionId);
    }
  }
}
