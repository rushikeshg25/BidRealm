'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSocketTicket } from '@/actions/GetSocketTicket';
import { bidStore } from '@/zustand/bidStore';
import { AuctionDetailT } from '@repo/db/types';
import date from 'date-and-time';
import { User } from 'lucia';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuctionTimer from '../AuctionTimer';
import BidDialog from '../BidDialog';
import { Button } from '../ui/button';

// Next only inlines NEXT_PUBLIC_* into the browser bundle. This was
// `process.env.WS_URL`, always undefined client-side, so every deployment fell
// through to localhost and no user could ever connect to the real bid server.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';
const formatMoney = (amount: number) => {
  if (amount >= 100000 && amount < 10000000) {
    return `${amount / 1000000}L`;
  } else if (amount >= 10000 && amount < 100000) {
    return `${amount / 1000}K`;
  } else if (amount >= 10000000) {
    return `${amount / 10000000}cr`;
  }
  return `${amount}`;
};
const Auction = ({
  user,
  auction,
}: {
  user: User | null;
  auction: AuctionDetailT;
}) => {
  console.log('start', auction.startDate);
  console.log('startcal', new Date() > new Date(auction.startDate));
  console.log('end', auction.endDate);
  console.log('endcal', new Date() > new Date(auction.endDate));
  const [userInfo, setUserInfo] = useState<User | null | undefined>(user);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const { initBids, bids, currentAmount, setCurrentAmount } = bidStore();

  useEffect(() => {
    setCurrentAmount(auction.currentPrice);
    initBids(auction.bids);
    if (!user) {
      setUserInfo({
        id: 'test',
        email: 'test@test.com',
      });
    }
  }, [user]);

  useEffect(() => {
    // Anonymous visitors get no socket at all. The connection URL no longer
    // carries a `userId` for the server to trust — identity travels in a signed
    // ticket that only a validated session can mint.
    if (!user) return;

    let ws: WebSocket | null = null;
    let cancelled = false;

    (async () => {
      const result = await getSocketTicket(auction.id);
      if (cancelled) return;
      if (!result.ok) return;

      ws = new WebSocket(
        `${WS_URL}?auctionId=${auction.id}&ticket=${encodeURIComponent(result.ticket)}`
      );
      ws.onopen = () => setSocket(ws);
      ws.onclose = () => setSocket(null);
    })();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [user?.id, auction.id]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const router = useRouter();

  return (
    <div className='flex flex-col items-center justify-center h-full p-4 bg-background md:p-8'>
      <div className='grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-center justify-center  rounded-lg relative w-full h-full  border border--card dark:border--card'>
            <Image
              src={auction.image}
              alt={auction.title}
              width={250}
              height={250}
              className='object-cover p-3 '
            />
          </div>
          <div className='flex flex-col gap-1'>
            <h1 className='text-2xl font-bold'>{auction.title}</h1>
            <h2 className='text-muted-foreground flex flex-row gap-1'>
              Item listed by:{' '}
              <p className='font-bold'>{auction.user.userName}</p>
            </h2>
            <p className='text-muted-foreground'>{auction.description}</p>
          </div>
        </div>
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col gap-2 p-1 rounded-lg bg-card'>
            <div className='flex items-center justify-between'>
              <span className='text-lg font-semibold'>Current Bid</span>
              <span className='text-2xl font-bold text-primary'>
                ₹{formatMoney(currentAmount).toLocaleString()}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-lg font-semibold'>Starting Bid</span>
              <span className='text-2xl font-bold text-primary'>
                ₹{formatMoney(auction.startingPrice).toLocaleString()}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-lg font-semibold'>Time Left</span>

              <span className='text-2xl font-bold text-primary'>
                {new Date(auction.startDate) < new Date() &&
                new Date(auction.endDate) > new Date() ? (
                  <AuctionTimer
                    auctionId={auction.id}
                    userId={userInfo?.id as string}
                    socket={socket}
                  />
                ) : new Date(auction.startDate) < new Date() &&
                  new Date(auction.endDate) < new Date() ? (
                  <>Ended</>
                ) : (
                  <>Yet to Start</>
                )}
              </span>
            </div>
            {user?.id == auction.userId ? (
              <Button disabled={true}>This Auction is Listed by You!</Button>
            ) : userInfo?.id !== 'test' ? (
              bids[0]?.user.id === user?.id ? (
                <Button disabled={true}>You hold the highest bid</Button>
              ) : (
                <BidDialog
                  handleModal={handleModal}
                  value={isModalOpen}
                  startPrice={auction.currentPrice}
                  currentPrice={auction.currentPrice}
                  auctionId={auction.id}
                  userId={userInfo?.id as string}
                  socket={socket}
                />
              )
            ) : (
              <Button
                onClick={() => router.push('/sign-in')}
                className='w-full'
              >
                Login to Place a Bid
              </Button>
            )}
          </div>
          <div className='flex flex-col gap-4 p-6 rounded-lg bg-card '>
            <h2 className='text-xl font-bold'>Bid History</h2>
            <Table containerClassname='h-fit max-h-80 overflow-y-auto relative dark:border--card rounded-xl border border--card dark:border'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[100px]'>Bidder</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>No bids yet</TableCell>
                  </TableRow>
                ) : (
                  bids.map((bid, index) => (
                    <TableRow key={index}>
                      <TableCell className='font-medium'>
                        {bid.user.userName}
                      </TableCell>
                      <TableCell>
                        {date.format(
                          new Date(bid.createdAt),
                          'YYYY/MM/DD HH:mm:ss'
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        ₹{bid.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auction;
