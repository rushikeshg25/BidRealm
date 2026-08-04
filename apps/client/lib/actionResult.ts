/**
 * Every mutating server action returns one of these instead of throwing.
 *
 * The actions previously wrapped their bodies in `try { ... } catch (error) {
 * throw error; }` -- a no-op that added nothing except forwarding raw Prisma
 * errors, schema details included, across the server-action boundary and into
 * the browser. Callers then had nothing structured to render, which is why
 * several mutations showed a hardcoded "Error deleting auction" toast and
 * discarded the actual cause.
 */
export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

export const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

export const succeeded = (): { ok: true } => ({ ok: true });

export const failed = (error: string): { ok: false; error: string } => ({
  ok: false,
  error,
});

/** Message shown when something genuinely unexpected happened. */
export const UNEXPECTED_ERROR =
  'Something went wrong. Please try again in a moment.';

/**
 * Logs the real error server-side and returns a message that is safe to show a
 * user.
 */
export const unexpected = (
  context: string,
  error: unknown
): { ok: false; error: string } => {
  console.error(`[${context}]`, error);
  return failed(UNEXPECTED_ERROR);
};
