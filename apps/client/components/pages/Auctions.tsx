import Link from 'next/link';
import { PackageOpen, SearchX } from 'lucide-react';

import AuctionCardComponent from '../AuctionCardComponent';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import type { AuctionRowT } from '@/types/auction';

const GRID =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

/**
 * An empty result used to render an empty <section> -- the page simply went blank
 * with no indication whether the request had failed, the filters were too narrow,
 * or there was genuinely nothing listed.
 */
const EmptyState = ({ isFiltered }: { isFiltered: boolean }) => (
  <div className='flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center'>
    <div className='rounded-full bg-muted p-3 text-muted-foreground'>
      {isFiltered ? (
        <SearchX className='h-6 w-6' />
      ) : (
        <PackageOpen className='h-6 w-6' />
      )}
    </div>
    <div className='space-y-1'>
      <p className='font-medium'>
        {isFiltered ? 'No auctions match your filters' : 'No auctions yet'}
      </p>
      <p className='max-w-sm text-sm text-muted-foreground'>
        {isFiltered
          ? 'Try widening the price range or clearing a category.'
          : 'Nothing is up for auction right now. Be the first to list something.'}
      </p>
    </div>
    {isFiltered ? (
      <Button asChild variant='outline' size='sm' className='mt-1'>
        <Link href='/'>Clear all filters</Link>
      </Button>
    ) : (
      <Button asChild size='sm' className='mt-1'>
        <Link href='/new'>List an auction</Link>
      </Button>
    )}
  </div>
);

export const AuctionsSkeleton = ({ count = 8 }: { count?: number }) => (
  <section className={GRID} aria-busy='true' aria-label='Loading auctions'>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className='overflow-hidden rounded-lg border bg-card'>
        <Skeleton className='aspect-[4/3] rounded-none' />
        <div className='space-y-3 p-4'>
          <Skeleton className='h-5 w-20 rounded-full' />
          <Skeleton className='h-4 w-4/5' />
          <div className='flex items-end justify-between pt-1'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-4 w-16' />
          </div>
        </div>
      </div>
    ))}
  </section>
);

const Auctions = ({
  auctions,
  totalCount,
  isFiltered = false,
}: {
  // Was a fourth inline redefinition of the auction shape; the same object was
  // spelled out again in AuctionCard, AuctionCardComponent and types/auction.
  auctions: AuctionRowT[];
  totalCount?: number;
  isFiltered?: boolean;
}) => {
  if (auctions.length === 0) return <EmptyState isFiltered={isFiltered} />;

  return (
    <div className='space-y-4'>
      {typeof totalCount === 'number' ? (
        <p className='text-sm text-muted-foreground' aria-live='polite'>
          {totalCount} {totalCount === 1 ? 'auction' : 'auctions'}
          {isFiltered ? ' match your filters' : ''}
        </p>
      ) : null}

      <section className={GRID}>
        {auctions.map((auction) => (
          <AuctionCardComponent key={auction.id} auction={auction} />
        ))}
      </section>
    </div>
  );
};

export default Auctions;
