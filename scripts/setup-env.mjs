import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const services = ['apps/client', 'apps/server', 'packages/db'];
const existingSecrets = services.slice(0, 2).flatMap((service) => {
  const path = new URL(`${service}/.env`, root);
  if (!existsSync(path)) return [];
  const match = readFileSync(path, 'utf8').match(/^AUTH_SECRET=["']?([^"'\r\n]+)["']?$/m);
  return match ? [match[1]] : [];
});
if (new Set(existingSecrets).size > 1) {
  throw new Error('Client and server AUTH_SECRET values differ. Align them before setup.');
}
const secret = existingSecrets[0] ?? randomBytes(32).toString('hex');
for (const service of services) {
  const destination = new URL(`${service}/.env`, root);
  if (existsSync(destination)) {
    console.log(`Kept ${service}/.env`);
    continue;
  }
  const template = readFileSync(new URL(`${service}/.env.example`, root), 'utf8');
  writeFileSync(destination, template.replace(/^AUTH_SECRET=$/m, `AUTH_SECRET=${secret}`), {
    flag: 'wx', mode: 0o600,
  });
  console.log(`Created ${fileURLToPath(destination)}`);
}
