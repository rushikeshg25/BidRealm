import { describe, expect, it } from 'vitest';
import {
  bidIncrement,
  bidRejectionMessage,
  minimumNextBid,
} from './auction-rules';

describe('bidIncrement', () => {
  // The ladder has to stay meaningful at both ends: ten rupees is a real step
  // on a nine-hundred-rupee lot and noise on a three-crore one.
  it.each([
    [0, 10],
    [999, 10],
    [1_000, 100],
    [9_999, 100],
    [10_000, 500],
    [99_999, 500],
    [100_000, 2_500],
    [999_999, 2_500],
    [1_000_000, 10_000],
    [30_000_000, 10_000],
  ])('steps by %i -> %i', (price, expected) => {
    expect(bidIncrement(price)).toBe(expected);
  });

  it('never returns a step of zero', () => {
    for (const price of [0, 1, 500, 50_000, 5_000_000]) {
      expect(bidIncrement(price)).toBeGreaterThan(0);
    }
  });
});

describe('minimumNextBid', () => {
  it('opens at the starting price plus one step when nobody has bid', () => {
    expect(minimumNextBid(0, 10_000)).toBe(10_500);
  });

  // Legacy rows seeded currentPrice as 0 while carrying a real starting price,
  // so the floor has to be the larger of the two or a lot could be bought for
  // a tenner.
  it('uses the starting price when it is above the current price', () => {
    expect(minimumNextBid(0, 3_000_000)).toBe(3_010_000);
  });

  it('uses the current price once bidding has moved past the start', () => {
    expect(minimumNextBid(50_000, 10_000)).toBe(50_500);
  });

  it('always exceeds what has already been bid', () => {
    for (const price of [1, 999, 1_000, 99_999, 4_200_000]) {
      expect(minimumNextBid(price, 0)).toBeGreaterThan(price);
    }
  });
});

describe('bidRejectionMessage', () => {
  it('quotes the minimum when it knows it', () => {
    expect(bidRejectionMessage('TOO_LOW', 10_500)).toContain('10,500');
  });

  it('falls back to a general message when it does not', () => {
    expect(bidRejectionMessage('TOO_LOW')).toBe(
      'Your bid is below the current price.'
    );
  });

  it('gives every reason a message that reads as an instruction', () => {
    const reasons = [
      'NOT_AUTHENTICATED',
      'AUCTION_NOT_FOUND',
      'NOT_ACTIVE',
      'OWN_AUCTION',
      'INVALID_AMOUNT',
      'TOO_LOW',
      'OUTBID',
    ] as const;

    for (const reason of reasons) {
      const message = bidRejectionMessage(reason);
      expect(message.length).toBeGreaterThan(0);
      expect(message.endsWith('.')).toBe(true);
    }
  });
});
