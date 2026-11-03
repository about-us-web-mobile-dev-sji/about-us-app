-- Replaces the per-school roles and permissions by two fixed roles,
-- ADMIN and MEMBER, stored directly on the membership and the invitation.
-- Run once on a database created before this change, before starting the app
-- with DATABASE_SYNCHRONIZE=false.
BEGIN;

DO $$ BEGIN
  CREATE TYPE school.school_role AS ENUM ('ADMIN', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Memberships: ADMIN when the member held the SCHOOL_ADMIN system role.
ALTER TABLE school.school_memberships
  ADD COLUMN IF NOT EXISTS role school.school_role NOT NULL DEFAULT 'MEMBER';

UPDATE school.school_memberships AS m
SET role = 'ADMIN'
FROM school.school_membership_roles AS link
JOIN school.school_roles AS r ON r.id = link.school_role_id
WHERE link.membership_id = m.id
  AND r."key" = 'SCHOOL_ADMIN';

-- Invitations: ADMIN when they were issued for the SCHOOL_ADMIN role.
ALTER TABLE school.school_invitations
  ADD COLUMN IF NOT EXISTS role school.school_role NOT NULL DEFAULT 'MEMBER';

UPDATE school.school_invitations AS i
SET role = 'ADMIN'
FROM school.school_roles AS r
WHERE r.id = i.role_id
  AND r."key" = 'SCHOOL_ADMIN';

ALTER TABLE school.school_invitations DROP COLUMN IF EXISTS role_id;

DROP TABLE IF EXISTS school.school_membership_roles;
DROP TABLE IF EXISTS school.school_role_permissions;
DROP TABLE IF EXISTS school.school_roles;
DROP TABLE IF EXISTS school.permissions;

COMMIT;

-- School logo URL (optional).
ALTER TABLE school.schools ADD COLUMN IF NOT EXISTS logo varchar(500) NULL;
