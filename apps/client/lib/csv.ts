/**
 * A small CSV builder, replacing export-to-csv. The old call passed a
 * JSON.stringify'd string where the library expected an array of objects --
 * which is what the @ts-ignore above it was hiding -- so the export produced
 * garbage.
 */
export const toCsv = <T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T & string; header: string }[]
): string => {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const text = value instanceof Date ? value.toISOString() : String(value);
    // Quote anything that would otherwise break the row apart, and double up
    // embedded quotes.
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    columns.map((column) => escape(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column.key])).join(',')),
  ].join('\r\n');
};

/** Hands the browser a file. No-op outside a browser. */
export const downloadCsv = (filename: string, contents: string) => {
  if (typeof document === 'undefined') return;

  const blob = new Blob([`﻿${contents}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
