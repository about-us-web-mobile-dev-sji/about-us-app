BEGIN;

ALTER TABLE auth.auth_sessions
  ADD COLUMN IF NOT EXISTS "refreshTokenHash" text,
  ADD COLUMN IF NOT EXISTS "clientType" text NOT NULL DEFAULT 'WEB';

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_refresh_token_hash_unique
  ON auth.auth_sessions ("refreshTokenHash");

-- Legacy refresh JWTs cannot be converted into opaque client-held secrets.
UPDATE auth.auth_sessions
SET status = 'REVOKED',
    "revokedAt" = GREATEST((EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint, "lastActivityAt"),
    "revocationReason" = 'auth transport migration'
WHERE "refreshTokenHash" IS NULL AND status = 'ACTIVE';

COMMIT;
