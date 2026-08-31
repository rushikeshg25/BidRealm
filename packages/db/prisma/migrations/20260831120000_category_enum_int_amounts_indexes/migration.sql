-- Auction.categories was a free-text column, so the same concept was written three
-- different ways: the seed wrote 'VECHILES', the create form wrote Title case
-- ('Vehicles'), and types/categories.ts declared upper case. Category filtering
-- could never match. Normalise the existing rows, then promote the column to an enum.

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ART', 'COLLECTABLES', 'ELECTRONICS', 'VEHICLES', 'WATCHES', 'FASHION', 'SHOES', 'MISCELLANEOUS');

-- Backfill: case-fold, then repair the known misspellings.
UPDATE "Auction" SET "categories" = UPPER(TRIM("categories"));
UPDATE "Auction" SET "categories" = 'VEHICLES'     WHERE "categories" IN ('VECHILES', 'VECHICLES', 'VEHICLE');
UPDATE "Auction" SET "categories" = 'COLLECTABLES' WHERE "categories" IN ('COLLECTIBLES', 'COLLECTABLE', 'COLLECTIBLE');
UPDATE "Auction" SET "categories" = 'ELECTRONICS'  WHERE "categories" = 'ELECTRONIC';
UPDATE "Auction" SET "categories" = 'WATCHES'      WHERE "categories" = 'WATCH';
UPDATE "Auction" SET "categories" = 'SHOES'        WHERE "categories" = 'SHOE';

-- Anything still unrecognised lands in the fallback bucket rather than blocking the cast.
UPDATE "Auction" SET "categories" = 'MISCELLANEOUS'
WHERE "categories" IS NULL
   OR "categories" NOT IN ('ART', 'COLLECTABLES', 'ELECTRONICS', 'VEHICLES', 'WATCHES', 'FASHION', 'SHOES', 'MISCELLANEOUS');

-- AlterTable
ALTER TABLE "Auction" RENAME COLUMN "categories" TO "category";
ALTER TABLE "Auction" ALTER COLUMN "category" TYPE "Category" USING "category"::"Category";

-- Money is counted, not measured: Bid.amount was Float while Auction prices were Int.
-- AlterTable
ALTER TABLE "Bid" ALTER COLUMN "amount" SET DATA TYPE INTEGER USING ROUND("amount")::INTEGER;

-- CreateIndex
CREATE INDEX "Auction_status_endDate_idx" ON "Auction"("status", "endDate");
CREATE INDEX "Auction_status_startDate_idx" ON "Auction"("status", "startDate");
CREATE INDEX "Auction_category_idx" ON "Auction"("category");
CREATE INDEX "Auction_createdAt_idx" ON "Auction"("createdAt");
CREATE INDEX "Bid_auctionId_createdAt_idx" ON "Bid"("auctionId", "createdAt");
CREATE INDEX "Bid_userId_idx" ON "Bid"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
