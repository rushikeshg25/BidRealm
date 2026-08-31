import { describe, expect, it } from 'vitest';
import { pageWindow } from './pagination';

describe('pageWindow', () => {
  it('lists every page when they all fit', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('always includes the first and last page', () => {
    const items = pageWindow(50, 100);

    expect(items[0]).toBe(1);
    expect(items[items.length - 1]).toBe(100);
  });

  it('keeps the current page and its neighbours', () => {
    expect(pageWindow(50, 100)).toContain(49);
    expect(pageWindow(50, 100)).toContain(50);
    expect(pageWindow(50, 100)).toContain(51);
  });

  it('collapses long runs into a single gap', () => {
    expect(pageWindow(50, 100)).toEqual([1, 'ellipsis', 49, 50, 51, 'ellipsis', 100]);
  });

  // A gap standing in for one page wastes the space it saves.
  it('shows a lone missing page instead of a gap', () => {
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  // On page 1 the window has to grow to the right, or the control collapses to
  // three items and there is nothing to click.
  it('widens against the edge it is near', () => {
    expect(pageWindow(1, 100)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 100]);
    expect(pageWindow(100, 100)).toEqual([1, 'ellipsis', 96, 97, 98, 99, 100]);
  });

  it('keeps a steady width once the list is long', () => {
    for (const page of [1, 2, 3, 25, 50, 98, 99, 100]) {
      expect(pageWindow(page, 100)).toHaveLength(7);
    }
  });

  it('never repeats a page', () => {
    for (const [current, total] of [[1, 1], [1, 2], [2, 3], [1, 100], [100, 100]]) {
      const numbers = pageWindow(current!, total!).filter(
        (item): item is number => item !== 'ellipsis'
      );
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('stays in order', () => {
    const numbers = pageWindow(50, 100).filter(
      (item): item is number => item !== 'ellipsis'
    );
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });

  it.each([
    [0, 'no pages'],
    [-3, 'a negative count'],
  ])('returns nothing for %i (%s)', (total) => {
    expect(pageWindow(1, total)).toEqual([]);
  });

  it('clamps a current page outside the range', () => {
    expect(pageWindow(999, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(-5, 3)).toEqual([1, 2, 3]);
  });
});
