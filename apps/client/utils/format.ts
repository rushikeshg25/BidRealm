/**
 * Exact rupees, grouped the Indian way. Use this anywhere the number is the
 * point -- a current bid, a bid in the ledger, a starting price on the lot
 * page. An amount someone is about to match should never be abbreviated.
 */
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatMoney = (amount: number): string =>
  rupeeFormatter.format(amount);

/**
 * Truncates rather than rounds: rounding pushed 99,999 up to "100K", which
 * reads as a lakh -- a different band, and a higher price than the lot is at.
 */
const short = (value: number) =>
  (Math.floor(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '');

/**
 * Short rupees for dense places like a card grid.
 *
 * The previous implementation divided the 1e5-1e7 band by 1,000,000 and
 * labelled it "L", so a lakh rendered as "0.1L", and it emitted raw floats.
 */
export const formatMoneyShort = (amount: number): string => {
  if (amount >= 10_000_000) return `₹${short(amount / 10_000_000)}Cr`;
  if (amount >= 100_000) return `₹${short(amount / 100_000)}L`;
  if (amount >= 1_000) return `₹${short(amount / 1_000)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * A countdown as fixed-width digits, so a mono clock does not jitter as it
 * ticks. Days appear only once there are any.
 */
export const formatCountdown = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/** Milliseconds until `endDate`, floored at zero. */
export const timeLeft = (endDate: Date | string): number =>
  Math.max(0, new Date(endDate).getTime() - Date.now());
