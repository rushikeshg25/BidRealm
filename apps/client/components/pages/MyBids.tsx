'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LOT_STATE, lotState } from '@/lib/lot';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format';
import { ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MyBid } from '@/types/lot';

const SORTS = [
  { value: 'time', label: 'Most recent' },
  { value: 'title', label: 'Lot title' },
  { value: 'amount', label: 'Bid amount' },
];

const MyBids = ({ bids }: { bids: MyBid[] }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sortBy = searchParams.get('sortBy') ?? 'time';

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className='mx-auto max-w-[1000px] px-4 py-8 md:px-6'>
      <header className='mb-6 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
            Paddle history
          </p>
          <h1 className='mt-1.5 font-display text-3xl font-semibold'>My bids</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              <ArrowUpDown className='mr-1.5 size-3.5' />
              {SORTS.find((sort) => sort.value === sortBy)?.label ?? 'Sort'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {/* This menu was labelled "Panel Position". It sorts. */}
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortBy} onValueChange={handleSort}>
              {SORTS.map((sort) => (
                <DropdownMenuRadioItem key={sort.value} value={sort.value}>
                  {sort.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className='overflow-hidden rounded-lg border border-border bg-card'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='hidden md:table-cell'>Placed</TableHead>
                <TableHead className='text-right'>Your bid</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {bids.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='py-12 text-center'>
                    <p className='text-sm text-muted-foreground'>
                      You have not bid on anything yet.{' '}
                      <Link href='/' className='underline underline-offset-2'>
                        Find a lot
                      </Link>
                      .
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                bids.map((bid) => {
                  const state = lotState(bid.auction);
                  const winning = bid.amount === bid.auction.currentPrice;

                  return (
                    <TableRow key={bid.id}>
                      <TableCell>
                        <Link
                          href={`/auction/${bid.auctionId}`}
                          className='font-medium hover:underline'
                        >
                          {bid.auction.title}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                            LOT_STATE[state].chip
                          )}
                        >
                          {state === 'ended'
                            ? winning
                              ? 'Won'
                              : 'Closed'
                            : winning
                              ? 'Leading'
                              : 'Outbid'}
                        </span>
                      </TableCell>

                      <TableCell className='hidden font-mono text-xs text-muted-foreground tabular md:table-cell'>
                        {new Date(bid.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </TableCell>

                      {/* This was rendered as `${bid.amount}` -- dollars, in an
                          app that prices everything in rupees. */}
                      <TableCell className='text-right font-mono font-medium tabular'>
                        {formatMoney(bid.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default MyBids;
