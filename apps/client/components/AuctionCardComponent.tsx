'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { PhaseBadge } from '@/components/PhaseBadge';
import { Badge } from '@/components/ui/badge';
import { useAuctionPhase } from '@/hooks/useAuctionPhase';
import { useCountdown } from '@/hooks/useCountdown';
import { displayPrice } from '@/lib/auction';
import { cn } from '@/lib/utils';
import { formatMoney, formatTime } from '@/utils/format';
import type { AuctionRowT } from '@/types/auction';

const PLACEHOLDER = '/placeholder.png';

/**
 * Time remaining on a card. A card in a grid does not warrant a websocket -- a
 * local interval off the deadline is enough, and it is the same hook the detail
 * page's timer falls back to.
 */
const CardCountdown = ({ target }: { target: Date | string }) => (
  <span className='tabular'>{formatTime(useCountdown(target))}</span>
);

/**
 * A listing card.
 *
 * The previous version: a raw <img> (no lazy loading, no fallback, despite
 * utfs.io being whitelisted in next.config); `border--foreground` twice, a
 * double-dash typo that resolved to nothing; `bg-background` rather than bg-card,
 * so it had zero contrast against the page; a `group` class with no `group-hover:`
 * anywhere, so the intended hover treatment was never implemented; only a small
 * button was clickable rather than the card; the phase chain evaluated three
 * separate times inline; no status badge and no countdown at all; and
 * `dark:bg-card-foreground` on the button, which is a *text* colour.
 */
const AuctionCardComponent = ({ auction }: { auction: AuctionRowT }) => {
  const phase = useAuctionPhase(auction);
  const [imageFailed, setImageFailed] = useState(false);

  const price = displayPrice(auction, phase);
  const src = !auction.image || imageFailed ? PLACEHOLDER : auction.image;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg',
        // The ring lands on the card when the inner link is focused, so keyboard
        // users see the same affordance as a hover.
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
      )}
    >
      <div className='relative aspect-[4/3] overflow-hidden bg-muted'>
        <Image
          src={src}
          alt={auction.title}
          fill
          // Matches the grid: 4 across at xl, 3 at lg, 2 at md, 1 below.
          sizes='(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'
          className='object-cover transition-transform duration-300 group-hover:scale-[1.04]'
          onError={() => setImageFailed(true)}
        />

        <div className='absolute left-3 top-3'>
          <PhaseBadge phase={phase} />
        </div>

        {phase !== 'ended' ? (
          <div
            className={cn(
              'absolute bottom-3 right-3 rounded-md px-2 py-1',
              'bg-background/85 text-xs font-medium backdrop-blur-sm'
            )}
          >
            <span className='text-muted-foreground'>
              {phase === 'live' ? 'Ends in ' : 'Opens in '}
            </span>
            <CardCountdown
              target={phase === 'live' ? auction.endDate : auction.startDate}
            />
          </div>
        ) : null}
      </div>

      <div className='flex flex-1 flex-col gap-3 p-4'>
        {/* Was a hand-rolled <span> mimicking a pill while Badge sat unused. */}
        <Badge variant='secondary' className='w-fit font-medium'>
          {auction.categories}
        </Badge>

        <h3 className='line-clamp-2 font-semibold leading-snug'>
          {/*
            The whole card is the link now. Previously only a small "Place Bid"
            button navigated, so the image, title and price were all dead space.
            The inset overlay keeps the accessible name on the title.
          */}
          <Link href={`/auction/${auction.id}`} className='outline-none'>
            <span className='absolute inset-0 z-10' aria-hidden='true' />
            {auction.title}
          </Link>
        </h3>

        <div className='mt-auto flex items-end justify-between gap-2'>
          <div>
            <p className='text-xs text-muted-foreground'>
              {phase === 'upcoming'
                ? 'Starting price'
                : phase === 'live'
                  ? 'Current bid'
                  : 'Sold for'}
            </p>
            <p className='tabular text-lg font-semibold'>₹{formatMoney(price)}</p>
          </div>

          <span
            className={cn(
              'text-sm font-medium transition-colors',
              phase === 'live'
                ? 'text-primary group-hover:underline'
                : 'text-muted-foreground'
            )}
          >
            {/* Was "View(Yet to Start)" / "View(Sold Out)" -- no space, and both
                overflowed at small widths. */}
            {phase === 'live' ? 'Place bid' : 'View details'}
          </span>
        </div>
      </div>
    </article>
  );
};

export default AuctionCardComponent;
