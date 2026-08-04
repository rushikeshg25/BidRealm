import { PublicBidT } from "@repo/db/types";
import { create } from "zustand";

type storeType = {
  currentAmount: number;
  bids: PublicBidT[];
  setCurrentAmount: (amount: number) => void;
  addBid: (bid: PublicBidT) => void;
  initBids: (bids: PublicBidT[]) => void;
};

export const bidStore = create<storeType>((set) => ({
  currentAmount: 0,
  bids: [],
  addBid: (bid: PublicBidT) =>
    set((state) => ({ bids: [bid, ...state.bids] })),
  initBids: (bids: PublicBidT[]) => set({ bids }),
  setCurrentAmount: (amount: number) => set({ currentAmount: amount }),
}));
