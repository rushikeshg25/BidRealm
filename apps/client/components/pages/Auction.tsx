'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import date from 'date-and-time';
import type { User } from 'lucia';
import toast from 'react-hot-toast';
import { AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, initialsOf } from '../ui/avatar';
import { PageShell } from '../PageShell';
import { PhaseBadge } from '../PhaseBadge';
import AuctionTimer from '../AuctionTimer';
import BidDialog from '../BidDialog';
import { bidStore } from '@/zustand/bidStore';
import { useAuctionPhase } from '@/hooks/useAuctionPhase';
import { useSocket, type ServerMessage } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyExact } from '@/utils/format';
import type { AuctionDetailT, PublicBidT } from '@repo/db/types';

const PLACEHOLDER = '/placeholder.png';

const Auction = ({
  user,
  auction,
}: {
  user: User | null;
  auction: AuctionDetailT;
}) => {
  // Removed from here: four console.log calls of the auction's dates, sitting in
  // the render body and firing on every render.
  const phase = useAuctionPhase(auction);
  const { addBid, bids, currentAmount, reset } = bidStore();
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
  const [serverTimeLeft, setServerTimeLeft] = useState<number | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const isOwner = user?.id === auction.userId;
  const isSignedIn = Boolean(user);

  // The store is a module singleton, so it has to be reset for this auction --
  // otherwise the previous auction's bids render until an effect overwrites them.
  // Seeding currentAmount here too stops the price painting as ₹0 first.
  useEffect(() => {
    reset(
      auction.id,
      auction.bids,
      Math.max(auction.currentPrice, auction.startingPrice)
    );
  }, [auction.id, auction.bids, auction.currentPrice, auction.startingPrice, reset]);

  const handleMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'TIME_LEFT':
          setServerTimeLeft(message.timeLeft);
          break;
        case 'BID': {
          const bid = message.bid as PublicBidT;
          addBid(bid);
          toast(`${bid.user.userName} bid ₹${formatMoneyExact(bid.amount)}`, {
            icon: '🔨',
          });
          break;
        }
        case 'AUCTION_ENDED':
          toast('This auction has ended.', { icon: '⏰' });
          break;
        case 'ERROR':
          // The server's rejections were previously never surfaced at all.
          toast.error(message.message);
          break;
      }
    },
    [addBid]
  );

  const { status, send, isConnected } = useSocket({
    auctionId: auction.id,
    // Neither anonymous visitors nor the seller may bid, so neither needs a
    // socket. The old code connected regardless, with `userId=undefined` in the
    // URL, and decided who was logged in by injecting a fake
    // `{ id: 'test', email: 'test@test.com' }` user and then checking
    // `userInfo?.id !== 'test'`.
    enabled: isSignedIn && !isOwner && phase === 'live',
    onMessage: handleMessage,
  });

  const placeBid = useCallback(
    (amount: number) => send({ type: 'bid', amount }),
    [send]
  );

  // Derived from the maximum amount rather than `bids[0]`, which assumed the list
  // was ordered by amount when it is ordered by insertion time.
  const highestBid = useMemo(
    () =>
      bids.reduce<PublicBidT | null>(
        (best, bid) => (!best || bid.amount > best.amount ? bid : best),
        null
      ),
    [bids]
  );
  const isHighestBidder = Boolean(user && highestBid?.user.id === user.id);

  // next/image throws on src="" -- reachable, because auctions could previously be
  // created with no image at all.
  const imageSrc = !auction.image || imageFailed ? PLACEHOLDER : auction.image;

  return (
    <PageShell>
      <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]'>
        {/* Left: the item */}
        <div className='space-y-5'>
          <div className='relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted'>
            {/*
              Was width={250} height={250} with `object-cover p-3` inside a
              `w-full h-full` flex box, so the hero was a small square floating in
              a large bordered container. And `border--card` twice, a double-dash
              typo that resolved to nothing.
            */}
            <Image
              src={imageSrc}
              alt={auction.title}
              fill
              priority
              sizes='(min-width: 1024px) 55vw, 100vw'
              className='object-cover'
              onError={() => setImageFailed(true)}
            />
            <div className='absolute left-4 top-4'>
              <PhaseBadge phase={phase} />
            </div>
          </div>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Badge variant='secondary'>{auction.categories}</Badge>
              <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
                {auction.title}
              </h1>
            </div>

            <div className='flex items-center gap-3'>
              <Avatar className='h-8 w-8'>
                <AvatarFallback>
                  {initialsOf(auction.user.userName)}
                </AvatarFallback>
              </Avatar>
              <div className='text-sm'>
                <p className='text-muted-foreground'>Listed by</p>
                <p className='font-medium'>{auction.user.userName}</p>
              </div>
            </div>

            <Separator />

            <p className='whitespace-pre-line text-sm leading-relaxed text-muted-foreground'>
              {auction.description}
            </p>
          </div>
        </div>

        {/* Right: bidding */}
        <div className='space-y-6 lg:sticky lg:top-24 lg:self-start'>
          {/* Padding was `p-1` here against `p-6` on the history panel below. */}
          <div className='space-y-4 rounded-lg border bg-card p-5'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>
                {phase === 'upcoming'
                  ? 'Starting price'
                  : phase === 'live'
                    ? 'Current bid'
                    : 'Final price'}
              </p>
              {/*
                Was `₹{formatMoney(currentAmount).toLocaleString()}` --
                formatMoney returns a string, so .toLocaleString() was a no-op on
                a string. Twice.
              */}
              <p className='tabular text-3xl font-semibold'>
                ₹{formatMoneyExact(currentAmount)}
              </p>
              {phase !== 'upcoming' && bids.length > 0 ? (
                <p className='text-xs text-muted-foreground'>
                  {bids.length} {bids.length === 1 ? 'bid' : 'bids'} · opened at ₹
                  {formatMoney(auction.startingPrice)}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className='flex items-center justify-between gap-3'>
              <span className='text-sm text-muted-foreground'>
                {phase === 'live'
                  ? 'Ends in'
                  : phase === 'upcoming'
                    ? 'Opens'
                    : 'Ended'}
              </span>
              <span className='text-right font-semibold'>
                {phase === 'live' ? (
                  <AuctionTimer
                    endDate={auction.endDate}
                    serverTimeLeft={serverTimeLeft}
                  />
                ) : (
                  <span className='tabular'>
                    {date.format(
                      new Date(
                        phase === 'upcoming' ? auction.startDate : auction.endDate
                      ),
                      'DD MMM YYYY, HH:mm'
                    )}
                  </span>
                )}
              </span>
            </div>

            {/* Connection state was invisible: a dropped socket looked identical
                to a healthy one until a bid vanished. */}
            {isSignedIn && !isOwner && phase === 'live' ? (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs',
                  isConnected
                    ? 'bg-live/10 text-live'
                    : status === 'closed'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                )}
                role='status'
              >
                {isConnected ? (
                  <>
                    <Wifi className='h-3.5 w-3.5' />
                    Live — bids update in real time
                  </>
                ) : status === 'closed' ? (
                  <>
                    <WifiOff className='h-3.5 w-3.5' />
                    Disconnected. Reload to try again.
                  </>
                ) : (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    Connecting to the auction…
                  </>
                )}
              </div>
            ) : null}

            {/* The branch order matters: owner, then phase, then signed-in. */}
            {isOwner ? (
              <Button disabled className='w-full'>
                This auction is listed by you
              </Button>
            ) : phase === 'ended' ? (
              <Button disabled className='w-full'>
                Bidding has closed
              </Button>
            ) : phase === 'upcoming' ? (
              <Button disabled className='w-full'>
                Bidding has not opened yet
              </Button>
            ) : !isSignedIn ? (
              <Button asChild className='w-full'>
                <Link href={`/sign-in?next=/auction/${auction.id}`}>
                  Sign in to place a bid
                </Link>
              </Button>
            ) : isHighestBidder ? (
              <div className='space-y-2'>
                <Button disabled className='w-full'>
                  You hold the highest bid
                </Button>
                <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <AlertCircle className='h-3.5 w-3.5' />
                  You will be notified if someone outbids you.
                </p>
              </div>
            ) : (
              <>
                {/*
                  The trigger lives here rather than inside the dialog. It used to
                  be a DialogTrigger *inside* a controlled Dialog, so the page's
                  primary CTA both toggled state the parent also owned and was
                  coupled to the dialog's internals.
                */}
                <Button
                  size='lg'
                  className='w-full'
                  onClick={() => setIsBidDialogOpen(true)}
                  disabled={!isConnected}
                >
                  {isConnected ? 'Place bid' : 'Connecting…'}
                </Button>
                <BidDialog
                  open={isBidDialogOpen}
                  onOpenChange={setIsBidDialogOpen}
                  currentAmount={currentAmount}
                  startingPrice={auction.startingPrice}
                  isConnected={isConnected}
                  onBid={placeBid}
                />
              </>
            )}
          </div>

          <div className='space-y-4 rounded-lg border bg-card p-5'>
            <h2 className='font-semibold'>Bid history</h2>
            <Table containerClassname='max-h-80 overflow-y-auto rounded-md border'>
              <TableHeader className='sticky top-0 bg-card'>
                <TableRow>
                  <TableHead>Bidder</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.length === 0 ? (
                  <TableRow>
                    {/* Was colSpan={2} in a three-column table. */}
                    <TableCell
                      colSpan={3}
                      className='py-8 text-center text-sm text-muted-foreground'
                    >
                      No bids yet — be the first.
                    </TableCell>
                  </TableRow>
                ) : (
                  bids.map((bid) => (
                    // Keyed by bid.id, not by array index. The store *prepends*
                    // new bids, so index keys shifted every row's identity on each
                    // incoming bid and React re-rendered the whole table instead
                    // of inserting one row.
                    <TableRow key={bid.id} className='animate-slide-up'>
                      <TableCell className='font-medium'>
                        <span className='flex items-center gap-2'>
                          {bid.user.userName}
                          {highestBid?.id === bid.id ? (
                            <Badge variant='live' className='text-[10px]'>
                              Highest
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className='tabular text-muted-foreground'>
                        {date.format(new Date(bid.createdAt), 'DD MMM HH:mm:ss')}
                      </TableCell>
                      <TableCell className='tabular text-right font-medium'>
                        ₹{formatMoneyExact(bid.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Auction;
