import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('Set AUTH_TEST_DATABASE_URL to a dedicated local database ending in _auth_test.');
const url = new URL(databaseUrl);
if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !url.pathname.endsWith('_auth_test')) {
  throw new Error('Auth tests require a loopback PostgreSQL database ending in _auth_test.');
}
const env = { ...process.env, DATABASE_URL: databaseUrl };
for (const args of [
  ['yarn', '--cwd', 'packages/db', 'prisma', 'migrate', 'deploy'],
  ['yarn', 'vitest', 'run', '--config', 'apps/client/vitest.integration.config.mts'],
]) {
  const result = spawnSync('corepack', args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
