'use client';

import { cn } from '@/lib/utils';
import type { LotState } from '@/lib/lot';
import { formatCountdown } from '@/utils/format';

/** Under an hour the clock turns brass; under five minutes it turns to the paddle. */
const BRASS_FROM_MS = 60 * 60 * 1000;
const URGENT_FROM_MS = 5 * 60 * 1000;

type Size = 'sm' | 'lg';

/**
 * The signature of the interface: a lot's remaining time, which changes
 * character as it runs out. Calm while there is time, brass in the last hour,
 * paddle red and breathing in the last five minutes, and a brass SOLD once the
 * hammer falls.
 *
 * Colour carries the state on its own, so the pulse is decoration that reduced
 * motion can safely drop.
 */
const HammerClock = ({
  remaining,
  state,
  size = 'sm',
  className,
}: {
  remaining: number | null;
  state: LotState;
  size?: Size;
  className?: string;
}) => {
  const type = size === 'lg' ? 'text-3xl md:text-4xl' : 'text-sm';

  if (state === 'ended') {
    return (
      <span
        className={cn(
          'font-mono font-semibold uppercase tracking-[0.18em] text-brass tabular',
          size === 'lg' ? 'text-2xl md:text-3xl' : 'text-xs',
          className
        )}
      >
        Sold
      </span>
    );
  }

  if (state === 'upcoming') {
    return (
      <span
        className={cn(
          'font-mono uppercase tracking-[0.14em] text-muted-foreground tabular',
          size === 'lg' ? 'text-xl md:text-2xl' : 'text-xs',
          className
        )}
      >
        Not open yet
      </span>
    );
  }

  if (remaining === null) {
    return (
      <span
        className={cn('font-mono text-muted-foreground tabular', type, className)}
        aria-label='Loading time remaining'
      >
        --:--:--
      </span>
    );
  }

  const urgent = remaining <= URGENT_FROM_MS;
  const closing = remaining <= BRASS_FROM_MS;

  return (
    <span className={cn('inline-flex items-baseline', className)}>
      <span
        // Announcing a value that changes every second would make a screen
        // reader unusable; the milestones below carry the information instead.
        aria-hidden='true'
        className={cn(
          'font-mono font-medium tabular',
          type,
          urgent
            ? 'text-paddle animate-hammer-pulse'
            : closing
              ? 'text-brass'
              : 'text-foreground'
        )}
      >
        {formatCountdown(remaining)}
      </span>
      <ClockAnnouncement remaining={remaining} />
    </span>
  );
};

/** Speaks only when the lot crosses a threshold worth interrupting for. */
const ClockAnnouncement = ({ remaining }: { remaining: number }) => {
  const minutes = Math.floor(remaining / 60_000);
  const milestone =
    minutes === 60 ? 'One hour left' : minutes === 5 ? 'Five minutes left' : null;

  return (
    <span className='sr-only' role='status' aria-live='polite'>
      {milestone}
    </span>
  );
};

export default HammerClock;
