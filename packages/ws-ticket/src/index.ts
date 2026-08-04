import { createHmac, timingSafeEqual } from "crypto";

/**
 * The bid server used to take its identity straight off the query string:
 *
 *   const userId = queries.userId as string;
 *   auctionManager.addUsertoAuction(new User(ws, userId, auctionId));
 *
 * Nothing verified that value, so anyone could connect as any user and place
 * bids on their behalf. A ticket fixes that: the Next app, which already holds a
 * validated Lucia session, mints a short-lived HMAC over
 * `userId:auctionId:expiry` and the bid server verifies it with the same secret.
 *
 * A ticket is used rather than the Lucia session cookie because the cookie is
 * not sent on a cross-origin websocket handshake in production, and rather than
 * handing the raw session id to client JS because that is a long-lived
 * credential an XSS could exfiltrate. A ticket is scoped to one auction and
 * expires in under a minute.
 */

const TICKET_TTL_MS = 30_000;
const SEPARATOR = ":";

export type TicketPayload = {
  userId: string;
  auctionId: string;
};

const sign = (body: string, secret: string): string =>
  createHmac("sha256", secret).update(body).digest("base64url");

/**
 * `timingSafeEqual` throws when the buffers differ in length, and comparing
 * lengths first would itself leak. Hash both sides to a fixed width before
 * comparing so the comparison is constant-time for any input.
 */
const signaturesMatch = (a: string, b: string, secret: string): boolean => {
  const left = createHmac("sha256", secret).update(a).digest();
  const right = createHmac("sha256", secret).update(b).digest();
  return timingSafeEqual(left, right);
};

const assertNoSeparator = (value: string, field: string): void => {
  if (value.includes(SEPARATOR)) {
    throw new Error(`ws-ticket: ${field} must not contain "${SEPARATOR}"`);
  }
};

export const createTicket = (
  { userId, auctionId }: TicketPayload,
  secret: string,
  now: number = Date.now()
): string => {
  if (!secret) throw new Error("ws-ticket: secret is required");
  assertNoSeparator(userId, "userId");
  assertNoSeparator(auctionId, "auctionId");

  const body = [userId, auctionId, now + TICKET_TTL_MS].join(SEPARATOR);
  return `${body}${SEPARATOR}${sign(body, secret)}`;
};

export type VerifyResult =
  | { ok: true; payload: TicketPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

export const verifyTicket = (
  ticket: string | undefined | null,
  secret: string,
  now: number = Date.now()
): VerifyResult => {
  if (!secret) throw new Error("ws-ticket: secret is required");
  if (!ticket) return { ok: false, reason: "malformed" };

  const parts = ticket.split(SEPARATOR);
  if (parts.length !== 4) return { ok: false, reason: "malformed" };

  const [userId, auctionId, expiresAtRaw, signature] = parts as [
    string,
    string,
    string,
    string,
  ];

  const body = [userId, auctionId, expiresAtRaw].join(SEPARATOR);
  if (!signaturesMatch(signature, sign(body, secret), secret)) {
    return { ok: false, reason: "bad-signature" };
  }

  // Only trust the expiry after the signature checks out, so an attacker cannot
  // extend a ticket's life by editing the timestamp.
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return { ok: false, reason: "malformed" };
  if (expiresAt < now) return { ok: false, reason: "expired" };

  if (!userId || !auctionId) return { ok: false, reason: "malformed" };

  return { ok: true, payload: { userId, auctionId } };
};
