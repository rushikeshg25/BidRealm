import MyBids from '@/components/pages/MyBids';
import { getAuth } from '@/lib/auth';
import prisma from '@repo/db';
import type { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My bids' };

/** Exported so the component can derive its prop type instead of hand-rolling it. */
export const myBidsSelect = {
  id: true,
  amount: true,
  createdAt: true,
  auctionId: true,
  auction: {
    select: {
      title: true,
      image: true,
      currentPrice: true,
      startingPrice: true,
      startDate: true,
      endDate: true,
    },
  },
} satisfies Prisma.BidSelect;

export type MyBidRow = Prisma.BidGetPayload<{ select: typeof myBidsSelect }>;

const ORDER_BY: Record<string, Prisma.BidOrderByWithRelationInput> = {
  title: { auction: { title: 'asc' } },
  amount: { amount: 'desc' },
  time: { createdAt: 'desc' },
};

export default async function Page({
  searchParams,
}: {
  searchParams?: { sortBy?: string };
}) {
  const { session, user } = await getAuth();
  if (!session) redirect('/sign-in?next=/my-bids');

  const sortBy = searchParams?.sortBy ?? 'time';

  // Was two near-identical findMany calls in an if/else, differing only in
  // orderBy, assigned to `let bids: any` and then passed through a //@ts-ignore.
  const bids = await prisma.bid.findMany({
    where: { userId: user.id },
    orderBy: ORDER_BY[sortBy] ?? ORDER_BY.time,
    select: myBidsSelect,
  });

  return <MyBids bids={bids} sortBy={sortBy} />;
}
