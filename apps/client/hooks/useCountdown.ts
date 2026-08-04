'use client';

import { useEffect, useState } from 'react';
import { timeLeft } from '@/utils/format';

/**
 * Milliseconds remaining until `target`, ticking once a second.
 *
 * One interval, keyed off the target instant rather than off the value it
 * produces. AuctionTimer's version depended on `[timeLeft]` and *set* timeLeft in
 * its body, so it tore down and rebuilt the interval on every tick and the clock
 * drifted noticeably.
 */
export const useCountdown = (target: Date | string): number => {
  const deadline = new Date(target).getTime();
  const [remaining, setRemaining] = useState(() => timeLeft(target));

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, deadline - Date.now()));

    // Resync immediately: the first paint used the server's clock.
    update();

    if (Date.now() >= deadline) return;

    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return remaining;
};
