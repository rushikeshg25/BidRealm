/**
 * Bidding rules shared by the client (to show the next valid bid and validate
 * the form) and the WebSocket server (to enforce it). Pure functions only --
 * no Prisma import -- so this is safe to pull into a client component.
 */

export const MIN_BID_AMOUNT = 1;

/**
 * Tiered increments, the way a real saleroom runs: a rupee more on a thirty
 * lakh car is not a bid. The step grows with the price so the ladder stays
 * meaningful at every scale.
 */
export const bidIncrement = (currentPrice: number): number => {
  if (currentPrice < 1_000) return 10;
  if (currentPrice < 10_000) return 100;
  if (currentPrice < 100_000) return 500;
  if (currentPrice < 1_000_000) return 2_500;
  return 10_000;
};

/** The floor a new bid has to clear. An auction with no bids opens at its start price. */
export const minimumNextBid = (
  currentPrice: number,
  startingPrice: number
): number => {
  const floor = Math.max(currentPrice, startingPrice);
  return floor + bidIncrement(floor);
};

export type BidRejectionReason =
  | 'NOT_AUTHENTICATED'
  | 'AUCTION_NOT_FOUND'
  | 'NOT_ACTIVE'
  | 'OWN_AUCTION'
  | 'INVALID_AMOUNT'
  | 'TOO_LOW'
  | 'OUTBID';

export const bidRejectionMessage = (
  reason: BidRejectionReason,
  minimum?: number
): string => {
  switch (reason) {
    case 'NOT_AUTHENTICATED':
      return 'Sign in to place a bid.';
    case 'AUCTION_NOT_FOUND':
      return 'This lot is no longer available.';
    case 'NOT_ACTIVE':
      return 'Bidding on this lot is closed.';
    case 'OWN_AUCTION':
      return 'You cannot bid on a lot you listed.';
    case 'INVALID_AMOUNT':
      return 'Enter a whole rupee amount.';
    case 'TOO_LOW':
      return minimum
        ? `Bid at least ₹${minimum.toLocaleString('en-IN')}.`
        : 'Your bid is below the current price.';
    case 'OUTBID':
      return 'Someone bid first. The price has moved.';
  }
};
