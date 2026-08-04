import Auction from '@/components/pages/Auction';
import { getAuth } from '@/lib/auth';
import prisma from '@repo/db';
import { auctionDetailInclude } from '@repo/db/types';
import Link from 'next/link';

const page = async ({ params }: { params: { id: string } }) => {
  const { user } = await getAuth();
  // `include: { bids: { include: { user: true } }, user: true }` serialised every
  // bidder's and the seller's full User row — hashedPassword included — into the
  // RSC payload sent to the browser. `auctionDetailInclude` names the visible
  // fields explicitly instead.
  const auction = await prisma.auction.findUnique({
    where: { id: params.id },
    include: auctionDetailInclude,
  });

  if (!auction)
    return (
      <div className='flex flex-col items-center justify-center text-lg'>
        Auction not found!{' '}
        <div>
          Return to{' '}
          <Link href={'/'} className='underline underline-offset-2'>
            Home Page{' '}
          </Link>
        </div>
      </div>
    );

  return <Auction user={user} auction={auction} />;
};

export default page;
