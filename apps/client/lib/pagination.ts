export type PageItem = number | 'ellipsis';

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/**
 * A compact page list: first, last, the current page and its neighbours, with
 * long runs collapsed into a gap. The old control rendered one link per page
 * with no windowing at all, so a few hundred lots produced a few hundred links.
 *
 * The window widens against whichever edge the current page is near, so the
 * control keeps a steady width instead of collapsing to three items on page 1.
 */
export const pageWindow = (
  current: number,
  total: number,
  siblings = 1
): PageItem[] => {
  if (total <= 0) return [];

  const page = Math.min(Math.max(current, 1), total);
  // first + last + current + siblings on each side + a gap on each side
  const slots = siblings * 2 + 5;
  if (total <= slots) return range(1, total);

  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, total);
  // A gap standing in for a single page wastes the space it saves.
  const gapLeft = left > 2;
  const gapRight = right < total - 1;

  if (!gapLeft && gapRight) {
    return [...range(1, siblings * 2 + 3), 'ellipsis', total];
  }
  if (gapLeft && !gapRight) {
    return [1, 'ellipsis', ...range(total - (siblings * 2 + 2), total)];
  }

  return [1, 'ellipsis', ...range(left, right), 'ellipsis', total];
};
