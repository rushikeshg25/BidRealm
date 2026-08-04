import MyAuctions from '@/components/pages/MyAuctions';
import { getAuth } from '@/lib/auth';
import prisma from '@repo/db';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My auctions' };

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
  };
}) {
  const { session, user } = await getAuth();
  if (!session) redirect('/sign-in?next=/my-auctions');

  const search = searchParams?.query || '';

  const auctions = await prisma.auction.findMany({
    where: {
      userId: user.id,
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    },
    include: { bids: true },
    orderBy: { createdAt: 'desc' },
  });

  // The `user` prop is gone: MyAuctions never read it.
  return <MyAuctions auctions={auctions} />;
}
