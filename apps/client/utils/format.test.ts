import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  formatCountdown,
  formatMoney,
  formatMoneyShort,
  timeLeft,
} from './format';

afterEach(() => vi.useRealTimers());

describe('formatMoneyShort', () => {
  // The previous implementation divided the 1e5-1e7 band by 1,000,000 and
  // labelled the result "L", so a lakh rendered as "0.1L".
  it('renders one lakh as 1L, not 0.1L', () => {
    expect(formatMoneyShort(100_000)).toBe('₹1L');
  });

  it.each([
    [999, '₹999'],
    [1_000, '₹1K'],
    [12_500, '₹12.5K'],
    [99_999, '₹99.99K'],
    [100_000, '₹1L'],
    [420_000, '₹4.2L'],
    [3_000_000, '₹30L'],
    [10_000_000, '₹1Cr'],
    [25_000_000, '₹2.5Cr'],
  ])('renders %i as %s', (amount, expected) => {
    expect(formatMoneyShort(amount)).toBe(expected);
  });

  it('never leaves a trailing zero or a bare decimal point', () => {
    for (const amount of [1_000, 100_000, 10_000_000, 2_000_000]) {
      expect(formatMoneyShort(amount)).not.toMatch(/\.0|\.$/);
    }
  });

  it('groups small amounts the Indian way', () => {
    expect(formatMoneyShort(0)).toBe('₹0');
  });
});

describe('formatMoney', () => {
  it('shows an exact amount, because a bid is a number to match', () => {
    expect(formatMoney(420_000)).toContain('4,20,000');
  });

  it('does not show paise', () => {
    expect(formatMoney(1_500)).not.toContain('.');
  });
});

describe('formatCountdown', () => {
  // Fixed width matters: the clock is set in a mono face and must not jitter
  // as the digits change.
  it.each([
    [0, '00:00:00'],
    [1_000, '00:00:01'],
    [59_000, '00:00:59'],
    [60_000, '00:01:00'],
    [3_600_000, '01:00:00'],
    [14_727_000, '04:05:27'],
  ])('renders %ims as %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });

  it('adds days only once there are any', () => {
    expect(formatCountdown(86_400_000 + 3_661_000)).toBe('1d 01:01:01');
    expect(formatCountdown(86_399_000)).toBe('23:59:59');
  });

  it('floors at zero rather than counting backwards', () => {
    expect(formatCountdown(-5_000)).toBe('00:00:00');
  });

  it('keeps the clock a fixed width below a day', () => {
    for (const ms of [0, 1_000, 61_000, 3_599_000, 86_399_000]) {
      expect(formatCountdown(ms)).toHaveLength(8);
    }
  });
});

describe('timeLeft', () => {
  it('counts down to the end date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T10:00:00Z'));

    expect(timeLeft(new Date('2026-03-12T10:05:00Z'))).toBe(300_000);
  });

  it('is zero once the end date has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T10:00:00Z'));

    expect(timeLeft(new Date('2026-03-12T09:00:00Z'))).toBe(0);
  });
});
