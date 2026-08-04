'use server';

import prisma from '@repo/db';
import type { Prisma } from '@prisma/client';
import { AuctionStatus } from '@repo/db/types';
import { isCategory } from '@/types/categories';

/** A caller could previously pass `limit: 1e9` and read the whole table. */
const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;

export type AuctionSort = 'newest' | 'ending-soon' | 'price-asc' | 'price-desc';

const ORDER_BY: Record<AuctionSort, Prisma.AuctionOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  'ending-soon': { endDate: 'asc' },
  'price-asc': { currentPrice: 'asc' },
  'price-desc': { currentPrice: 'desc' },
};

const isSort = (value: unknown): value is AuctionSort =>
  typeof value === 'string' && value in ORDER_BY;

/** Drops anything that is not a real AuctionStatus, so a hand-edited URL cannot 500. */
const parseStatuses = (values: string[] | undefined): AuctionStatus[] =>
  (values ?? []).filter((value): value is AuctionStatus =>
    Object.values(AuctionStatus).includes(value as AuctionStatus)
  );

const parsePrice = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
};

export const getAuctions = async ({
  search,
  offset = 0,
  limit = DEFAULT_LIMIT,
  min,
  max,
  status,
  categories,
  sort,
}: {
  search?: string;
  offset?: number;
  limit?: number;
  min?: string;
  max?: string;
  status?: string[];
  categories?: string[];
  sort?: string;
}) => {
  const take = Math.min(Math.max(1, Math.trunc(limit)), MAX_LIMIT);
  const skip = Math.max(0, Math.trunc(offset));

  const statuses = parseStatuses(status);
  const validCategories = (categories ?? []).filter(isCategory);
  const minPrice = parsePrice(min);
  const maxPrice = parsePrice(max);

  const conditions: Prisma.AuctionWhereInput[] = [];

  if (search) {
    conditions.push({ title: { contains: search, mode: 'insensitive' } });
  }

  if (statuses.length > 0) {
    conditions.push({ status: { in: statuses } });
  }

  if (validCategories.length > 0) {
    conditions.push({ categories: { in: validCategories } });
  }

  // Filter on currentPrice: that is the number the card displays, so a price
  // range that excluded the visible figure would look broken.
  if (minPrice !== undefined) {
    conditions.push({ currentPrice: { gte: minPrice } });
  }
  if (maxPrice !== undefined) {
    conditions.push({ currentPrice: { lte: maxPrice } });
  }

  // One `where`, shared by findMany and count. They used to be written out
  // separately and the count's title filter was missing `mode: 'insensitive'`, so
  // on a mixed-case search totalPages disagreed with the results and pagination
  // offered pages that rendered empty.
  const where: Prisma.AuctionWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

  const [auctions, totalCount] = await Promise.all([
    prisma.auction.findMany({
      where,
      orderBy: ORDER_BY[isSort(sort) ? sort : 'newest'],
      skip,
      take,
    }),
    prisma.auction.count({ where }),
  ]);

  return { auctions, totalCount, totalPages: Math.ceil(totalCount / take) };
};
