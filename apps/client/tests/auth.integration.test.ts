import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { betterAuth } from 'better-auth';
import * as argon2 from 'argon2';
import prisma from '@repo/db';
import { authOptions } from '../lib/auth-options';

const auth = betterAuth(authOptions);
const domain = `${randomUUID()}.example.invalid`;
let requestId = 0;

const request = (path: string, body?: unknown, cookie?: string, origin = 'http://localhost:3000', ip?: string) =>
  auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      'x-forwarded-for': ip ?? `192.0.2.${++requestId}`,
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));

const cookieFrom = (response: Response) => response.headers.getSetCookie()
  .map((cookie) => cookie.split(';')[0]).join('; ');

const createUser = async (label: string) => {
  const email = `${label}@${domain}`;
  const password = `Test-${randomUUID()}`;
  const response = await request('/sign-up/email', { name: `${label}-${domain.slice(0, 8)}`, email, password });
  expect(response.status).toBe(200);
  const data = await response.json();
  return { email, password, data, cookie: cookieFrom(response), response };
};

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${domain}` } } });
  await prisma.$disconnect();
});

describe('Better Auth with PostgreSQL and real HTTP middleware', () => {
  it('signs in legacy Argon2 accounts and preserves identity and hashes', async () => {
    const password = `Legacy-${randomUUID()}`;
    const hash = await argon2.hash(password);
    const id = randomUUID();
    const email = `legacy@${domain}`;
    await prisma.user.create({ data: { id, userName: id, email: email.toUpperCase(), hashedPassword: hash } });
    const account = await prisma.authAccount.findUnique({ where: { providerId_accountId: { providerId: 'credential', accountId: id } } });
    expect(account?.password).toBe(hash);
    const response = await request('/sign-in/email', { email, password });
    expect(response.status).toBe(200);
    expect((await response.json()).user.id).toBe(id);
    const session = await request('/get-session', undefined, cookieFrom(response));
    expect((await session.json()).user.id).toBe(id);
  });

  it('registers, reads a session, signs out, and rejects the revoked cookie', async () => {
    const { cookie, data, password, response } = await createUser('new');
    expect(cookie).toContain('better-auth.session_token=');
    expect(response.headers.getSetCookie().some((value) => /httponly/i.test(value))).toBe(true);
    expect(data.user).not.toHaveProperty('hashedPassword');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: data.user.id } });
    expect(await argon2.verify(user.hashedPassword, password)).toBe(true);
    const account = await prisma.authAccount.findFirstOrThrow({ where: { userId: user.id, providerId: 'credential' } });
    expect(account.password).toBe(user.hashedPassword);
    expect((await (await request('/get-session', undefined, cookie)).json()).user.id).toBe(user.id);
    expect((await request('/sign-out', {}, cookie)).status).toBe(200);
    expect(await (await request('/get-session', undefined, cookie)).json()).toBeNull();
  });

  it('keeps old and new password changes compatible for rollback', async () => {
    const { data, password, cookie, email } = await createUser('password');
    const newPassword = `Updated-${randomUUID()}`;
    const changed = await request('/change-password', { currentPassword: password, newPassword, revokeOtherSessions: true }, cookie);
    expect(changed.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: data.user.id } });
    expect(await argon2.verify(user.hashedPassword, newPassword)).toBe(true);
    const legacyPassword = `Rollback-${randomUUID()}`;
    await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: await argon2.hash(legacyPassword) } });
    expect((await request('/sign-in/email', { email, password: legacyPassword })).status).toBe(200);
    expect((await request('/sign-in/email', { email, password: newPassword })).status).toBe(401);
  });

  it('rejects untrusted origins before creating an account', async () => {
    const email = `cross-origin@${domain}`;
    const response = await request('/sign-up/email', { name: 'attacker', email, password: `Test-${randomUUID()}` }, undefined, 'https://untrusted.example');
    expect(response.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('enforces password and username validation at the HTTP boundary', async () => {
    for (const body of [
      { name: 'valid', email: `short@${domain}`, password: 'short' },
      { name: ' ', email: `blank-name@${domain}`, password: `Test-${randomUUID()}` },
      { name: 'x'.repeat(51), email: `long-name@${domain}`, password: `Test-${randomUUID()}` },
    ]) expect((await request('/sign-up/email', body)).status).toBe(400);
  });

  it('rejects tampered, expired, and legacy cookies', async () => {
    const { cookie, data } = await createUser('expired');
    await prisma.authSession.updateMany({ where: { userId: data.user.id }, data: { expiresAt: new Date(0) } });
    expect(await (await request('/get-session', undefined, cookie)).json()).toBeNull();
    expect(await (await request('/get-session', undefined, 'better-auth.session_token=forged')).json()).toBeNull();
    await prisma.session.create({ data: { id: randomUUID(), userId: data.user.id, expiresAt: new Date(Date.now() + 60_000) } });
    const legacy = await prisma.session.findFirstOrThrow({ where: { userId: data.user.id } });
    expect(await (await request('/get-session', undefined, `auth_session=${legacy.id}`)).json()).toBeNull();
  });

  it('rejects duplicate usernames without leaving an orphan user', async () => {
    const existing = await createUser('duplicate');
    const email = `duplicate-second@${domain}`;
    const response = await request('/sign-up/email', {
      name: existing.data.user.name, email, password: `Test-${randomUUID()}`,
    });
    expect(response.ok).toBe(false);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('fails closed for historical placeholder passwords', async () => {
    const id = randomUUID();
    const email = `placeholder@${domain}`;
    await prisma.user.create({ data: { id, userName: id, email, hashedPassword: 'legacy-placeholder' } });
    expect((await request('/sign-in/email', { email, password: 'legacy-placeholder' })).status).toBe(401);
    expect(await prisma.authSession.count({ where: { userId: id } })).toBe(0);
  });

  it('rate limits repeated failed logins', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await request('/sign-in/email', { email: `missing@${domain}`, password: 'invalid-password' }, undefined, undefined, '198.51.100.99')).status);
    }
    expect(statuses).toContain(429);
  });
});
