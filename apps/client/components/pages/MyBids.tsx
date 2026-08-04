'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import date from 'date-and-time';
import { ArrowUpDown, Gavel } from 'lucide-react';

import { PageShell, PageHeader } from '../PageShell';
import { PhaseBadge } from '../PhaseBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { getAuctionPhase } from '@/lib/auction';
import { formatMoneyExact } from '@/utils/format';
import type { MyBidRow } from '@/app/my-bids/page';

const PLACEHOLDER = '/placeholder.png';

const SORT_OPTIONS = [
  { value: 'time', label: 'Most recent' },
  { value: 'amount', label: 'Highest amount' },
  { value: 'title', label: 'Auction title' },
] as const;

export const MyBidsSkeleton = () => (
  <div className='space-y-3'>
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className='flex items-center gap-4 rounded-md border p-3'>
        <Skeleton className='h-10 w-10 shrink-0 rounded-md' />
        <Skeleton className='h-4 flex-1' />
        <Skeleton className='h-4 w-20' />
      </div>
    ))}
  </div>
);

/**
 * `bids: bidsT[]` where bidsT was *already* an array type, so the prop was
 * `Bid[][]` -- which is why the page needed `let bids: any` and a //@ts-ignore, and
 * why the map callback was typed `(bid: any)`. The row type is derived from the
 * Prisma query now, and both duplicate hand-rolled bidsT declarations are gone.
 */
const MyBids = ({
  bids,
  sortBy,
}: {
  bids: MyBidRow[];
  sortBy: string;
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const handleSortBy = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Was `if (searchParams) param.set(...) else param.delete(...)` -- searchParams
    // is always truthy, so the delete branch was unreachable.
    if (value === 'time') params.delete('sortBy');
    else params.set('sortBy', value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <PageShell width='wide'>
      <PageHeader
        title='My bids'
        description='Every bid you have placed, newest first.'
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='gap-1.5'>
                <ArrowUpDown className='h-3.5 w-3.5' />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              {/* The label read "Panel Position", copy-pasted straight from the
                  shadcn dropdown docs example. */}
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* `sortBy` comes from the URL now. It was local useState
                  initialised to 'time', so on reload the radio showed "Time" even
                  when the URL said ?sortBy=title. */}
              <DropdownMenuRadioGroup value={sortBy} onValueChange={handleSortBy}>
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Card>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auction</TableHead>
                <TableHead className='hidden sm:table-cell'>Status</TableHead>
                <TableHead className='hidden md:table-cell'>Placed</TableHead>
                <TableHead className='text-right'>Your bid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bids.length === 0 ? (
                // There was no empty state: zero bids rendered a blank table body.
                <TableRow>
                  <TableCell colSpan={4} className='py-12'>
                    <div className='flex flex-col items-center gap-3 text-center'>
                      <div className='rounded-full bg-muted p-3 text-muted-foreground'>
                        <Gavel className='h-5 w-5' />
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        You have not placed any bids yet.
                      </p>
                      <Button asChild size='sm' variant='outline'>
                        <Link href='/'>Browse auctions</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bids.map((bid) => {
                  const phase = getAuctionPhase(bid.auction);
                  const leading =
                    bid.amount >=
                    Math.max(
                      bid.auction.currentPrice,
                      bid.auction.startingPrice
                    );

                  return (
                    <TableRow key={bid.id}>
                      <TableCell className='font-medium'>
                        {/* Rows did not link anywhere, so there was no way back to
                            the auction you had bid on. */}
                        <Link
                          href={`/auction/${bid.auctionId}`}
                          className='flex items-center gap-3 hover:underline'
                        >
                          <span className='relative hidden h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted sm:block'>
                            <Image
                              src={bid.auction.image || PLACEHOLDER}
                              alt={bid.auction.title}
                              fill
                              sizes='40px'
                              className='object-cover'
                            />
                          </span>
                          {bid.auction.title}
                        </Link>
                      </TableCell>

                      <TableCell className='hidden sm:table-cell'>
                        <div className='flex items-center gap-2'>
                          <PhaseBadge phase={phase} />
                          {/* Nothing indicated whether you had been outbid. */}
                          {leading ? (
                            <Badge variant='outline' className='text-[10px]'>
                              Leading
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='text-[10px]'>
                              Outbid
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className='tabular hidden md:table-cell text-muted-foreground'>
                        {date.format(new Date(bid.createdAt), 'DD MMM YYYY, HH:mm')}
                      </TableCell>

                      {/* Was `${bid.amount}` -- rendered in dollars, while every
                          other surface in the app renders rupees. */}
                      <TableCell className='tabular text-right font-medium'>
                        ₹{formatMoneyExact(bid.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default MyBids;
