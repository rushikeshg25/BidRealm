import { describe, expect, it, vi, afterEach } from 'vitest';
import { createTicket, verifyTicket, TICKET_TTL_MS } from './index';

const SECRET = 'a-secret-at-least-16-chars-long';
const USER = 'user_123';
const AUCTION = 'auction_abc';

afterEach(() => vi.useRealTimers());

describe('verifyTicket', () => {
  it('accepts a ticket it just minted and returns the signed identity', () => {
    const payload = verifyTicket(createTicket(USER, AUCTION, SECRET), AUCTION, SECRET);

    expect(payload).not.toBeNull();
    expect(payload?.u).toBe(USER);
    expect(payload?.a).toBe(AUCTION);
  });

  it('rejects a ticket signed with a different secret', () => {
    const ticket = createTicket(USER, AUCTION, 'some-other-secret-value');

    expect(verifyTicket(ticket, AUCTION, SECRET)).toBeNull();
  });

  // The whole point of the ticket: a bidder must not be able to edit the user
  // id it carries, which is exactly what the old query-string identity allowed.
  it('rejects a ticket whose payload was edited', () => {
    const ticket = createTicket(USER, AUCTION, SECRET);
    const [body, signature] = ticket.split('.');
    const tampered = JSON.parse(Buffer.from(body!, 'base64url').toString());
    tampered.u = 'someone_else';
    const forged = `${Buffer.from(JSON.stringify(tampered)).toString('base64url')}.${signature}`;

    expect(verifyTicket(forged, AUCTION, SECRET)).toBeNull();
  });

  it('rejects a ticket minted for a different auction', () => {
    const ticket = createTicket(USER, 'auction_other', SECRET);

    expect(verifyTicket(ticket, AUCTION, SECRET)).toBeNull();
  });

  it('rejects a ticket that has expired', () => {
    vi.useFakeTimers();
    const ticket = createTicket(USER, AUCTION, SECRET);

    vi.advanceTimersByTime(TICKET_TTL_MS + 1);

    expect(verifyTicket(ticket, AUCTION, SECRET)).toBeNull();
  });

  it('still accepts a ticket a moment before it expires', () => {
    vi.useFakeTimers();
    const ticket = createTicket(USER, AUCTION, SECRET);

    vi.advanceTimersByTime(TICKET_TTL_MS - 1_000);

    expect(verifyTicket(ticket, AUCTION, SECRET)).not.toBeNull();
  });

  // A spectator connects with no ticket at all, and malformed input arrives
  // from the open internet; neither may throw.
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty', ''],
    ['no separator', 'notaticket'],
    ['empty signature', 'body.'],
    ['unparseable body', `${Buffer.from('not json').toString('base64url')}.sig`],
    ['signature of the wrong length', 'body.short'],
  ])('returns null for %s rather than throwing', (_label, ticket) => {
    expect(() => verifyTicket(ticket as string | null, AUCTION, SECRET)).not.toThrow();
    expect(verifyTicket(ticket as string | null, AUCTION, SECRET)).toBeNull();
  });
});
