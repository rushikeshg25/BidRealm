import Link from 'next/link';
import { notFound } from 'next/navigation';
import Auction from '@/components/pages/Auction';
import { getAuth } from '@/lib/auth';
import type { Lot } from '@/types/lot';
import prisma from '@repo/db';

export default async function Page({ params }: { params: { id: string } }) {
  const { user } = await getAuth();

  // Explicit selects: `include: { user: true }` shipped every column of the
  // User row, hashed password and all, to the browser.
  const auction = await prisma.auction.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      image: true,
      category: true,
      status: true,
      startingPrice: true,
      currentPrice: true,
      startDate: true,
      endDate: true,
      userId: true,
      user: { select: { id: true, userName: true } },
      bids: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          userId: true,
          auctionId: true,
          user: { select: { id: true, userName: true } },
        },
      },
    },
  });

  if (!auction) notFound();

  const lot: Lot = {
    ...auction,
    startDate: auction.startDate.toISOString(),
    endDate: auction.endDate.toISOString(),
    bids: auction.bids.map((bid) => ({
      ...bid,
      createdAt: bid.createdAt.toISOString(),
    })),
  };

  return <Auction viewerId={user?.id ?? null} lot={lot} />;
}
