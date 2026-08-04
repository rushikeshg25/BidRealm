'use server';

import prisma from '@repo/db';
import type { Prisma } from '@prisma/client';

/** A caller could previously pass `limit: 1e9` and read the whole table. */
const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;

export const getAuctions = async ({
  search,
  offset = 0,
  limit = DEFAULT_LIMIT,
}: {
  search?: string | undefined;
  offset?: number;
  limit?: number;
}) => {
  const take = Math.min(Math.max(1, Math.trunc(limit)), MAX_LIMIT);
  const skip = Math.max(0, Math.trunc(offset));

  // Built once and shared by findMany and count. The two were written out
  // separately before, and the count's title filter was missing
  // `mode: 'insensitive'` -- so on any mixed-case search the page count
  // disagreed with the results and pagination offered pages that rendered empty.
  //
  // The min/max/status/categories parameters this action used to declare are
  // gone for now: they were accepted and then ignored (the only trace was a
  // commented-out `// categories: "vehicles"`). They come back, wired up for
  // real, along with the Filters rewrite.
  const where: Prisma.AuctionWhereInput = search
    ? { title: { contains: search, mode: 'insensitive' } }
    : {};

  const [auctions, totalCount] = await Promise.all([
    prisma.auction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auction.count({ where }),
  ]);

  return { auctions, totalCount, totalPages: Math.ceil(totalCount / take) };
};
