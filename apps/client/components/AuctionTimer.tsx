'use client';

import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { formatTime } from '@/utils/format';
import { cn } from '@/lib/utils';

/**
 * A countdown driven by the auction's end date, corrected by the server's
 * TIME_LEFT pushes.
 *
 * What this replaces:
 *
 * - It reached into the shared socket and assigned `socket.onmessage`,
 *   `socket.onclose` and `socket.onerror` as properties, clobbering the parent's
 *   handlers, and its cleanup called `socket.close()` on a socket it did not own.
 *   Message handling and connection ownership both live in useSocket now; this
 *   component just renders a number.
 * - Its ticking effect depended on `[timeLeft]` and *set* timeLeft in its body, so
 *   it tore down and rebuilt the interval on every tick and the clock drifted.
 *   One interval, keyed off the deadline.
 * - It rendered the literal string "Loading..." inside a `text-2xl font-bold`
 *   span, so the header visibly reflowed from "Loading..." to "1h 04m 03s".
 */
const AuctionTimer = ({
  endDate,
  /**
   * The server's most recent TIME_LEFT, in milliseconds. Used to correct clock
   * skew between the browser and the bid server; the local interval carries the
   * countdown between pushes so the digits do not jump.
   */
  serverTimeLeft,
  className,
}: {
  endDate: Date | string;
  serverTimeLeft?: number | null;
  className?: string;
}) => {
  const deadlineFromDate = new Date(endDate).getTime();

  // Tracked as an absolute instant rather than a duration, so a re-render cannot
  // restart the countdown.
  const [deadline, setDeadline] = useState(deadlineFromDate);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setDeadline(deadlineFromDate);
  }, [deadlineFromDate]);

  // Trust the server when it speaks: its clock is the one that decides when
  // bidding closes.
  useEffect(() => {
    if (typeof serverTimeLeft !== 'number') return;
    setDeadline(Date.now() + serverTimeLeft);
  }, [serverTimeLeft]);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, deadline - Date.now()));

    update();
    if (Date.now() >= deadline) return;

    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  // Until the first client tick, render a fixed-width placeholder rather than
  // text: computing the value during render would disagree with the server's
  // clock and produce a hydration mismatch.
  if (remaining === null) {
    return <Skeleton className={cn('h-7 w-32', className)} />;
  }

  return (
    <span
      // Neither of these was present: nothing announced the countdown, and
      // proportional digits made the number jitter every second.
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      className={cn('tabular', className)}
    >
      {remaining > 0 ? formatTime(remaining) : 'Ended'}
    </span>
  );
};

export default AuctionTimer;
