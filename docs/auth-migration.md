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
