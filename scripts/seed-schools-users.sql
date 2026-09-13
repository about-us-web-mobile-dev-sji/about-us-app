-- Seed schools, users, and school memberships.
-- Run after the application schema and the school.memberships migration exist.
-- PostgreSQL:
--   psql "$DATABASE_URL" -f scripts/seed-schools-users.sql

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

INSERT INTO school.schools (
  id,
  name,
  address,
  city,
  country,
  status,
  admin_user_id,
  created_at,
  updated_at,
  created_by
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Ecole Centrale de Paris',
    '1 rue de la Science',
    'Paris',
    'France',
    'ACTIVE',
    '11111111-1111-4111-8111-111111111111',
    1789257600000,
    1789257600000,
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Ecole Internationale de Lyon',
    '12 avenue des Lumières',
    'Lyon',
    'France',
    'ACTIVE',
    '33333333-3333-4333-8333-333333333333',
    1789257600000,
    1789257600000,
    '33333333-3333-4333-8333-333333333333'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  status = EXCLUDED.status,
  admin_user_id = EXCLUDED.admin_user_id,
  updated_at = EXCLUDED.updated_at,
  created_by = EXCLUDED.created_by;

INSERT INTO school.memberships (school_id, user_id)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '44444444-4444-4444-8444-444444444444'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-444444444444')
ON CONFLICT (school_id, user_id) DO NOTHING;

COMMIT;

SELECT
  m.school_id,
  s.name AS school_name,
  u.id AS user_id,
  u.email
FROM school.memberships AS m
JOIN school.schools AS s ON s.id = m.school_id
JOIN "user"."users" AS u ON u.id = m.user_id
ORDER BY s.name, u.email;