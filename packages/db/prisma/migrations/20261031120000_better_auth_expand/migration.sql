BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT,
ALTER COLUMN "hashedPassword" SET DEFAULT '';

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "password" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthVerification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_providerId_accountId_key" ON "AuthAccount"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "AuthVerification_identifier_idx" ON "AuthVerification"("identifier");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep email lookup consistent with Better Auth's lowercase normalization.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" GROUP BY lower(email) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Email addresses collide after normalization; resolve them before migrating';
  END IF;
END $$;
UPDATE "User" SET email = lower(email) WHERE email <> lower(email);

CREATE FUNCTION bidrealm_normalize_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.email := lower(NEW.email);
  RETURN NEW;
END $$;
CREATE TRIGGER bidrealm_normalize_email
  BEFORE INSERT OR UPDATE OF email ON "User"
  FOR EACH ROW EXECUTE FUNCTION bidrealm_normalize_email();

-- Copy hashes verbatim. No plaintext password or password reset is needed.
INSERT INTO "AuthAccount" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
SELECT 'legacy_' || id, id, 'credential', id, "hashedPassword", "createdAt", "updatedAt"
FROM "User" WHERE "hashedPassword" <> '';

-- Maintain both representations during the rollback window. Conditional writes
-- prevent recursion, and triggers make synchronization atomic for both versions.
CREATE FUNCTION bidrealm_sync_legacy_password() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."hashedPassword" <> '' THEN
    INSERT INTO "AuthAccount" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES ('legacy_' || NEW.id, NEW.id, 'credential', NEW.id, NEW."hashedPassword", now(), now())
    ON CONFLICT ("providerId", "accountId") DO UPDATE
      SET password = EXCLUDED.password, "updatedAt" = now()
      WHERE "AuthAccount".password IS DISTINCT FROM EXCLUDED.password;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bidrealm_sync_legacy_password
  AFTER INSERT OR UPDATE OF "hashedPassword" ON "User"
  FOR EACH ROW EXECUTE FUNCTION bidrealm_sync_legacy_password();

CREATE FUNCTION bidrealm_sync_auth_password() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."providerId" = 'credential' AND NEW.password IS NOT NULL THEN
    UPDATE "User" SET "hashedPassword" = NEW.password
    WHERE id = NEW."userId" AND "hashedPassword" IS DISTINCT FROM NEW.password;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bidrealm_sync_auth_password
  AFTER INSERT OR UPDATE OF password ON "AuthAccount"
  FOR EACH ROW EXECUTE FUNCTION bidrealm_sync_auth_password();

COMMIT;
