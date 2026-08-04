import Auction from '@/components/pages/Auction';
import { getAuth } from '@/lib/auth';
import prisma from '@repo/db';
import { auctionDetailInclude } from '@repo/db/types';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const generateMetadata = async ({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> => {
  const auction = await prisma.auction.findUnique({
    where: { id: params.id },
    select: { title: true, description: true },
  });

  if (!auction) return { title: 'Auction not found' };

  return {
    title: auction.title,
    description: auction.description.slice(0, 160),
  };
};

// Was `const page = ...` with a lowercase name and the default export at the
// bottom, unlike every other page in the app.
export default async function Page({ params }: { params: { id: string } }) {
  const { user } = await getAuth();

  // `include: { bids: { include: { user: true } }, user: true }` serialised every
  // bidder's and the seller's full User row -- hashedPassword included -- into the
  // RSC payload sent to the browser. auctionDetailInclude names the visible fields.
  const auction = await prisma.auction.findUnique({
    where: { id: params.id },
    include: auctionDetailInclude,
  });

  // Was a hand-rolled centred div with no height or padding, so it hugged the
  // navbar. notFound() renders app/not-found.tsx and returns a real 404 status.
  if (!auction) notFound();

  return <Auction user={user} auction={auction} />;
}
