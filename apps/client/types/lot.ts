import type { AuctionStatusT, CategoryT } from '@repo/db/types';

/**
 * Exactly what the lot page needs, and nothing else.
 *
 * The page used to `include: { user: true, bids: { include: { user: true } } }`,
 * so every full User row -- hashedPassword included -- was serialised into the
 * page payload and shipped to the browser.
 */
export type LotBid = {
  id: string;
  amount: number;
  createdAt: string;
  userId: string;
  auctionId: string;
  user: { id: string; userName: string };
};

export type Lot = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: CategoryT;
  status: AuctionStatusT;
  startingPrice: number;
  currentPrice: number;
  startDate: string;
  endDate: string;
  userId: string;
  user: { id: string; userName: string };
  bids: LotBid[];
};

/** A row on the My Bids page: the bid plus just enough of its lot to judge it. */
export type MyBid = {
  id: string;
  amount: number;
  createdAt: string;
  auctionId: string;
  auction: {
    title: string;
    status: AuctionStatusT;
    currentPrice: number;
    startDate: string;
    endDate: string;
  };
};
