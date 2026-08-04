/**
 * The one copy of these formatters.
 *
 * formatMoney was duplicated verbatim in AuctionCardComponent, AuctionCard and
 * Auction, and formatTime in AuctionTimer -- four and two copies respectively,
 * each carrying the same bugs.
 */

const LAKH = 100_000;
const CRORE = 10_000_000;

/** Trims a trailing ".0" so 15 lakh reads "15L", not "15.0L". */
const trim = (value: number): string =>
  value.toFixed(1).replace(/\.0$/, '');

/**
 * Indian short-scale money: 10K, 1.5L, 2.4Cr.
 *
 * The previous version divided by 1_000_000 in the lakh branch instead of
 * 100_000, so 150,000 rendered as "0.15L" rather than "1.5L" -- every price
 * between one lakh and one crore was displayed an order of magnitude too small.
 * It also had no rounding, so 15,234 came out as "15.234K".
 */
export const formatMoney = (amount: number): string => {
  if (!Number.isFinite(amount)) return '0';

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= CRORE) return `${sign}${trim(abs / CRORE)}Cr`;
  if (abs >= LAKH) return `${sign}${trim(abs / LAKH)}L`;
  if (abs >= 10_000) return `${sign}${trim(abs / 1_000)}K`;

  return `${sign}${Math.round(abs).toLocaleString('en-IN')}`;
};

/** Full precision, for the places that should show the exact figure. */
export const formatMoneyExact = (amount: number): string =>
  Number.isFinite(amount) ? Math.round(amount).toLocaleString('en-IN') : '0';

/**
 * A duration as "2d 4h 13m 09s".
 *
 * The previous version had an unreachable branch: `if (hours === 0)` returned
 * before `if (hours === 0 && minutes === 0)` could ever be tested. Seconds are
 * also zero-padded now, so the string does not change width every tick.
 */
export const formatTime = (milliseconds: number): string => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0s';

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, '0');

  if (days > 0) return `${days}d ${hours}h ${pad(minutes)}m`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
};

export const timeLeft = (endDate: Date | string): number =>
  Math.max(0, new Date(endDate).getTime() - Date.now());
