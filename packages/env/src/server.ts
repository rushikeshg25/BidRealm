import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Environment for the realtime bid server (apps/server). */
export const serverEnv = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    // Shared with the Next app, which mints the tickets this server verifies.
    // Long enough that it cannot be brute-forced offline from a captured ticket.
    WS_TICKET_SECRET: z.string().min(32),
    PORT: z.coerce.number().int().positive().default(8080),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
