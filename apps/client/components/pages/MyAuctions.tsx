'use client';

import { deleteAuction } from '@/actions/DeleteAuction';
import Search from '@/components/Search';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { LOT_STATE, lotState, type LotState } from '@/lib/lot';
import { cn } from '@/lib/utils';
import { categoryLabel } from '@/types/categories';
import { formatMoney } from '@/utils/format';
import { useMutation } from '@tanstack/react-query';
import type { AuctionWithBidsT } from '@repo/db/types';
import { Download, Ellipsis, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const TABS: { value: LotState | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Sold' },
];

const MyAuctions = ({ auctions }: { auctions: AuctionWithBidsT[] }) => {
  const router = useRouter();
  const [tab, setTab] = useState<LotState | 'all'>('all');

  const { mutate: withdraw, isPending } = useMutation({
    mutationFn: deleteAuction,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Lot withdrawn.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    },
    onError: () => toast.error('Could not withdraw the lot. Try again.'),
  });

  const rows = useMemo(
    () =>
      auctions.map((auction) => ({
        ...auction,
        state: lotState(auction),
      })),
    [auctions]
  );

  const visible = tab === 'all' ? rows : rows.filter((row) => row.state === tab);

  const exportCsv = () =>
    downloadCsv(
      `bidrealm-lots-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        rows.map((row) => ({
          lot: row.id,
          title: row.title,
          category: categoryLabel(row.category),
          status: LOT_STATE[row.state].label,
          startingPrice: row.startingPrice,
          currentPrice: row.currentPrice,
          bids: row.bids.length,
          opens: row.startDate,
          closes: row.endDate,
        })),
        [
          { key: 'lot', header: 'Lot' },
          { key: 'title', header: 'Title' },
          { key: 'category', header: 'Category' },
          { key: 'status', header: 'Status' },
          { key: 'startingPrice', header: 'Starting price' },
          { key: 'currentPrice', header: 'Current price' },
          { key: 'bids', header: 'Bids' },
          { key: 'opens', header: 'Opens' },
          { key: 'closes', header: 'Closes' },
        ]
      )
    );

  return (
    <div className='mx-auto max-w-[1200px] px-4 py-8 md:px-6'>
      <header className='mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
            Consignor
          </p>
          <h1 className='mt-1.5 font-display text-3xl font-semibold'>My lots</h1>
        </div>
        <div className='w-full md:max-w-xs'>
          <Search placeholder='Search your lots' />
        </div>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as LotState | 'all')}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {/* The Live and Sold tabs previously had no content at all, so
              selecting one showed a blank panel. */}
          <TabsList>
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={exportCsv}
              disabled={rows.length === 0}
            >
              <Download className='mr-1.5 size-3.5' />
              Export CSV
            </Button>
            <Button size='sm' asChild>
              <Link href='/new'>
                <Plus className='mr-1.5 size-3.5' />
                List a lot
              </Link>
            </Button>
          </div>
        </div>

        {TABS.map((item) => (
          <TabsContent key={item.value} value={item.value} className='mt-4'>
            <div className='overflow-hidden rounded-lg border border-border bg-card'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-16'>
                        <span className='sr-only'>Photo</span>
                      </TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Price</TableHead>
                      <TableHead className='text-right'>Bids</TableHead>
                      <TableHead className='hidden md:table-cell'>Closes</TableHead>
                      <TableHead className='w-12'>
                        <span className='sr-only'>Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {visible.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className='py-12 text-center'>
                          <p className='text-sm text-muted-foreground'>
                            {rows.length === 0 ? (
                              <>
                                You have not listed anything yet.{' '}
                                <Link
                                  href='/new'
                                  className='underline underline-offset-2'
                                >
                                  List your first lot
                                </Link>
                                .
                              </>
                            ) : (
                              `Nothing ${item.label.toLowerCase()} right now.`
                            )}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      visible.map((auction) => {
                        // Withdrawal used to be offered only while the lot was
                        // running with live bids on it, and hidden for lots
                        // that had not opened -- exactly backwards.
                        const canWithdraw =
                          auction.state !== 'live' && auction.bids.length === 0;

                        return (
                          <TableRow key={auction.id}>
                            <TableCell>
                              <div className='relative size-12 overflow-hidden rounded-md bg-muted'>
                                {auction.image && (
                                  <Image
                                    src={auction.image}
                                    alt=''
                                    fill
                                    sizes='48px'
                                    className='object-cover'
                                  />
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <Link
                                href={`/auction/${auction.id}`}
                                className='font-medium hover:underline'
                              >
                                {auction.title}
                              </Link>
                              <div className='text-xs text-muted-foreground'>
                                {categoryLabel(auction.category)}
                              </div>
                            </TableCell>

                            {/* This column was in the header but never in the
                                body, so every cell after it sat under the wrong
                                heading. */}
                            <TableCell>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                                  LOT_STATE[auction.state].chip
                                )}
                              >
                                <span
                                  className={cn(
                                    'size-1.5 rounded-full',
                                    LOT_STATE[auction.state].dot
                                  )}
                                />
                                {LOT_STATE[auction.state].label}
                              </span>
                            </TableCell>

                            <TableCell className='text-right font-mono tabular'>
                              {formatMoney(auction.currentPrice)}
                            </TableCell>

                            {/* This used to be run through the money formatter,
                                so five bids rendered as a price. */}
                            <TableCell className='text-right font-mono tabular'>
                              {auction.bids.length}
                            </TableCell>

                            <TableCell className='hidden font-mono text-xs text-muted-foreground tabular md:table-cell'>
                              {new Date(auction.endDate).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </TableCell>

                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    aria-label={`Actions for ${auction.title}`}
                                  >
                                    <Ellipsis className='size-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/auction/${auction.id}`}>
                                      Open lot
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      navigator.clipboard.writeText(
                                        `${window.location.origin}/auction/${auction.id}`
                                      );
                                      toast.success('Link copied.');
                                    }}
                                  >
                                    Copy link
                                  </DropdownMenuItem>
                                  {canWithdraw && (
                                    <DropdownMenuItem
                                      disabled={isPending}
                                      className='text-destructive'
                                      onSelect={() => withdraw(auction.id)}
                                    >
                                      Withdraw lot
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default MyAuctions;
