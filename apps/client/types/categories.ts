import { Category } from '@repo/db/types';

/**
 * One source of truth for the enum value and the label shown to people. The
 * create form used to write Title case strings into a free-text column while
 * the seed wrote upper case and this file declared a third set, so category
 * filters could never match.
 */
export const CATEGORIES: { value: Category; label: string }[] = [
  { value: Category.ART, label: 'Art' },
  { value: Category.COLLECTABLES, label: 'Collectables' },
  { value: Category.ELECTRONICS, label: 'Electronics' },
  { value: Category.VEHICLES, label: 'Vehicles' },
  { value: Category.WATCHES, label: 'Watches' },
  { value: Category.FASHION, label: 'Fashion' },
  { value: Category.SHOES, label: 'Shoes' },
  { value: Category.MISCELLANEOUS, label: 'Other' },
];

const LABELS = new Map(CATEGORIES.map(({ value, label }) => [value, label]));

export const categoryLabel = (category: Category): string =>
  LABELS.get(category) ?? 'Other';

export const isCategory = (value: string): value is Category =>
  Object.values(Category).includes(value as Category);

export { Category };
