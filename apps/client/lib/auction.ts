/**
 * Auction phase, derived from dates in one place.
 *
 * The comparison chain
 *
 *   new Date(auction.startDate) < new Date() && new Date(auction.endDate) > new Date()
 *
 * was written out six times across AuctionCardComponent, Auction and MyAuctions.
 * Beyond the duplication it was evaluated *during render*, which makes it a
 * hydration hazard: `new Date()` on the server and `new Date()` in the browser
 * are different instants, so an auction that crosses a boundary between the two
 * renders different markup on each side. Anything phase-dependent has to be
 * computed after mount -- see useAuctionPhase.
 */

export type AuctionPhase = 'upcoming' | 'live' | 'ended';

export type PhaseDates = {
  startDate: Date | string;
  endDate: Date | string;
};

export const getAuctionPhase = (
  auction: PhaseDates,
  now: Date = new Date()
): AuctionPhase => {
  const start = new Date(auction.startDate).getTime();
  const end = new Date(auction.endDate).getTime();
  const current = now.getTime();

  if (current >= end) return 'ended';
  if (current < start) return 'upcoming';
  return 'live';
};

export const PHASE_LABELS: Record<AuctionPhase, string> = {
  upcoming: 'Upcoming',
  live: 'Live',
  ended: 'Ended',
};

/** The price to display: the live bid once bidding is open, else the reserve. */
export const displayPrice = (
  auction: { startingPrice: number; currentPrice: number },
  phase: AuctionPhase
): number =>
  phase === 'upcoming'
    ? auction.startingPrice
    : Math.max(auction.currentPrice, auction.startingPrice);
