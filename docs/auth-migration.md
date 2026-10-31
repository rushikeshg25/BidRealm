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
