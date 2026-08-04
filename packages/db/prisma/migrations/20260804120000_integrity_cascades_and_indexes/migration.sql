-- Bid.amount was Float while Auction.currentPrice/startingPrice are Int. The bid
-- server writes `currentPrice: amount`, so a fractional bid produced a Prisma
-- validation error inside an unawaited promise -> unhandled rejection -> crash.
-- Round any existing fractional amounts before narrowing the column.
UPDATE "Bid" SET "amount" = ROUND("amount");
ALTER TABLE "Bid" ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- Every insert previously had to spell out a status.
ALTER TABLE "Auction" ALTER COLUMN "status" SET DEFAULT 'INACTIVE';

-- Cascade deletes. Without these, deleting an auction required a manual
-- bid.deleteMany() first, and deleting a User with auctions/bids failed outright.
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_auctionId_fkey";
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey"
  FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bid" DROP CONSTRAINT "Bid_userId_fkey";
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Auction" DROP CONSTRAINT "Auction_userId_fkey";
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- There were no indexes at all beyond the primary keys, so the auction detail
-- page, the listing filters and every "my auctions"/"my bids" query were
-- sequential scans.
CREATE INDEX "Auction_userId_idx" ON "Auction"("userId");
CREATE INDEX "Auction_status_idx" ON "Auction"("status");
CREATE INDEX "Auction_endDate_idx" ON "Auction"("endDate");
CREATE INDEX "Auction_categories_idx" ON "Auction"("categories");

CREATE INDEX "Bid_auctionId_amount_idx" ON "Bid"("auctionId", "amount");
CREATE INDEX "Bid_auctionId_createdAt_idx" ON "Bid"("auctionId", "createdAt");
CREATE INDEX "Bid_userId_idx" ON "Bid"("userId");

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
