-- Seed schools, users, roles, and school memberships.
-- Run after the current application schema exists.
-- PostgreSQL:
--   psql "$DATABASE_URL" -f scripts/seed-schools-users.sql



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
  phone_number,
  email,
  website,
  status,
  created_at,
  updated_at,
  created_by
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Ecole Centrale de Paris',
    NULL,
    NULL,
    NULL,
    'ACTIVE',
    1789257600000,
    1789257600000,
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Ecole Internationale de Lyon',
    NULL,
    NULL,
    NULL,
    'ACTIVE',
    1789257600000,
    1789257600000,
    '33333333-3333-4333-8333-333333333333'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  phone_number = EXCLUDED.phone_number,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at,
  created_by = EXCLUDED.created_by;

INSERT INTO school.school_memberships (
  id,
  school_id,
  user_id,
  role,
  status,
  granted_by,
  granted_at,
  revoked_at,
  revoked_by
)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'ADMIN',
    'ACTIVE',
    '11111111-1111-4111-8111-111111111111',
    1789257600000,
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    'MEMBER',
    'ACTIVE',
    '11111111-1111-4111-8111-111111111111',
    1789257600000,
    NULL,
    NULL
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '44444444-4444-4444-8444-444444444444',
    'MEMBER',
    'ACTIVE',
    '11111111-1111-4111-8111-111111111111',
    1789257600000,
    NULL,
    NULL
  ),
  (
    'b1000000-0000-4000-8000-000000000001',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '33333333-3333-4333-8333-333333333333',
    'ADMIN',
    'ACTIVE',
    '33333333-3333-4333-8333-333333333333',
    1789257600000,
    NULL,
    NULL
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '44444444-4444-4444-8444-444444444444',
    'MEMBER',
    'ACTIVE',
    '33333333-3333-4333-8333-333333333333',
    1789257600000,
    NULL,
    NULL
  )
ON CONFLICT (id) DO UPDATE
SET
  school_id = EXCLUDED.school_id,
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  granted_by = EXCLUDED.granted_by,
  granted_at = EXCLUDED.granted_at,
  revoked_at = EXCLUDED.revoked_at,
  revoked_by = EXCLUDED.revoked_by;

COMMIT;

SELECT
  m.school_id,
  s.name AS school_name,
  u.id AS user_id,
  u.email,
  m.role,
  m.status AS membership_status
FROM school.school_memberships AS m
JOIN school.schools AS s ON s.id = m.school_id
JOIN "user"."users" AS u ON u.id::uuid = m.user_id::uuid
ORDER BY s.name, u.email, m.role;