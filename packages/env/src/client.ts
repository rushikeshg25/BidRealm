import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Environment for the Next app (apps/client).
 *
 * `NEXT_PUBLIC_WS_URL` is declared under `client` because Next only inlines
 * variables carrying that prefix into the browser bundle. The bid server URL was
 * previously read as `process.env.WS_URL` from a client component, which is
 * always `undefined` in the browser — so every deployment silently fell back to
 * `ws://localhost:8080` and no user could ever connect.
 *
 * Server-only values are skipped in the browser: they are not in the bundle, so
 * validating them there would fail on every page load.
 */
export const clientEnv = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    // uploadthing v7 reads a single token; the AUTH_SECRET in .env.example was
    // never read by anything (Lucia v3 does not use one).
    UPLOADTHING_TOKEN: z.string().min(1),
    WS_TICKET_SECRET: z.string().min(32),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_WS_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    WS_TICKET_SECRET: process.env.WS_TICKET_SECRET,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  skipValidation: typeof window !== "undefined",
  emptyStringAsUndefined: true,
});
