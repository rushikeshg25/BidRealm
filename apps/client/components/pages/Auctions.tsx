import Link from 'next/link';
import AuctionCardComponent from '@/components/AuctionCardComponent';
import type { AuctionListItem } from '@/actions/GetAuctions';

const Auctions = ({
  auctions,
  filtered,
}: {
  auctions: AuctionListItem[];
  filtered: boolean;
}) => {
  // The grid used to render an empty <section> when nothing matched, which
  // reads as a broken page rather than an answer.
  if (auctions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-6 py-20 text-center'>
        <p className='font-display text-lg font-semibold'>
          {filtered ? 'No lots match these filters' : 'No lots in the saleroom yet'}
        </p>
        <p className='max-w-sm text-sm text-muted-foreground'>
          {filtered
            ? 'Widen the price range or clear a category to see more.'
            : 'The catalogue is empty. List the first lot and open the bidding.'}
        </p>
        {!filtered && (
          <Link
            href='/new'
            className='mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground'
          >
            List a lot
          </Link>
        )}
      </div>
    );
  }

  return (
    <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
      {auctions.map((auction) => (
        <AuctionCardComponent key={auction.id} auction={auction} />
      ))}
    </section>
  );
};

export default Auctions;
