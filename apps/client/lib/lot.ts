import { AuctionStatus, type AuctionStatusT } from '@repo/db/types';

/**
 * What a lot looks like to a visitor, which is not quite its database status:
 * the lifecycle sweep runs every fifteen seconds, so a lot whose end time has
 * just passed is still ACTIVE in the database for a moment. The clock is what
 * people are looking at, so the clock wins.
 */
export type LotState = 'upcoming' | 'live' | 'ended';

export const lotState = (lot: {
  status: AuctionStatusT;
  startDate: Date | string;
  endDate: Date | string;
}): LotState => {
  if (lot.status === AuctionStatus.ENDED || lot.status === AuctionStatus.CANCELLED) {
    return 'ended';
  }

  const now = Date.now();
  if (new Date(lot.endDate).getTime() <= now) return 'ended';
  if (new Date(lot.startDate).getTime() > now) return 'upcoming';
  return 'live';
};

/**
 * One legend, learned once: the rail on a card, the dot in the header and the
 * clock all say the same thing with the same colour.
 */
export const LOT_STATE = {
  live: {
    label: 'Live',
    rail: 'bg-live',
    text: 'text-live',
    dot: 'bg-live',
    chip: 'bg-live/12 text-live',
  },
  ended: {
    label: 'Sold',
    rail: 'bg-brass',
    text: 'text-brass',
    dot: 'bg-brass',
    chip: 'bg-brass/12 text-brass',
  },
  upcoming: {
    label: 'Upcoming',
    rail: 'bg-muted-foreground/40',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground/60',
    chip: 'bg-muted text-muted-foreground',
  },
} as const satisfies Record<
  LotState,
  { label: string; rail: string; text: string; dot: string; chip: string }
>;
