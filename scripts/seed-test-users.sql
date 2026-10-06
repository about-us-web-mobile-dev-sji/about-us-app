-- Test users for the about-us application.
-- Run after the application has created the user.users table.
-- PostgreSQL:
--   psql "$DATABASE_URL" -f scripts/seed-test-users.sql

BEGIN;

INSERT INTO "user"."users" (
  "id",
  "firstName",
  "lastName",
  "email",
  "status",
  "globalRole"
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Alice',
    'Martin',
    'alice.test@example.com',
    'ACTIVE',
    'USER'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Paul',
    'Dubois',
    'paul.test@example.com',
    'ACTIVE',
    'USER'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Marie',
    'Bernard',
    'marie.test@example.com',
    'SUSPENDED',
    'USER'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Lucas',
    'Petit',
    'lucas.test@example.com',
    'ACTIVE',
    'USER'
  )
ON CONFLICT ("email") DO UPDATE
SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "status" = EXCLUDED."status",
  "globalRole" = EXCLUDED."globalRole";

COMMIT;

SELECT
  "id",
  "firstName",
  "lastName",
  "email",
  "status",
  "globalRole"
FROM "user"."users"
WHERE "email" IN (
  'alice.test@example.com',
  'paul.test@example.com',
  'marie.test@example.com',
  'lucas.test@example.com'
)
ORDER BY "email";
