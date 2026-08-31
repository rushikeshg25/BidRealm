import { z } from 'zod';

/** Frames the client may send. */
export const BID = 'bid';

/** Frames the server sends. */
export const JOINED = 'JOINED';
export const TIME_LEFT = 'TIME_LEFT';
export const BID_PLACED = 'BID';
export const BID_ACCEPTED = 'BID_ACCEPTED';
export const BID_REJECTED = 'BID_REJECTED';
export const AUCTION_ENDED = 'AUCTION_ENDED';
export const ERROR = 'ERROR';

/**
 * Everything arriving over the socket is untrusted input. The previous handler
 * called JSON.parse and read `.amount` straight off the result, so a malformed
 * frame threw inside the listener.
 */
export const incomingMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(BID),
    // Money is whole rupees. Reject NaN, Infinity, negatives and decimals here
    // rather than letting them reach the database.
    amount: z.number().int().positive().finite(),
  }),
]);

export type IncomingMessage = z.infer<typeof incomingMessageSchema>;

export const parseIncomingMessage = (
  raw: string
): { ok: true; message: IncomingMessage } | { ok: false; error: string } => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Message was not valid JSON.' };
  }

  const parsed = incomingMessageSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: 'Unrecognised message.' };

  return { ok: true, message: parsed.data };
};
