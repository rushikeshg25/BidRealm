import { Auction, AuctionStatus, bids } from "./Auction";
import { User } from "./utils/SocketManager";
import { db } from "./db";
import { WebSocket } from "ws";
import { BID } from "./utils/messages";

export class AuctionManager {
  public auctions: Map<string, Auction>;

  constructor() {
    this.auctions = new Map<string, Auction>();
  }

  public async addUsertoAuction(user: User) {
    user.socket.send(
      JSON.stringify({ type: "JOINED", data: "Auction Joined" })
    );
    if (!this.auctions.get(user.auctionId)) {
      const auction = await db.auction.findUnique({
        where: { id: user.auctionId },
        include: { bids: { orderBy: { createdAt: "desc" } } },
      });
      const auctionInstance = new Auction(
        user.auctionId,
        auction?.bids[0]?.userId as string,
        auction?.currentPrice as number,
        auction?.startDate as Date,
        auction?.endDate as Date,
        auction?.bids as bids[],
        auction?.status as AuctionStatus
      );
      this.auctions.set(user.auctionId, auctionInstance);
    }

    const auction = this.auctions.get(user.auctionId);
    auction?.addUser(user);

    const timeLeft = auction?.calculateTimeLeft();
    user.socket.send(JSON.stringify({ type: "TIME_LEFT", timeLeft }));

    this.addHandler(user);
  }

  public isAuctionWsActive(AuctionId: string): boolean {
    return this.auctions.has(AuctionId);
  }

  removeHandler(ws: WebSocket, userId: string, auctionId: string) {
    if (this.auctions.get(auctionId)) {
      this.auctions.get(auctionId)?.removeUser(userId);
    }
  }

  public updateAuctionStatuses() {
    this.auctions.forEach((auction) => {
      const now = new Date();

      if (now > auction.endDate && auction.status !== AuctionStatus.ENDED) {
        auction.setStatus(AuctionStatus.ENDED);
      } else if (
        now > auction.startDate &&
        auction.status !== AuctionStatus.ACTIVE
      ) {
        auction.setStatus(AuctionStatus.ACTIVE);
      }
    });
  }

  private addHandler(user: User) {
    user.socket.on("message", (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === BID) {
        const auction = this.auctions.get(user.auctionId);
        if (auction && auction.status === AuctionStatus.ACTIVE) {
          auction.createBid(message.amount, user);
        } else {
          user.socket.send(
            JSON.stringify({ type: "ERROR", message: "Auction not found" })
          );
        }
      }
    });

    setInterval(() => {
      const auction = this.auctions.get(user.auctionId);
      if (auction) {
        const timeLeft = auction.calculateTimeLeft();
        auction.broadcastBidAlert(
          JSON.stringify({ type: "TIME_LEFT", timeLeft })
        );
      }
    }, 1000);
  }
}
