import { Bid, Auction, AuctionStatus, User, Prisma } from '@prisma/client';

export type BidT = Bid;
export type AuctionT = Auction;
export type AuctionStatusT = AuctionStatus;
export type UserT = User;

export type AuctionWithBidsandUserT = Prisma.AuctionGetPayload<{
  include: {
    bids: true;
    user: true;
  };
}>;

export type AuctionWithBidsT = Prisma.AuctionGetPayload<{
  include: {
    bids: true;
  };
}>;

export type AuctionWithUserT = Prisma.AuctionGetPayload<{
  include: {
    user: true;
  };
}>;

export type UserwithAuctionT = Prisma.UserGetPayload<{
  include: {
    auctions: true;
  };
}>;

export type UserwithBidsT = Prisma.UserGetPayload<{
  include: {
    bids: true;
  };
}>;

export type AuctionWithBidsWithUsersAndUserT = Prisma.AuctionGetPayload<{
  include: {
    bids: {
      include: {
        user: true;
      };
    };
    user: true;
  };
}>;

export type BidsWithUser = Prisma.BidGetPayload<{
  include: {
    user: true;
  };
}>;

/**
 * The single source of truth for auction status across all apps.
 *
 * There used to be three separate hand-rolled enums for this — a numeric one in
 * the bid server, a differently-ordered numeric one in the client, and this
 * Prisma re-export. Because Postgres stores the *strings*, comparisons like
 * `auction.status === AuctionStatus.ACTIVE` were really `"ACTIVE" === 1` and so
 * were always false, which is why live auctions rejected bids with
 * "Auction not found".
 */
export { AuctionStatus };
