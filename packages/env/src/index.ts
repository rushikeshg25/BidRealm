import { z } from 'zod';

/**
 * Every app read bare process.env with `as string` casts, so a missing or
 * malformed variable surfaced as a confusing runtime failure long after boot
 * rather than as a startup error. Each service validates its own slice here and
 * calls it from its entry point, so it fails immediately and says what is wrong.
 */
const parse = <T extends z.ZodRawShape>(
  service: string,
  shape: T
): z.infer<z.ZodObject<T>> => {
  const result = z.object(shape).safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment for ${service}:\n${issues}`);
  }

  return result.data;
};

// Environment variables are always strings, so the old `REDIS_PORT: z.number()`
// could never pass validation. Coerce.
const redisPort = z.coerce.number().int().positive().default(6379);

/** apps/server -- the WebSocket server. */
export const wsServerEnv = () =>
  parse('the WebSocket server', {
    DATABASE_URL: z.string().url(),
    // Must match the secret the Next app signs WebSocket tickets with.
    AUTH_SECRET: z.string().min(16, 'must be at least 16 characters'),
    PORT: z.coerce.number().int().positive().default(8080),
    // Redis is optional here: email enqueueing is fail-soft by design, so a
    // missing queue degrades notifications rather than stopping bidding.
    REDIS_HOST: z.string().min(1).optional(),
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: z.string().optional(),
  });

/** apps/email-notification-server -- the queue worker. */
export const workerEnv = () =>
  parse('the email worker', {
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: z.string().optional(),
    SMTP_HOST: z.string().min(1).default('smtp.ethereal.email'),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    EMAIL_FROM: z.string().email(),
    EMAIL_PASSWORD: z.string().min(1),
  });

/**
 * apps/client, server side only. Browser-visible configuration is not validated
 * here: Next only inlines `process.env.NEXT_PUBLIC_X` where the property is
 * accessed literally, so a dynamic lookup would read as undefined in the bundle.
 * See apps/client/lib/env.ts.
 */
export const nextServerEnv = () =>
  parse('the Next app', {
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(16, 'must be at least 16 characters'),
    UPLOADTHING_TOKEN: z.string().min(1),
  });

/** Better Auth needs an explicit origin and a separate cookie-signing secret. */
export const authEnv = () =>
  parse('Better Auth', {
    BETTER_AUTH_SECRET: z.string().min(32, 'must be at least 32 characters'),
    BETTER_AUTH_URL: z.url().refine((value) => {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
        url.pathname === '/' && !url.search && !url.hash;
    }, 'must be an HTTP(S) origin without a path or credentials'),
  });
