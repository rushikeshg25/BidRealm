import { db, AuctionStatus } from "./db";
import { User } from "./utils/SocketManager";
import type { BidT } from "@repo/db/types";

export type bids = BidT;

export { AuctionStatus };

export class Auction {
  public auctionId: string;
  public users: User[];
  public currentPrice: number;
  public startDate: Date;
  public endDate: Date;
  public bids: bids[];
  public curentBidder: string;
  public status: AuctionStatus;

  constructor(
    auctionId: string,
    curentBidder: string,
    currentPrice: number,
    startDate: Date,
    endDate: Date,
    bids: bids[],
    status: AuctionStatus
  ) {
    this.auctionId = auctionId;
    this.users = [];
    this.currentPrice = currentPrice;
    this.startDate = startDate;
    this.endDate = endDate;
    this.bids = bids;
    this.curentBidder = curentBidder;
    this.status = status;
  }

  addUser(user: User) {
    this.users.push(user);
  }
  removeUser(userId: string) {
    this.users.filter((user) => user.userId !== userId);
  }

  async createBid(amount: number, user: User) {
    this.bids.push({
      amount,
      userId: user.userId,
      createdAt: new Date(),
      auctionId: this.auctionId,
    });

    const bid = await db.bid.create({
      data: {
        userId: user.userId,
        auctionId: user.auctionId,
        amount: amount,
      },
      include: {
        user: true,
      },
    });
    await db.auction.update({
      where: {
        id: user.auctionId,
      },
      data: {
        currentPrice: amount,
      },
    });
    this.broadcastBidAlert(
      JSON.stringify({
        type: "BID",
        bid: bid,
      })
    );
  }

  broadcastBidAlert(message: string) {
    if (this.users.length === 0) return;
    this.users.forEach((user) => {
      user.socket.send(message);
    });
  }

  broadcastToAuctionAllParticipants(message: string) {
    if (this.users.length === 0) return;
    this.users.forEach((user) => {
      user.socket.send(message);
    });
  }

  broadcastToAllAuctionParticipantsExcepetUser(message: string, curUser: User) {
    if (this.users.length === 0) return;
    this.users.forEach((user) => {
      if (user.userId !== curUser.userId) {
        user.socket.send(message);
      }
    });
  }
  public async setStatus(status: AuctionStatus) {
    // Previously an if/else chain that handled ENDED, ACTIVE and INACTIVE with
    // three identical update calls and silently dropped CANCELLED, leaving that
    // transition in memory only.
    await db.auction.update({
      where: { id: this.auctionId },
      data: { status },
    });
    this.status = status;
  }
  public calculateTimeLeft(): number {
    const now = new Date();
    let timeLeft = Math.max(
      0,
      new Date(this.endDate).getTime() - now.getTime()
    );
    if (timeLeft <= 0) {
      this.status = AuctionStatus.ENDED;
    }
    return timeLeft;
  }
}
