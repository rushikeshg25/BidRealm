// One Prisma client for the process. This used to construct a second
// PrismaClient alongside the one in @repo/db, on a different @prisma/client
// version, so the server ran two query engines against the same database.
export { default as db } from '@repo/db';
export { AuctionStatus, Category } from '@repo/db/types';
