import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The WebSocket server cannot read the Lucia session cookie: it runs on a
 * different origin, so the browser never sends it on the handshake. Passing the
 * session id in the URL instead would leak a long-lived credential into proxy
 * and access logs.
 *
 * So the Next app, which *can* read the cookie, mints a short-lived ticket
 * scoped to one user and one auction, and the WebSocket server verifies it.
 * Signing and verification live together here so the two sides cannot drift.
 */

export const TICKET_TTL_MS = 60_000;

export type TicketPayload = {
  /** User id. */
  u: string;
  /** Auction id the ticket is scoped to. */
  a: string;
  /** Expiry, epoch milliseconds. */
  e: number;
};

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64url');

const sign = (body: string, secret: string) =>
  createHmac('sha256', secret).update(body).digest('base64url');

export const createTicket = (
  userId: string,
  auctionId: string,
  secret: string,
  ttlMs: number = TICKET_TTL_MS
): string => {
  const payload: TicketPayload = { u: userId, a: auctionId, e: Date.now() + ttlMs };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
};

/**
 * Returns the payload for a ticket that is well-formed, correctly signed, not
 * expired, and scoped to `auctionId`. Returns null otherwise -- callers treat a
 * null as "anonymous spectator", never as an error worth crashing over.
 */
export const verifyTicket = (
  ticket: string | undefined | null,
  auctionId: string,
  secret: string
): TicketPayload | null => {
  if (!ticket) return null;

  const [body, signature] = ticket.split('.');
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  // Both are base64url of a 32-byte digest, so lengths match unless the ticket
  // is malformed; timingSafeEqual throws on a length mismatch, hence the guard.
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  let payload: TicketPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload?.u !== 'string' || typeof payload?.a !== 'string') return null;
  if (typeof payload?.e !== 'number' || payload.e < Date.now()) return null;
  if (payload.a !== auctionId) return null;

  return payload;
};
