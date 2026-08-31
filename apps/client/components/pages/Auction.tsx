'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import BidDialog from '@/components/BidDialog';
import HammerClock from '@/components/HammerClock';
import PriceTicker from '@/components/PriceTicker';
import { Button } from '@/components/ui/button';
import { useCountdown } from '@/hooks/useCountdown';
import {
  useAuctionSocket,
  type ServerMessage,
} from '@/hooks/useAuctionSocket';
import { LOT_STATE, lotState } from '@/lib/lot';
import { cn } from '@/lib/utils';
import { categoryLabel } from '@/types/categories';
import type { Lot } from '@/types/lot';
import { formatMoney } from '@/utils/format';
import { bidStore } from '@/zustand/bidStore';
import { minimumNextBid } from '@repo/db/auction-rules';

const Auction = ({ viewerId, lot }: { viewerId: string | null; lot: Lot }) => {
  const { reset, addBid, bids, currentAmount, minimumBid, arrived, setMinimumBid } =
    bidStore();
  const [ended, setEnded] = useState(false);
  const [canBid, setCanBid] = useState(false);
  /**
   * Difference between the server's countdown and this browser's, measured on
   * every TIME_LEFT. The clock then ticks locally -- smooth, and immune to
   * network jitter -- while staying correct on a machine whose clock is off.
   */
  const [clockSkew, setClockSkew] = useState(0);

  useEffect(() => {
    reset({
      currentAmount: lot.currentPrice,
      minimumBid: minimumNextBid(lot.currentPrice, lot.startingPrice),
      bids: lot.bids,
    });
  }, [lot.id, lot.currentPrice, lot.startingPrice, lot.bids, reset]);

  const onMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'JOINED':
          setCanBid(message.canBid);
          setMinimumBid(message.minimumBid);
          setClockSkew(message.timeLeft - Math.max(0, new Date(lot.endDate).getTime() - Date.now()));
          break;

        case 'TIME_LEFT':
          setClockSkew(
            message.timeLeft - Math.max(0, new Date(lot.endDate).getTime() - Date.now())
          );
          break;

        case 'BID':
          addBid(message.bid, message.minimumBid);
          toast(`${message.bid.user.userName} bid ${formatMoney(message.bid.amount)}`, {
            icon: '🔨',
          });
          break;

        case 'BID_ACCEPTED':
          addBid(message.bid, message.minimumBid);
          toast.success('Your bid is in. You hold the lot.');
          break;

        // Every rejection used to come back as "Auction not found", when it
        // came back at all.
        case 'BID_REJECTED':
          toast.error(message.message);
          break;

        case 'AUCTION_ENDED':
          setEnded(true);
          toast(
            message.winner
              ? `Sold to ${message.winner.userName} for ${formatMoney(message.winner.amount)}`
              : 'Closed with no bids.',
            { icon: '🔔' }
          );
          break;

        case 'ERROR':
          toast.error(message.message);
          break;
      }
    },
    [addBid, setMinimumBid, lot.endDate]
  );

  const { connection, send } = useAuctionSocket({ auctionId: lot.id, onMessage });

  const baseState = lotState(lot);
  const state = ended ? 'ended' : baseState;
  const tokens = LOT_STATE[state];

  const localRemaining = useCountdown(lot.endDate, state === 'live');
  const remaining = useMemo(
    () => (localRemaining === null ? null : Math.max(0, localRemaining + clockSkew)),
    [localRemaining, clockSkew]
  );

  const isSeller = viewerId === lot.userId;
  const topBid = bids[0];
  const holdsTopBid = Boolean(viewerId && topBid?.userId === viewerId);

  return (
    <div className='mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:py-12'>
      {/* The lot itself */}
      <div className='flex flex-col gap-6'>
        <div className='relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-card'>
          {lot.image ? (
            <Image
              src={lot.image}
              alt={lot.title}
              fill
              sizes='(max-width: 1024px) 100vw, 60vw'
              className='object-cover'
              priority
            />
          ) : (
            <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
              No photo
            </div>
          )}
        </div>

        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
            <span className='tabular'>Lot {lot.id.slice(-5).toUpperCase()}</span>
            <span aria-hidden='true'>·</span>
            <span>{categoryLabel(lot.category)}</span>
            <span aria-hidden='true'>·</span>
            <span className={cn('inline-flex items-center gap-1.5', tokens.text)}>
              <span className={cn('size-1.5 rounded-full', tokens.dot)} />
              {tokens.label}
            </span>
          </div>

          <h1 className='font-display text-3xl font-semibold leading-tight md:text-4xl'>
            {lot.title}
          </h1>

          <p className='text-sm text-muted-foreground'>
            Listed by <span className='font-medium text-foreground'>{lot.user.userName}</span>
          </p>

          <p className='whitespace-pre-line text-sm leading-relaxed text-muted-foreground'>
            {lot.description}
          </p>
        </div>
      </div>

      {/* The instrument panel */}
      <div className='flex flex-col gap-4'>
        <section className='rounded-lg border border-border bg-card p-5'>
          <div className='flex items-baseline justify-between'>
            <span className='text-[11px] uppercase tracking-[0.14em] text-muted-foreground'>
              {state === 'ended' ? 'Hammer price' : 'Current bid'}
            </span>
            <ConnectionDot state={connection} live={state === 'live'} />
          </div>

          <div className='mt-1'>
            <PriceTicker amount={currentAmount} className='text-4xl md:text-[2.75rem]' />
          </div>

          <div className='mt-1 text-xs text-muted-foreground'>
            Opened at{' '}
            <span className='font-mono tabular'>{formatMoney(lot.startingPrice)}</span>
            {bids.length > 0 && (
              <>
                {' · '}
                {bids.length === 1 ? '1 bid' : `${bids.length} bids`}
              </>
            )}
          </div>

          <div className='mt-5 border-t border-border pt-4'>
            <div className='text-[11px] uppercase tracking-[0.14em] text-muted-foreground'>
              {state === 'live' ? 'Closes in' : state === 'upcoming' ? 'Opens' : 'Closed'}
            </div>
            <div className='mt-1'>
              {state === 'upcoming' ? (
                <span className='font-mono text-xl tabular'>
                  {new Date(lot.startDate).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              ) : (
                <HammerClock remaining={remaining} state={state} size='lg' />
              )}
            </div>
          </div>

          <div className='mt-5'>
            <BidAction
              state={state}
              viewerId={viewerId}
              isSeller={isSeller}
              holdsTopBid={holdsTopBid}
              canBid={canBid}
              connection={connection}
              minimumBid={minimumBid}
              onBid={(amount) => send({ type: 'bid', amount })}
            />
          </div>
        </section>

        <Ledger bids={bids} arrived={arrived} viewerId={viewerId} />
      </div>
    </div>
  );
};

/** Whether the price on screen is still being kept up to date. */
const ConnectionDot = ({
  state,
  live,
}: {
  state: 'connecting' | 'open' | 'closed';
  live: boolean;
}) => {
  if (!live) return null;

  const copy =
    state === 'open' ? 'Live' : state === 'connecting' ? 'Connecting' : 'Reconnecting';

  return (
    <span className='inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground'>
      <span
        className={cn(
          'size-1.5 rounded-full',
          state === 'open' ? 'bg-live' : 'bg-muted-foreground/50'
        )}
      />
      {copy}
    </span>
  );
};

const BidAction = ({
  state,
  viewerId,
  isSeller,
  holdsTopBid,
  canBid,
  connection,
  minimumBid,
  onBid,
}: {
  state: 'upcoming' | 'live' | 'ended';
  viewerId: string | null;
  isSeller: boolean;
  holdsTopBid: boolean;
  canBid: boolean;
  connection: 'connecting' | 'open' | 'closed';
  minimumBid: number;
  onBid: (amount: number) => boolean;
}) => {
  if (state === 'ended') {
    return (
      <p className='rounded-md bg-muted px-4 py-3 text-center text-sm text-muted-foreground'>
        Bidding closed.
      </p>
    );
  }

  if (state === 'upcoming') {
    return (
      <p className='rounded-md bg-muted px-4 py-3 text-center text-sm text-muted-foreground'>
        Bidding opens at the time above.
      </p>
    );
  }

  if (!viewerId) {
    return (
      <Button asChild className='w-full'>
        <Link href='/sign-in'>Sign in to bid</Link>
      </Button>
    );
  }

  if (isSeller) {
    return (
      <p className='rounded-md bg-muted px-4 py-3 text-center text-sm text-muted-foreground'>
        This is your lot. You cannot bid on it.
      </p>
    );
  }

  if (holdsTopBid) {
    return (
      <p className='rounded-md bg-live/10 px-4 py-3 text-center text-sm font-medium text-live'>
        You hold the highest bid.
      </p>
    );
  }

  return (
    <BidDialog
      minimumBid={minimumBid}
      onBid={onBid}
      disabled={connection !== 'open' || !canBid}
      disabledReason={
        connection !== 'open' ? 'Reconnecting to the saleroom…' : undefined
      }
    />
  );
};

const Ledger = ({
  bids,
  arrived,
  viewerId,
}: {
  bids: Lot['bids'];
  arrived: Set<string>;
  viewerId: string | null;
}) => (
  <section className='rounded-lg border border-border bg-card'>
    <h2 className='border-b border-border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
      Bid ledger
    </h2>

    {bids.length === 0 ? (
      <p className='px-5 py-8 text-center text-sm text-muted-foreground'>
        No bids yet. The first one opens the lot.
      </p>
    ) : (
      <ul className='max-h-80 divide-y divide-border overflow-y-auto'>
        {bids.map((bid) => (
          <li
            key={bid.id}
            className={cn(
              'flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm',
              arrived.has(bid.id) && 'animate-ledger-enter'
            )}
          >
            <span className='truncate font-medium'>
              {bid.user.userName}
              {bid.userId === viewerId && (
                <span className='ml-1.5 text-[11px] font-normal text-muted-foreground'>
                  you
                </span>
              )}
            </span>
            <span className='shrink-0 font-mono text-xs text-muted-foreground tabular'>
              {new Date(bid.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <span className='shrink-0 font-mono font-medium tabular'>
              {formatMoney(bid.amount)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default Auction;
