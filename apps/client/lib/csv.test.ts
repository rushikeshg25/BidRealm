import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

const columns = [
  { key: 'title', header: 'Title' },
  { key: 'price', header: 'Price' },
] as const;

describe('toCsv', () => {
  it('writes a header row followed by the data', () => {
    const csv = toCsv([{ title: 'Mustang', price: 3000000 }], [...columns]);

    expect(csv).toBe('Title,Price\r\nMustang,3000000');
  });

  // A lot title with a comma in it used to split the row in two.
  it('quotes a value containing a comma', () => {
    const csv = toCsv([{ title: 'Watch, gold', price: 1 }], [...columns]);

    expect(csv).toContain('"Watch, gold"');
  });

  it('doubles embedded quotes', () => {
    const csv = toCsv([{ title: 'The "Rare" One', price: 1 }], [...columns]);

    expect(csv).toContain('"The ""Rare"" One"');
  });

  it('quotes a value containing a newline', () => {
    const csv = toCsv([{ title: 'Line one\nLine two', price: 1 }], [...columns]);

    expect(csv).toContain('"Line one\nLine two"');
  });

  it('renders null and undefined as empty rather than the words', () => {
    const csv = toCsv(
      [{ title: null, price: undefined }],
      [...columns] as never
    );

    expect(csv).toBe('Title,Price\r\n,');
  });

  it('writes dates in a form a spreadsheet can parse', () => {
    const csv = toCsv(
      [{ title: 'x', price: new Date('2026-03-12T10:00:00.000Z') }],
      [...columns] as never
    );

    expect(csv).toContain('2026-03-12T10:00:00.000Z');
  });

  it('produces just a header for no rows', () => {
    expect(toCsv([], [...columns] as never)).toBe('Title,Price');
  });
});
