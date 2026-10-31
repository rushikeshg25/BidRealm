import type { BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import * as argon2 from 'argon2';
import prisma from '@repo/db';
import { authEnv } from '@repo/env';
import { userNameSchema } from '../types/auth';

const env = authEnv();

const validateName = (name: string) => {
  const parsed = userNameSchema.safeParse(name);
  if (!parsed.success) throw new APIError('BAD_REQUEST', { message: 'Enter a username of 1 to 50 characters.' });
  return parsed.data;
};

// Kept separate from the Next cookie plugin so integration tests can exercise
// the real HTTP handler and Prisma adapter without a Next request context.
export const authOptions = {
  appName: 'BidRealm',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql', transaction: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 50,
    password: {
      hash: (password: string) => argon2.hash(password),
      verify: async ({ hash, password }: { hash: string; password: string }) => {
        // Historical demo accounts have placeholder hashes. They must fail
        // authentication without crashing the endpoint.
        if (!hash.startsWith('$argon2')) return false;
        try {
          return await argon2.verify(hash, password);
        } catch {
          return false;
        }
      },
    },
  },
  user: { fields: { name: 'userName' } },
  session: {
    modelName: 'authSession',
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  account: { modelName: 'authAccount' },
  verification: { modelName: 'authVerification' },
  rateLimit: { enabled: true },
  // Explicit settings also keep these protections active under NODE_ENV=test.
  advanced: { disableOriginCheck: false, disableCSRFCheck: false },
  databaseHooks: {
    user: {
      create: { before: async (user) => ({ data: { ...user, name: validateName(user.name) } }) },
      update: { before: async (user) => ({ data: { ...user, ...(user.name !== undefined ? { name: validateName(user.name) } : {}) } }) },
    },
  },
} satisfies BetterAuthOptions;
