import { create } from 'zustand';
import type { BidPayload } from '@/hooks/useAuctionSocket';

type BidStore = {
  currentAmount: number;
  minimumBid: number;
  bids: BidPayload[];
  /** Ids that arrived over the socket, so the ledger can flash only those. */
  arrived: Set<string>;
  reset: (state: { currentAmount: number; minimumBid: number; bids: BidPayload[] }) => void;
  setCurrentAmount: (amount: number) => void;
  setMinimumBid: (amount: number) => void;
  addBid: (bid: BidPayload, minimumBid?: number) => void;
};

export const bidStore = create<BidStore>((set) => ({
  currentAmount: 0,
  minimumBid: 0,
  bids: [],
  arrived: new Set<string>(),

  reset: ({ currentAmount, minimumBid, bids }) =>
    set({ currentAmount, minimumBid, bids, arrived: new Set<string>() }),

  setCurrentAmount: (currentAmount) => set({ currentAmount }),
  setMinimumBid: (minimumBid) => set({ minimumBid }),

  addBid: (bid, minimumBid) =>
    set((state) => {
      // The same bid can arrive twice: once as the bidder's acknowledgement and
      // once as the broadcast, if a reconnect overlaps.
      if (state.bids.some((existing) => existing.id === bid.id)) return state;

      return {
        bids: [bid, ...state.bids],
        currentAmount: Math.max(state.currentAmount, bid.amount),
        minimumBid: minimumBid ?? state.minimumBid,
        arrived: new Set(state.arrived).add(bid.id),
      };
    }),
}));
