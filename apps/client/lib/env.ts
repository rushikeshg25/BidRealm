/**
 * Next only inlines a browser-visible variable where the property is accessed
 * literally, so this must stay `process.env.NEXT_PUBLIC_WS_URL` rather than a
 * lookup through a variable.
 *
 * This was previously read as `process.env.WS_URL` inside client components.
 * Without the NEXT_PUBLIC_ prefix the value is never inlined into the bundle,
 * so it was always undefined and always fell through to the localhost default
 * -- real-time bidding silently broke anywhere but a developer's machine.
 */
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';
