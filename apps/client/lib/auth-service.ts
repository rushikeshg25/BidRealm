import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { authOptions } from './auth-options';

export const auth = betterAuth({
  ...authOptions,
  // Last plugin: forward auth response cookies from Next server actions.
  plugins: [nextCookies()],
});
