# Authentication migration

## 1. Expand the database

Apply `20261031120000_better_auth_expand` before switching application code.
It adds Better Auth tables and user metadata, retains Lucia's `Session` table,
and copies existing password hashes into credential accounts without rehashing.
Existing auction, bid, and user IDs do not change.

Password synchronization triggers keep `User.hashedPassword` and credential
account passwords equal in the same database transaction. This supports old and
new authentication writers during the rollback window. Do not remove the legacy
column or triggers until rollback is no longer needed.

Email addresses become lowercase. The migration stops if two addresses would
collide. It also normalizes later writes from either application version. Letter
case is not restored by an application rollback.

Before a shared-environment rollout, back up the database and verify the restore
procedure. Check for email collisions without exporting account data:

```sql
SELECT count(*) AS collision_groups FROM (
  SELECT lower(email) FROM "User" GROUP BY lower(email) HAVING count(*) > 1
) conflicts;
```

The migration has a five-second lock timeout and a sixty-second statement timeout.
Rehearse against representative data first. A timeout or collision aborts the
transaction; investigate before retrying. This is not a zero-downtime claim.

Verification after migration:

```sql
SELECT count(*) AS mismatches FROM "User" u
LEFT JOIN "AuthAccount" a ON a."userId" = u.id AND a."providerId" = 'credential'
WHERE u."hashedPassword" <> '' AND a.password IS DISTINCT FROM u."hashedPassword";
```

The expected mismatch count is zero. This comparison verifies preservation, not
whether a historical hash is valid. Old sample users contain placeholder hashes
and cannot sign in until their passwords are replaced through a supported flow.

For an application rollback, leave the additive schema and synchronization
triggers in place. Do not delete migrations or drop auth tables from a database
that has received writes. A Git revert does not reverse an applied SQL migration.

## 2. Configure Better Auth

Set `BETTER_AUTH_SECRET` to a random value of at least 32 characters, and set
`BETTER_AUTH_URL` to the application's exact HTTP(S) origin. Keep the existing
`AUTH_SECRET` for WebSocket tickets. Use separate secrets for these purposes.
New local setups generate both secrets; existing `.env` files are left intact.

The Prisma adapter uses transactions. Argon2 verifies existing hashes and hashes
new passwords with the same library. The session cache is disabled so protected
server operations read current database session state. Schema/configuration
commits alone do not switch the application's authentication flow.

## 3. Switch the application

Deploy the schema and configuration before the integration commit. Sign-up,
sign-in, and sign-out use Better Auth's same-origin HTTP endpoints, including its
origin, CSRF, and rate-limit middleware. Protected server operations read the
Better Auth session; the navbar receives only a boolean, never the session token.

Existing Lucia cookies are not accepted. Users must sign in again with their
existing email and password. New and changed passwords remain readable by the
legacy implementation through the synchronization triggers.

To roll back the integration, pause authentication traffic, restore the prior
application version, and invalidate both session sets before resuming traffic.
Do not revive legacy sessions that predate a Better Auth logout or password
change. In the target environment, an authorized operator can expire sessions:

```sql
BEGIN;
UPDATE "Session" SET "expiresAt" = now() WHERE "expiresAt" > now();
UPDATE "AuthSession" SET "expiresAt" = now() WHERE "expiresAt" > now();
COMMIT;
```

Users sign in again after rollback. Keep the expanded database schema and password
triggers. Revert auth commits in reverse order; configuration/dependency removal
must follow application rollback, not precede it. Later application writes remain
in the database, and no down migration is required.

## 4. Verify and operate

Run `yarn test:auth` with a dedicated local `AUTH_TEST_DATABASE_URL` whose database
name ends in `_auth_test`. The suite applies migrations and exercises the real
HTTP handler and PostgreSQL adapter. It checks legacy Argon2 login, registration,
session revocation, expired/forged/legacy cookies, password synchronization in
both directions, duplicate usernames, invalid input, origin rejection, and rate
limiting. Each run removes only users created by that run. CI runs this suite
against a separate PostgreSQL database.

Local verification also covered the running Next.js app: registration, protected
page rendering, WebSocket ticket issuance and authenticated handshake, logout,
and rejection of new tickets from a revoked session. Existing signed WebSocket
tickets remain valid for their 60-second lifetime; this migration does not add
immediate revocation to already-open auction sockets.

The built-in rate limiter uses process-local memory. Before running multiple app
instances, choose shared rate-limit storage and configure the trusted proxy to
replace forwarded client-IP headers. No email-verification or password-reset
mail delivery is configured by this migration. SMTP auction notifications are
separate from authentication email.

Revert order:

1. Verification/documentation commit, if desired; reverting tests does not undo runtime behavior.
2. Application integration commit, after the session-expiration procedure above.
3. Better Auth configuration/dependency commit, once no running version imports it.
4. Schema source commit only after planning a separate database cleanup. Leave the applied migration and tables intact during rollback.

The schema expansion is intentionally retained in the database. Do not run an
older Prisma migration command against history with the applied auth migration
removed. Restore that migration file when operating the database, or maintain the
expanded schema until a separate, reviewed cleanup is safe.

The fifth auth-related commit declares the required build environment variables
in `turbo.json`. This matters in CI and deployments that inject variables instead
of loading `.env` files. Keep that commit while Better Auth is active. It was
verified by building an exported checkout with CI placeholders and no `.env`
files. Reverting it first can break builds even though local development still
works, so remove it only after rolling back the application integration.
