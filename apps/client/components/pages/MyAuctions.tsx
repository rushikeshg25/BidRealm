'use client';
import { User } from 'lucia';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Ellipsis } from 'lucide-react';
import date from 'date-and-time';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { formatMoney } from '@/utils/format';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AuctionWithBidsT } from '@repo/db/types';
import Search from '../Search';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { deleteAuction } from '@/actions/DeleteAuction';

const MyAuctions = ({
  user,
  Auctions,
}: {
  user: User;
  Auctions: AuctionWithBidsT[];
}) => {
  const router = useRouter();
  const csvConfig = mkConfig({ useKeysAsHeaders: true });
  const csvDownload = () => {
    //@ts-ignore
    const csv = generateCsv(csvConfig)(JSON.stringify([...Auctions]));
    download(csvConfig)(csv);
  };
  const { mutate: server_deleteAuction } = useMutation({
    mutationFn: deleteAuction,
    onSuccess: (result) => {
      // The action returns a result rather than throwing, so a rejected delete
      // (not signed in, not the owner) reports its real reason. This previously
      // showed a hardcoded 'Error deleting auction' and discarded the cause.
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Auction deleted successfully');
      // revalidatePath alone did not reliably drop the row from the rendered
      // table, so it usually stayed until a manual reload.
      router.refresh();
    },
    onError: () => {
      toast.error('Could not delete that auction. Please try again.');
    },
  });

  return (
    <div className='container px-4 py-8 mx-auto sm:px-6 lg:px-8 '>
      <div className='flex flex-col w-full min-h-screen '>
        <div className='flex flex-col sm:gap-4 sm:py-4 '>
          <header className='sticky top-0 z-30 flex items-center gap-4 px-4 border-b h-14 bg-background sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6'>
            <h1>My Auctions</h1>
            <div className='relative flex-grow-0 ml-auto md:grow-0'>
              <Search />
            </div>
          </header>
          <main className='grid items-start flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8'>
            <Tabs defaultValue='all'>
              <div className='flex items-center'>
                <TabsList>
                  <TabsTrigger value='all'>All</TabsTrigger>
                  <TabsTrigger value='active'>Active</TabsTrigger>
                  <TabsTrigger value='draft'>Ended</TabsTrigger>
                </TabsList>
                <div className='flex items-center gap-2 ml-auto'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-8 gap-1'
                    onClick={csvDownload}
                  >
                    <FileIcon className='h-3.5 w-3.5' />
                    <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
                      Export
                    </span>
                  </Button>
                  <Button
                    size='sm'
                    className='h-8 gap-1'
                    onClick={() => router.push('/new')}
                  >
                    <CirclePlusIcon className='h-3.5 w-3.5' />
                    <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
                      Add Auction
                    </span>
                  </Button>
                </div>
              </div>
              <TabsContent value='all'>
                <Card x-chunk='dashboard-06-chunk-0'>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='hidden w-[100px] sm:table-cell'>
                            <span className='sr-only'>Image</span>
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='hidden md:table-cell'>
                            Price
                          </TableHead>
                          <TableHead className='hidden md:table-cell'>
                            Total Bids
                          </TableHead>
                          <TableHead className='hidden md:table-cell'>
                            Created at
                          </TableHead>
                          <TableHead>
                            <span className='sr-only'>Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      {Auctions.length === 0 ? (
                        <TableBody>
                          <TableRow>
                            <TableCell colSpan={6}>
                              No auctions.{' '}
                              <Link
                                href='/new'
                                className='underline underline-offset-2'
                              >
                                Create one
                              </Link>
                            </TableCell>
                          </TableRow>{' '}
                        </TableBody>
                      ) : (
                        <TableBody>
                          {Auctions.map((auction) => (
                            <TableRow key={auction.id}>
                              <TableCell className='hidden sm:table-cell'>
                                {auction.image ? (
                                  <img
                                    alt='Product image'
                                    className='object-cover rounded-md aspect-square'
                                    height='64'
                                    src={auction.image}
                                    width='64'
                                  />
                                ) : (
                                  <div className='rounded-md aspect-square bg-background'>
                                    <div className='flex items-center justify-center w-full h-full'>
                                      <div className='text-muted-foreground'>
                                        No Image
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className='font-medium'>
                                {auction.title}
                              </TableCell>

                              <TableCell className='hidden md:table-cell'>
                                ₹
                                {auction.currentPrice === 0
                                  ? formatMoney(auction.startingPrice)
                                  : formatMoney(auction.currentPrice)}
                              </TableCell>
                              <TableCell className='hidden md:table-cell'>
                                {formatMoney(auction.bids.length)}
                              </TableCell>
                              <TableCell className='hidden md:table-cell'>
                                <>{auction.bids.length}</>
                              </TableCell>
                              <TableCell className='hidden md:table-cell'>
                                {date.format(
                                  auction.createdAt,
                                  'YYYY/MM/DD HH:mm:ss'
                                )}
                              </TableCell>
                              <TableCell className='hidden md:table-cell'>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className='h-8 gap-1'
                                    >
                                      <Ellipsis />
                                      <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
                                        View
                                      </span>
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        router.push(`/auction/${auction.id}`);
                                      }}
                                    >
                                      Go to Auction
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        navigator.clipboard.writeText(
                                          `/auction/${auction.id}`
                                        );
                                        toast.success('Copied to clipboard');
                                      }}
                                    >
                                      Copy Link
                                    </DropdownMenuItem>
                                    {auction.startDate < new Date() &&
                                      auction.endDate > new Date() && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            server_deleteAuction(auction.id);
                                          }}
                                        >
                                          Delete Auction
                                        </DropdownMenuItem>
                                      )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      )}
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
};

function CirclePlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='12' cy='12' r='10' />
      <path d='M8 12h8' />
      <path d='M12 8v8' />
    </svg>
  );
}

function FileIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' />
      <path d='M14 2v4a2 2 0 0 0 2 2h4' />
    </svg>
  );
}

function MoveHorizontalIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='18 8 22 12 18 16' />
      <polyline points='6 8 2 12 6 16' />
      <line x1='2' x2='22' y1='12' y2='12' />
    </svg>
  );
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='11' cy='11' r='8' />
      <path d='m21 21-4.3-4.3' />
    </svg>
  );
}

export default MyAuctions;
