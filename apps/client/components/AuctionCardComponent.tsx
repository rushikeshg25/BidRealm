'use client';

import Image from 'next/image';
import Link from 'next/link';
import HammerClock from '@/components/HammerClock';
import { useCountdown } from '@/hooks/useCountdown';
import { LOT_STATE, lotState } from '@/lib/lot';
import { cn } from '@/lib/utils';
import { categoryLabel } from '@/types/categories';
import { formatMoneyShort } from '@/utils/format';
import type { AuctionListItem } from '@/actions/GetAuctions';

/**
 * A stable reference you could quote to someone, taken from the lot's id.
 * Not a sequence: the catalogue has no ordering to encode, and inventing one
 * from an array index would change as you page through.
 */
const lotRef = (id: string) => id.slice(-5).toUpperCase();

const AuctionCardComponent = ({ auction }: { auction: AuctionListItem }) => {
  const state = lotState(auction);
  const tokens = LOT_STATE[state];
  const remaining = useCountdown(auction.endDate, state === 'live');
  const bidCount = auction._count?.bids ?? 0;

  return (
    <Link
      href={`/auction/${auction.id}`}
      // The card used to be an inert div with a button inside it, so most of it
      // was not clickable and none of it was reachable by keyboard.
      className='group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/25'
    >
      {/* The rail makes the grid scannable by state without reading a word. */}
      <span
        aria-hidden='true'
        className={cn('absolute inset-y-0 left-0 w-[3px]', tokens.rail)}
      />

      <div className='relative aspect-[4/3] w-full overflow-hidden bg-muted'>
        {auction.image ? (
          <Image
            src={auction.image}
            alt={auction.title}
            fill
            sizes='(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw'
            className='object-cover transition-transform duration-500 group-hover:scale-[1.02]'
          />
        ) : (
          <div className='flex h-full items-center justify-center text-xs text-muted-foreground'>
            No photo
          </div>
        )}
      </div>

      <div className='flex flex-1 flex-col gap-3 p-4 pl-5'>
        <div className='flex items-center justify-between gap-2'>
          <span className='font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular'>
            Lot {lotRef(auction.id)}
          </span>
          <span className='truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
            {categoryLabel(auction.category)}
          </span>
        </div>

        <h3 className='line-clamp-2 font-display text-lg font-semibold leading-tight'>
          {auction.title}
        </h3>

        <div className='mt-auto flex items-end justify-between gap-3 pt-1'>
          <div>
            <div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
              {state === 'ended' ? 'Hammer' : bidCount > 0 ? 'Current' : 'Opening'}
            </div>
            <div className='font-mono text-xl font-semibold tabular'>
              {formatMoneyShort(auction.currentPrice)}
            </div>
          </div>

          <div className='text-right'>
            <HammerClock remaining={remaining} state={state} />
            <div className='text-[11px] text-muted-foreground'>
              {bidCount === 1 ? '1 bid' : `${bidCount} bids`}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AuctionCardComponent;
