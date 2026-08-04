import prisma from "@repo/db";
import { AuctionStatus } from "@repo/db/types";

/**
 * The bid server used to construct its own `new PrismaClient()` against a
 * byte-identical copy of the schema kept at `apps/server/prisma/`. That copy had
 * no migrations directory, so it could generate a client but never migrate, and
 * was guaranteed to drift from the canonical schema. Both are gone; this app now
 * shares the single `@repo/db` client and schema.
 */
export const db = prisma;

export { AuctionStatus };
