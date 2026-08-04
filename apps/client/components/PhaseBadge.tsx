import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PHASE_LABELS, type AuctionPhase } from '@/lib/auction';

/**
 * A Live / Upcoming / Ended pill.
 *
 * Nothing in the app showed an auction's state before. The card inferred it three
 * separate times to pick a button label ("View(Sold Out)"), and MyAuctions
 * imported Badge and then never used it -- its Status column ended up showing the
 * price instead.
 */
export const PhaseBadge = ({
  phase,
  className,
}: {
  phase: AuctionPhase;
  className?: string;
}) => (
  <Badge variant={phase} className={cn('gap-1.5 px-2 py-0.5', className)}>
    {phase === 'live' ? (
      // A slow pulse is the cheapest way to make "this is happening right now"
      // legible at a glance in a grid.
      <span
        className='motion-safe-only h-1.5 w-1.5 rounded-full bg-current animate-pulse-live'
        aria-hidden='true'
      />
    ) : null}
    {PHASE_LABELS[phase]}
  </Badge>
);
