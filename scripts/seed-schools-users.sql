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

INSERT INTO school.permissions (code, description)
VALUES
  ('INVITE_MEMBER', NULL),
  ('SUSPEND_MEMBER', NULL),
  ('CANCEL_SUSPENSION', NULL),
  ('REVOKE_MEMBER', NULL),
  ('VIEW_MEMBERS', NULL),
  ('VIEW_MEMBER_DETAILS', NULL),
  ('MANAGE_ROLES', NULL),
  ('ASSIGN_ROLES', NULL),
  ('MANAGE_DOCUMENTS', NULL),
  ('SHARE_DOCUMENTS', NULL),
  ('VIEW_METRICS', NULL),
  ('UPDATE_SCHOOL', NULL),
  ('CHANGE_MEMBER_ROLE', NULL)
ON CONFLICT (code) DO NOTHING;

INSERT INTO school.school_roles (
  school_id,
  "key",
  name,
  description,
  is_system,
  created_at,
  updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'SCHOOL_ADMIN',
    'Administrateur école',
    'Administre l''école, ses membres, ses rôles et ses documents',
    TRUE,
    1789257600000,
    1789257600000
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'STAFF',
    'Personnel',
    'Personnel de l''école : procédures, normes et manuels internes',
    TRUE,
    1789257600000,
    1789257600000
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'SCHOOL_ADMIN',
    'Administrateur école',
    'Administre l''école, ses membres, ses rôles et ses documents',
    TRUE,
    1789257600000,
    1789257600000
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'STAFF',
    'Personnel',
    'Personnel de l''école : procédures, normes et manuels internes',
    TRUE,
    1789257600000,
    1789257600000
  )
ON CONFLICT (school_id, "key") WHERE "key" IS NOT NULL DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  updated_at = EXCLUDED.updated_at;

INSERT INTO school.school_role_permissions (school_role_id, permission_id)
SELECT r.id, p.id
FROM school.school_roles AS r
CROSS JOIN school.permissions AS p
WHERE r."key" = 'SCHOOL_ADMIN'
  AND r.school_id IN (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  )
ON CONFLICT (school_role_id, permission_id) DO NOTHING;

INSERT INTO school.school_role_permissions (school_role_id, permission_id)
SELECT r.id, p.id
FROM school.school_roles AS r
JOIN school.permissions AS p ON p.code = 'VIEW_MEMBERS'
WHERE r."key" = 'STAFF'
  AND r.school_id IN (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  )
ON CONFLICT (school_role_id, permission_id) DO NOTHING;

INSERT INTO school.school_memberships (
  id,
  school_id,
  user_id,
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
  status = EXCLUDED.status,
  granted_by = EXCLUDED.granted_by,
  granted_at = EXCLUDED.granted_at,
  revoked_at = EXCLUDED.revoked_at,
  revoked_by = EXCLUDED.revoked_by;

INSERT INTO school.school_membership_roles (membership_id, school_role_id)
SELECT m.id, r.id
FROM school.school_memberships AS m
JOIN school.school_roles AS r ON r.school_id = m.school_id
WHERE (m.school_id, m.user_id, r."key") IN (
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'SCHOOL_ADMIN'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    'STAFF'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '44444444-4444-4444-8444-444444444444',
    'STAFF'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '33333333-3333-4333-8333-333333333333',
    'SCHOOL_ADMIN'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '44444444-4444-4444-8444-444444444444',
    'STAFF'
  )
)
ON CONFLICT (membership_id, school_role_id) DO NOTHING;

COMMIT;

SELECT
  m.school_id,
  s.name AS school_name,
  u.id AS user_id,
  u.email,
  r."key" AS role,
  m.status AS membership_status
FROM school.school_memberships AS m
JOIN school.schools AS s ON s.id = m.school_id
JOIN "user"."users" AS u ON u.id::uuid = m.user_id::uuid
JOIN school.school_membership_roles AS mr ON mr.membership_id::uuid = m.id::uuid
JOIN school.school_roles AS r ON r.id = mr.school_role_id
ORDER BY s.name, u.email, role;