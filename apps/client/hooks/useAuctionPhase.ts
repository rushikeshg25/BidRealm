'use client';

import { useEffect, useState } from 'react';
import { getAuctionPhase, type AuctionPhase, type PhaseDates } from '@/lib/auction';

/**
 * Resolves an auction's phase without a hydration mismatch.
 *
 * The server renders the phase as of the server's clock; the browser hydrates
 * with its own. Rather than let the two disagree, this returns the server's
 * answer for the first paint and then recomputes on mount, and keeps recomputing
 * so a card sitting on screen flips from "Upcoming" to "Live" on its own instead
 * of waiting for a navigation.
 */
export const useAuctionPhase = (
  auction: PhaseDates,
  intervalMs = 1000
): AuctionPhase => {
  const [phase, setPhase] = useState<AuctionPhase>(() =>
    getAuctionPhase(auction)
  );

  const start = new Date(auction.startDate).getTime();
  const end = new Date(auction.endDate).getTime();

  useEffect(() => {
    const tick = () => setPhase(getAuctionPhase({ startDate: start, endDate: end }));

    tick();

    // Nothing left to watch for once it has ended.
    if (Date.now() >= end) return;

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [start, end, intervalMs]);

  return phase;
};
