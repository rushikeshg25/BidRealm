import MyBids from '@/components/pages/MyBids';
import { getAuth } from '@/lib/auth';
import type { MyBid } from '@/types/lot';
import prisma from '@repo/db';
import type { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';

const ORDER: Record<string, Prisma.BidOrderByWithRelationInput> = {
  title: { auction: { title: 'asc' } },
  amount: { amount: 'desc' },
  // Sorted by the auction's creation date before, which is not when the bid
  // was placed.
  time: { createdAt: 'desc' },
};

export default async function Page({
  searchParams,
}: {
  searchParams?: { sortBy?: string };
}) {
  const { session, user } = await getAuth();
  if (!session) redirect('/sign-in');

  const bids = await prisma.bid.findMany({
    where: { userId: user.id },
    orderBy: ORDER[searchParams?.sortBy ?? 'time'] ?? ORDER.time,
    select: {
      id: true,
      amount: true,
      createdAt: true,
      auctionId: true,
      auction: {
        select: {
          title: true,
          status: true,
          currentPrice: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  // Serialised for the client component; `any` and a @ts-ignore stood here.
  const rows: MyBid[] = bids.map((bid) => ({
    ...bid,
    createdAt: bid.createdAt.toISOString(),
    auction: {
      ...bid.auction,
      startDate: bid.auction.startDate.toISOString(),
      endDate: bid.auction.endDate.toISOString(),
    },
  }));

  return <MyBids bids={rows} />;
}
