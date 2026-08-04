'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import date from 'date-and-time';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { CirclePlus, Ellipsis, FileDown, Loader2, PackageOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';

import { deleteAuction } from '@/actions/DeleteAuction';
import { PageShell, PageHeader } from '../PageShell';
import { PhaseBadge } from '../PhaseBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuctionPhase, type AuctionPhase } from '@/lib/auction';
import { formatMoneyExact } from '@/utils/format';
import type { AuctionWithBidsT } from '@repo/db/types';

const PLACEHOLDER = '/placeholder.png';

type Row = AuctionWithBidsT;

/** The CSV columns, chosen deliberately rather than dumping the whole row. */
const toCsvRow = (auction: Row) => ({
  Title: auction.title,
  Category: auction.categories,
  Status: auction.status,
  'Starting price': auction.startingPrice,
  'Current price': auction.currentPrice,
  'Total bids': auction.bids.length,
  'Starts at': new Date(auction.startDate).toISOString(),
  'Ends at': new Date(auction.endDate).toISOString(),
  'Created at': new Date(auction.createdAt).toISOString(),
});

export const MyAuctionsSkeleton = () => (
  <div className='space-y-3'>
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className='flex items-center gap-4 rounded-md border p-3'>
        <Skeleton className='h-14 w-14 shrink-0 rounded-md' />
        <Skeleton className='h-4 flex-1' />
        <Skeleton className='hidden h-6 w-20 rounded-full md:block' />
        <Skeleton className='hidden h-4 w-24 md:block' />
      </div>
    ))}
  </div>
);

const AuctionsTable = ({
  auctions,
  onDelete,
  deletingId,
  emptyMessage,
}: {
  auctions: Row[];
  onDelete: (auction: Row) => void;
  deletingId: string | null;
  emptyMessage: string;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className='hidden w-[84px] sm:table-cell'>
          <span className='sr-only'>Image</span>
        </TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className='hidden md:table-cell'>Price</TableHead>
        <TableHead className='hidden md:table-cell'>Bids</TableHead>
        <TableHead className='hidden lg:table-cell'>Created</TableHead>
        <TableHead className='w-[64px]'>
          <span className='sr-only'>Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {auctions.length === 0 ? (
        <TableRow>
          {/* Was colSpan={6} against seven columns. */}
          <TableCell colSpan={7} className='py-12'>
            <div className='flex flex-col items-center gap-3 text-center'>
              <div className='rounded-full bg-muted p-3 text-muted-foreground'>
                <PackageOpen className='h-5 w-5' />
              </div>
              <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
              <Button asChild size='sm' variant='outline'>
                <Link href='/new'>Create an auction</Link>
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ) : (
        auctions.map((auction) => {
          const phase = getAuctionPhase(auction);
          const isDeleting = deletingId === auction.id;

          return (
            <TableRow key={auction.id} className={isDeleting ? 'opacity-50' : ''}>
              <TableCell className='hidden sm:table-cell'>
                <div className='relative h-14 w-14 overflow-hidden rounded-md bg-muted'>
                  <Image
                    // Was a raw <img> with alt='Product image' -- the same generic
                    // string on every row, useless to a screen reader.
                    src={auction.image || PLACEHOLDER}
                    alt={auction.title}
                    fill
                    sizes='56px'
                    className='object-cover'
                  />
                </div>
              </TableCell>

              <TableCell className='font-medium'>
                <Link
                  href={`/auction/${auction.id}`}
                  className='hover:underline'
                >
                  {auction.title}
                </Link>
              </TableCell>

              {/*
                The header order was Image, Name, Status, Price, Total Bids,
                Created at, Actions -- but the body rendered Image, Name, Price,
                formatMoney(bids.length), bids.length, Created at, Actions. So the
                Status column showed the price, the Price column showed a
                money-formatted *bid count*, and Total Bids was the same number
                again. Badge was imported for this and never used.
              */}
              <TableCell>
                <PhaseBadge phase={phase} />
              </TableCell>

              <TableCell className='tabular hidden md:table-cell'>
                ₹{formatMoneyExact(Math.max(auction.currentPrice, auction.startingPrice))}
              </TableCell>

              <TableCell className='tabular hidden md:table-cell'>
                {auction.bids.length}
              </TableCell>

              <TableCell className='tabular hidden lg:table-cell text-muted-foreground'>
                {date.format(new Date(auction.createdAt), 'DD MMM YYYY')}
              </TableCell>

              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8'
                      aria-label={`Actions for ${auction.title}`}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Ellipsis className='h-4 w-4' />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem asChild>
                      <Link href={`/auction/${auction.id}`}>Go to auction</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // Was `writeText('/auction/${id}')` -- a relative path, not
                        // a URL, so the "Copied to clipboard" toast was a lie.
                        navigator.clipboard.writeText(
                          `${window.location.origin}/auction/${auction.id}`
                        );
                        toast.success('Link copied');
                      }}
                    >
                      Copy link
                    </DropdownMenuItem>
                    {/*
                      Delete used to be offered only while
                      `startDate < now && endDate > now` -- that is, only while the
                      auction was *live with active bids*, and never for a draft or
                      an ended one. Exactly backwards. A live auction is the one
                      case where bidders have a stake, so it is excluded now.
                    */}
                    {phase !== 'live' ? (
                      <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        onClick={() => onDelete(auction)}
                      >
                        Delete auction
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })
      )}
    </TableBody>
  </Table>
);

const MyAuctions = ({ auctions }: { auctions: Row[] }) => {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { mutate: server_deleteAuction } = useMutation({
    mutationFn: deleteAuction,
    onSuccess: (result) => {
      setDeletingId(null);
      // The action returns a result rather than throwing, so a rejected delete
      // reports its real reason. This used to show a hardcoded
      // 'Error deleting auction' and discard the cause entirely.
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Auction deleted');
      // revalidatePath alone did not reliably drop the row from the rendered
      // table, so the deleted auction usually stayed until a manual reload.
      router.refresh();
    },
    onError: () => {
      setDeletingId(null);
      toast.error('Could not delete that auction. Please try again.');
    },
  });

  const byPhase = useMemo(() => {
    const groups: Record<AuctionPhase, Row[]> = {
      live: [],
      upcoming: [],
      ended: [],
    };
    for (const auction of auctions) {
      groups[getAuctionPhase(auction)].push(auction);
    }
    return groups;
  }, [auctions]);

  const csvDownload = () => {
    try {
      // Was `generateCsv(csvConfig)(JSON.stringify([...Auctions]))` behind a
      // //@ts-ignore -- a *string* passed where an array of objects is required, so
      // the export threw or emitted garbage, with no try/catch either way.
      const csvConfig = mkConfig({
        useKeysAsHeaders: true,
        filename: `bidrealm-auctions-${new Date().toISOString().slice(0, 10)}`,
      });
      download(csvConfig)(generateCsv(csvConfig)(auctions.map(toCsvRow)));
    } catch (error) {
      console.error('csv export failed', error);
      toast.error('Could not export your auctions.');
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    server_deleteAuction(pendingDelete.id);
    setPendingDelete(null);
  };

  const TABS = [
    { value: 'all', label: 'All', rows: auctions, empty: 'You have no auctions yet.' },
    { value: 'live', label: 'Live', rows: byPhase.live, empty: 'None of your auctions are live right now.' },
    { value: 'upcoming', label: 'Upcoming', rows: byPhase.upcoming, empty: 'You have no upcoming auctions.' },
    { value: 'ended', label: 'Ended', rows: byPhase.ended, empty: 'None of your auctions have ended yet.' },
  ] as const;

  return (
    // Was `div.container > div.flex.min-h-screen > div.flex > header + main` --
    // three wrapper divs, a second min-h-screen inside the layout's own, and a
    // second sticky header that collided with the navbar's on mobile.
    <PageShell width='wide'>
      <PageHeader
        title='My auctions'
        description={`${auctions.length} ${auctions.length === 1 ? 'listing' : 'listings'}`}
        actions={
          <>
            {/* Were four hand-rolled `props: any` inline SVGs at the bottom of
                this file, two of which (MoveHorizontalIcon, SearchIcon) were never
                referenced -- while lucide-react was already a dependency. */}
            <Button size='sm' variant='outline' className='gap-1.5' onClick={csvDownload}>
              <FileDown className='h-4 w-4' />
              <span className='hidden sm:inline'>Export</span>
            </Button>
            <Button asChild size='sm' className='gap-1.5'>
              <Link href='/new'>
                <CirclePlus className='h-4 w-4' />
                <span className='hidden sm:inline'>New auction</span>
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue='all'>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <span className='ml-1.5 text-xs text-muted-foreground'>
                {tab.rows.length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/*
          There were three triggers (All / Active / Ended) and exactly one
          TabsContent, value='all' -- so clicking Active or Ended rendered a blank
          page. The "Ended" trigger was even value='draft', matching nothing.
        */}
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className='mt-4'>
            {/* Card carried x-chunk='dashboard-06-chunk-0', a v0.dev generation
                artifact shipped to the DOM. */}
            <Card>
              <CardContent className='p-0'>
                <AuctionsTable
                  auctions={tab.rows}
                  onDelete={setPendingDelete}
                  deletingId={deletingId}
                  emptyMessage={tab.empty}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/*
        Delete used to fire immediately on a single dropdown click, permanently
        destroying the auction and every bid on it with no confirmation at all.
      */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this auction?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” and all{' '}
              {pendingDelete?.bids.length ?? 0} bid
              {pendingDelete?.bids.length === 1 ? '' : 's'} on it will be
              permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete auction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default MyAuctions;
