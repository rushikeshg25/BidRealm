import { afterEach, describe, expect, it, vi } from 'vitest';
import { Auctionschema } from './auction';

const lot = () => ({
  title: 'A test lot',
  description: 'An item for auction',
  startingPrice: 100,
  category: 'ART',
  startDate: new Date('2026-11-01T10:00:00Z'),
  endDate: new Date('2026-11-02T10:00:00Z'),
});

afterEach(() => vi.useRealTimers());

describe('auction form and server validation', () => {
  it('accepts form dates and coerces serialized dates at the server boundary', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-11-01T09:00:00Z'));
    expect(Auctionschema.parse(lot()).startingPrice).toBe(100);
    expect(Auctionschema.parse(JSON.parse(JSON.stringify(lot()))).startDate).toEqual(lot().startDate);
  });

  it.each([0, -1, 1.5, NaN, Infinity, '100'])('rejects an invalid starting price: %s', (startingPrice) => {
    vi.useFakeTimers().setSystemTime(new Date('2026-11-01T09:00:00Z'));
    expect(Auctionschema.safeParse({ ...lot(), startingPrice }).success).toBe(false);
  });

  it('keeps category errors readable after the Zod upgrade', () => {
    const result = Auctionschema.safeParse({ ...lot(), category: 'UNKNOWN' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Pick a category');
  });

  it('rejects auctions ending before they start', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-11-01T09:00:00Z'));
    expect(Auctionschema.safeParse({ ...lot(), endDate: new Date('2026-11-01T09:30:00Z') }).success).toBe(false);
  });
});
