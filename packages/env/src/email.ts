import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Environment for the email notification worker (apps/email-notification-server). */
export const emailEnv = createEnv({
  server: {
    REDIS_HOST: z.string().min(1),
    // `z.number()` here could only ever fail: process.env values are strings.
    REDIS_PORT: z.coerce.number().int().positive(),
    REDIS_PASSWORD: z.string().min(1),
    // Both are read by the worker but were missing from the schema entirely.
    EMAIL_FROM: z.string().email(),
    EMAIL_PASSWORD: z.string().min(1),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
