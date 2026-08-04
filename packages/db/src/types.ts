import { Bid, Auction, AuctionStatus, User, Prisma } from '@prisma/client';

export type BidT = Bid;
export type AuctionT = Auction;
export type AuctionStatusT = AuctionStatus;
export type UserT = User;

export type AuctionWithBidsT = Prisma.AuctionGetPayload<{
  include: {
    bids: true;
  };
}>;

// `AuctionWithBidsandUserT`, `AuctionWithUserT`, `UserwithAuctionT`,
// `UserwithBidsT`, `AuctionWithBidsWithUsersAndUserT` and `BidsWithUser` are
// gone. Each of them spelled `user: true`, which is `SELECT *` on User —
// hashedPassword included — and they were the types the leaking queries were
// written against. Use the explicit selects below instead.

/*
 * ---------------------------------------------------------------------------
 * Browser-safe selects.
 *
 * `include: { user: true }` pulls the whole User row, hashedPassword included.
 * The bid server broadcast exactly that object to every connected participant of
 * an auction, and the auction detail page shipped it in its RSC payload. Any
 * bidder could read every other bidder's password hash.
 *
 * These selects name the fields explicitly, so adding a column to User can never
 * silently widen what leaves the server.
 * ---------------------------------------------------------------------------
 */

/** The only User fields any client is allowed to see about another user. */
export const publicUserSelect = {
  id: true,
  userName: true,
} satisfies Prisma.UserSelect;

export type PublicUserT = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

/** A bid plus its bidder's public identity — what gets broadcast over the socket. */
export const publicBidSelect = {
  id: true,
  amount: true,
  createdAt: true,
  auctionId: true,
  userId: true,
  user: { select: publicUserSelect },
} satisfies Prisma.BidSelect;

export type PublicBidT = Prisma.BidGetPayload<{
  select: typeof publicBidSelect;
}>;

/** What the auction detail page needs: the auction, its seller, and its bids. */
export const auctionDetailInclude = {
  bids: {
    select: publicBidSelect,
    orderBy: { createdAt: "desc" },
  },
  user: { select: publicUserSelect },
} satisfies Prisma.AuctionInclude;

export type AuctionDetailT = Prisma.AuctionGetPayload<{
  include: typeof auctionDetailInclude;
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
