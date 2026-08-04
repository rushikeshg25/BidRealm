/**
 * The single source of truth for auction categories.
 *
 * There were three divergent lists before: a numeric `Categories` enum here (ten
 * members, never imported anywhere), a seven-member uppercase string union in
 * actions/CreateAuction.ts (declared, never used), and a hardcoded title-case
 * array inline in components/Filters.tsx. The stored values are title case, so
 * the filter's uppercase status/category values could never match a row -- one of
 * the reasons filtering returned nothing.
 *
 * `Auction.categories` is a free-form String column (a migration deliberately
 * downgraded it from an enum), so nothing at the database level constrains it.
 * Validation has to happen in the action, against this list.
 */
export const CATEGORIES = [
  'Art',
  'Collectables',
  'Electronics',
  'Vehicles',
  'Watches',
  'Fashion',
  'Shoes',
  'Real Estate',
  'Furniture',
  'Miscellaneous',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const isCategory = (value: unknown): value is Category =>
  typeof value === 'string' && CATEGORIES.includes(value as Category);
