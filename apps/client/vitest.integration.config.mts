import { randomBytes } from 'node:crypto';
import { defineConfig } from 'vitest/config';

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('Use yarn test:auth with AUTH_TEST_DATABASE_URL.');
const url = new URL(databaseUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !url.pathname.endsWith('_auth_test')) {
  throw new Error('Auth tests require a dedicated local database ending in _auth_test.');
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/client/tests/*.integration.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_URL: 'http://localhost:3000',
      BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    },
  },
});
