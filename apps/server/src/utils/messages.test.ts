import { describe, expect, it } from 'vitest';
import { parseIncomingMessage } from './messages';

describe('parseIncomingMessage', () => {
  it('accepts a well-formed bid', () => {
    const result = parseIncomingMessage(JSON.stringify({ type: 'bid', amount: 4200 }));

    expect(result).toEqual({ ok: true, message: { type: 'bid', amount: 4200 } });
  });

  // Everything here arrives from the open internet. The previous handler called
  // JSON.parse and read .amount off the result, so any of these threw inside
  // the socket's message listener.
  it.each([
    ['not JSON at all', 'definitely not json'],
    ['an empty string', ''],
    ['a truncated object', '{"type":"bid",'],
  ])('rejects %s without throwing', (_label, raw) => {
    expect(() => parseIncomingMessage(raw)).not.toThrow();
    expect(parseIncomingMessage(raw).ok).toBe(false);
  });

  it.each([
    ['an unknown frame type', { type: 'withdraw', amount: 1 }],
    ['a missing amount', { type: 'bid' }],
    ['a string amount', { type: 'bid', amount: '4200' }],
    ['a negative amount', { type: 'bid', amount: -100 }],
    ['a zero amount', { type: 'bid', amount: 0 }],
    ['a fractional amount', { type: 'bid', amount: 42.5 }],
    ['an infinite amount', { type: 'bid', amount: Number.MAX_VALUE * 2 }],
    ['a null body', null],
    ['an array', [1, 2, 3]],
  ])('rejects %s', (_label, payload) => {
    expect(parseIncomingMessage(JSON.stringify(payload)).ok).toBe(false);
  });

  it('reports unparseable input differently from an unrecognised frame', () => {
    const broken = parseIncomingMessage('{');
    const unknown = parseIncomingMessage(JSON.stringify({ type: 'nope' }));

    expect(broken.ok).toBe(false);
    expect(unknown.ok).toBe(false);
    expect(broken.ok === false && broken.error).not.toBe(
      unknown.ok === false && unknown.error
    );
  });
});
