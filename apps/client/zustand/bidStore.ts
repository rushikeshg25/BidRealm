import { PublicBidT } from "@repo/db/types";
import { create } from "zustand";

type storeType = {
  /** Which auction the current contents belong to. */
  auctionId: string | null;
  currentAmount: number;
  bids: PublicBidT[];
  addBid: (bid: PublicBidT) => void;
  /** Replaces the contents wholesale for a given auction. */
  reset: (auctionId: string, bids: PublicBidT[], currentAmount: number) => void;
  setCurrentAmount: (amount: number) => void;
};

/**
 * A module-level singleton, so navigating between two auction pages showed the
 * previous auction's bids until an effect happened to overwrite them. `reset`
 * takes the auctionId and seeds currentAmount at the same time, so the store is
 * never in a half-initialised state -- `currentAmount: 0` as an initial value
 * meant the price painted as ₹0 on first render.
 */
export const bidStore = create<storeType>((set) => ({
  auctionId: null,
  currentAmount: 0,
  bids: [],

  addBid: (bid: PublicBidT) =>
    set((state) => {
      // The server echoes a bid to everyone including its sender, so without a
      // dedupe the bidder saw their own bid twice.
      if (state.bids.some((existing) => existing.id === bid.id)) return state;
      return {
        bids: [bid, ...state.bids],
        currentAmount: Math.max(state.currentAmount, bid.amount),
      };
    }),

  reset: (auctionId, bids, currentAmount) =>
    set({ auctionId, bids, currentAmount }),

  setCurrentAmount: (amount: number) => set({ currentAmount: amount }),
}));
