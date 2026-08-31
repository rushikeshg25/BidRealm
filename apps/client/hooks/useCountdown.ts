'use client';

import { useEffect, useState } from 'react';
import { timeLeft } from '@/utils/format';

/**
 * A self-ticking countdown for places with no socket, like the lot grid.
 *
 * Starts from null so the server and the first client render agree -- seeding
 * it with Date.now() during render is a hydration mismatch waiting to happen.
 */
export const useCountdown = (endDate: Date | string, enabled = true) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRemaining(null);
      return;
    }

    setRemaining(timeLeft(endDate));
    const id = setInterval(() => {
      const next = timeLeft(endDate);
      setRemaining(next);
      if (next === 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [endDate, enabled]);

  return remaining;
};
