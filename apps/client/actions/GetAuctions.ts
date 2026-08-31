'use server';

import prisma from '@repo/db';
import { AuctionStatus, Category, type AuctionStatusT, type CategoryT } from '@repo/db/types';
import type { Prisma } from '@prisma/client';

/** Upper bound on page size: `?limit=100000` used to be a free full-table scan. */
const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;

export type AuctionListItem = Prisma.AuctionGetPayload<{
  include: { _count: { select: { bids: true } } };
}>;

export const getAuctions = async ({
  search,
  offset = 0,
  limit = DEFAULT_LIMIT,
  min,
  max,
  statuses,
  categories,
}: {
  search?: string;
  offset?: number;
  limit?: number;
  min?: number;
  max?: number;
  statuses?: AuctionStatusT[];
  categories?: CategoryT[];
}): Promise<{
  auctions: AuctionListItem[];
  totalCount: number;
  totalPages: number;
}> => {
  const take = Math.min(Math.max(Math.trunc(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = Math.max(Math.trunc(offset) || 0, 0);

  // The sidebar parsed price, status and category and then dropped them: the
  // category clause was commented out and the other two were never written, so
  // every filter in the UI was decorative.
  const where: Prisma.AuctionWhereInput = {
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    ...(categories?.length ? { category: { in: categories } } : {}),
    ...(statuses?.length ? { status: { in: statuses } } : {}),
    ...(min !== undefined || max !== undefined
      ? {
          currentPrice: {
            ...(min !== undefined ? { gte: min } : {}),
            ...(max !== undefined ? { lte: max } : {}),
          },
        }
      : {}),
  };

  // One `where` for both queries. The count used to omit the case-insensitive
  // flag the list had, so the page count disagreed with the results.
  const [auctions, totalCount] = await prisma.$transaction([
    prisma.auction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { _count: { select: { bids: true } } },
    }),
    prisma.auction.count({ where }),
  ]);

  return { auctions, totalCount, totalPages: Math.ceil(totalCount / take) };
};

export { AuctionStatus, Category };
