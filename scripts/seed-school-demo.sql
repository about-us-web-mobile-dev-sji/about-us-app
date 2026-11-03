-- Demo data for a complete school module: users with photos, schools, members,
-- invitations, a space tree and event logs; enough rows to page through.
-- Idempotent (fixed ids derived with md5); run after the schema and migrations:
--   psql "$DATABASE_URL" -f scripts/seed-school-demo.sql
BEGIN;

CREATE TEMP TABLE demo_now AS SELECT (extract(epoch FROM now()) * 1000)::bigint AS ms;
CREATE TEMP TABLE demo_admin AS
  SELECT id::uuid AS id FROM "user".users WHERE "globalRole" = 'SUPER_ADMIN' LIMIT 1;

-- 80 users with a name, an e-mail and a profile photo.
INSERT INTO "user".users (id, "firstName", "lastName", email, status, "globalRole", "avatarUrl")
SELECT md5('demo-user-' || n)::uuid::text,
       (ARRAY['Aïcha','Brice','Carine','Daniel','Estelle','Franck','Grace','Hervé','Inès','Joël',
              'Kevin','Laure','Michel','Nadia','Olivier','Prisca','Rodrigue','Sandrine','Thierry','Vanessa'])[1 + (n - 1) % 20],
       (ARRAY['Mballa','Nkoulou','Tchoupo','Fotso','Ngono','Essomba','Kamga','Bella','Atangana','Djomo',
              'Ewane','Manga','Owona','Tagne','Zambo','Ndzi'])[1 + (n * 7) % 16],
       'demo.user' || lpad(n::text, 2, '0') || '@aboutus.test',
       CASE WHEN n % 17 = 0 THEN 'SUSPENDED' ELSE 'ACTIVE' END::"user".users_status_enum,
       'USER',
       'https://i.pravatar.cc/150?u=' || md5('demo-user-' || n)
FROM generate_series(1, 80) AS n
ON CONFLICT (email) DO UPDATE SET "firstName" = EXCLUDED."firstName", "lastName" = EXCLUDED."lastName",
  "avatarUrl" = EXCLUDED."avatarUrl", status = EXCLUDED.status;

-- 3 schools, created by the platform administrator.
INSERT INTO school.schools (id, name, phone_number, email, website, logo, status, created_at, updated_at, created_by)
SELECT md5('demo-school-' || s.n)::uuid, s.name, s.phone, s.email, s.site,
       'https://ui-avatars.com/api/?background=random&size=128&name=' || replace(s.name, ' ', '+'),
       s.status::school.schools_status_enum,
       (SELECT ms FROM demo_now) - s.n::bigint * 86400000 * 30, (SELECT ms FROM demo_now) - s.n::bigint * 86400000,
       (SELECT id FROM demo_admin)
FROM (VALUES
  (1, 'Lycée Bilingue d''Essos (démo)', '+237 6 90 00 00 01', 'direction@lycee-essos.test', 'lycee-essos.test', 'ACTIVE'),
  (2, 'Collège La Rosière (démo)', '+237 6 90 00 00 02', 'contact@la-rosiere.test', 'la-rosiere.test', 'ACTIVE'),
  (3, 'Institut Polytechnique Nkolbisson (démo)', NULL, 'info@ipn.test', NULL, 'BLOCKED')
) AS s(n, name, phone, email, site, status)
ON CONFLICT (id) DO NOTHING;

-- Memberships: school 1 gets 60 members (3 pages of 20), schools 2 and 3 fewer.
INSERT INTO school.school_memberships (id, school_id, user_id, status, granted_by, granted_at, revoked_at, revoked_by, role)
SELECT md5('demo-membership-' || s || '-' || n)::uuid,
       md5('demo-school-' || s)::uuid,
       md5('demo-user-' || n)::uuid,
       (CASE WHEN n % 11 = 0 THEN 'SUSPENDED' WHEN n % 13 = 0 THEN 'REVOKED' ELSE 'ACTIVE' END)::school.school_memberships_status_enum,
       (SELECT id FROM demo_admin),
       (SELECT ms FROM demo_now) - n::bigint * 3600000 * 7,
       CASE WHEN n % 13 = 0 THEN (SELECT ms FROM demo_now) - n::bigint * 3600000 END,
       CASE WHEN n % 13 = 0 THEN (SELECT id FROM demo_admin) END,
       (CASE WHEN n IN (1, 2, 41, 61) THEN 'ADMIN' ELSE 'MEMBER' END)::school.school_role
FROM (SELECT 1 AS s, n FROM generate_series(1, 60) n
      UNION ALL SELECT 2, n FROM generate_series(41, 72) n
      UNION ALL SELECT 3, n FROM generate_series(61, 80) n) AS m
ON CONFLICT (id) DO NOTHING;

-- Invitations for school 1 (45, all statuses including expired) and school 2.
INSERT INTO school.school_invitations (id, school_id, email, token_hash, status, expires_at, invited_by, created_at, accepted_at, accepted_by, role)
SELECT md5('demo-invitation-' || s || '-' || n)::uuid,
       md5('demo-school-' || s)::uuid,
       'invite' || lpad(n::text, 2, '0') || '.school' || s || '@aboutus.test',
       md5('demo-token-' || s || '-' || n),
       (CASE n % 4 WHEN 1 THEN 'ACCEPTED' WHEN 2 THEN 'CANCELLED' ELSE 'PENDING' END)::school.school_invitations_status_enum,
       -- every 4th pending one is already expired
       (SELECT ms FROM demo_now) + CASE WHEN n % 4 = 0 THEN -86400000::bigint ELSE 86400000::bigint * 7 END,
       CASE WHEN n % 3 = 0 THEN md5('demo-user-' || (CASE s WHEN 1 THEN 1 ELSE 41 END))::uuid ELSE (SELECT id FROM demo_admin) END,
       (SELECT ms FROM demo_now) - n::bigint * 3600000 * 5,
       CASE WHEN n % 4 = 1 THEN (SELECT ms FROM demo_now) - n::bigint * 3600000 END,
       CASE WHEN n % 4 = 1 THEN md5('demo-user-' || n)::uuid END,
       (CASE WHEN n % 10 = 0 THEN 'ADMIN' ELSE 'MEMBER' END)::school.school_role
FROM (SELECT 1 AS s, n FROM generate_series(1, 45) n UNION ALL SELECT 2, n FROM generate_series(1, 15) n) AS i
ON CONFLICT (id) DO NOTHING;

-- Space tree of school 1: root > 3 departments > 4 classes each.
CREATE TEMP TABLE demo_spaces (key text, parent text, name text, kind text, depth int);
INSERT INTO demo_spaces VALUES ('root', NULL, 'Lycée Bilingue d''Essos (démo)', 'SCHOOL_ROOT', 0);
INSERT INTO demo_spaces
SELECT 'dep' || d, 'root', (ARRAY['Sciences','Lettres','Administration'])[d], 'STANDARD', 1 FROM generate_series(1, 3) d;
INSERT INTO demo_spaces
SELECT 'dep' || d || '-c' || c, 'dep' || d,
       (ARRAY['Seconde C','Première D','Terminale C','Terminale D','Seconde A','Première A','Terminale A','Seconde Esp','Secrétariat','Intendance','Surveillance','Vie scolaire'])[(d - 1) * 4 + c],
       'STANDARD', 2
FROM generate_series(1, 3) d, generate_series(1, 4) c;

INSERT INTO spaces.spaces (id, school_id, parent_id, path, depth, kind, name, description, status, version, created_at, updated_at)
SELECT md5('demo-space-' || s.key)::uuid, md5('demo-school-1')::uuid,
       CASE WHEN s.parent IS NOT NULL THEN md5('demo-space-' || s.parent)::uuid END,
       CASE s.depth
         WHEN 0 THEN '/' || md5('demo-space-root')::uuid
         WHEN 1 THEN '/' || md5('demo-space-root')::uuid || '/' || md5('demo-space-' || s.key)::uuid
         ELSE '/' || md5('demo-space-root')::uuid || '/' || md5('demo-space-' || s.parent)::uuid || '/' || md5('demo-space-' || s.key)::uuid
       END,
       s.depth, s.kind::spaces.spaces_kind_enum, s.name, 'Espace de démonstration', 'ACTIVE', 1,
       (SELECT ms FROM demo_now), (SELECT ms FROM demo_now)
FROM demo_spaces s
-- a school has a single root: skip if one was already created by the app
WHERE s.kind <> 'SCHOOL_ROOT'
   OR NOT EXISTS (SELECT 1 FROM spaces.spaces WHERE school_id = md5('demo-school-1')::uuid AND kind = 'SCHOOL_ROOT')
ON CONFLICT (id) DO NOTHING;

-- Each class: one manager and 5 members; each department: one manager.
INSERT INTO spaces.space_memberships (id, space_id, user_id, role, status, granted_by, granted_at)
SELECT md5('demo-space-membership-' || s.key || '-' || u)::uuid, md5('demo-space-' || s.key)::uuid,
       md5('demo-user-' || u)::uuid,
       (CASE WHEN r = 0 THEN 'MANAGER' ELSE 'MEMBER' END)::spaces.space_memberships_role_enum,
       'ACTIVE', (SELECT id FROM demo_admin), (SELECT ms FROM demo_now)
FROM (SELECT key, row_number() OVER (ORDER BY key) AS k, depth FROM demo_spaces WHERE depth > 0) s,
     LATERAL (SELECT r, 3 + ((s.k * 6 + r) % 55)::int AS u FROM generate_series(0, CASE WHEN s.depth = 2 THEN 5 ELSE 0 END) r) x
ON CONFLICT DO NOTHING;

-- Event logs with real actors, to see photos and names in the journal.
INSERT INTO event.event_logs (id, name, message, "entityType", "entityId", "actorId", payload, "occurredAt")
SELECT md5('demo-log-' || n)::uuid,
       (ARRAY['school.invitation.sent','school.invitation.accepted','school.member-role.changed','school.updated'])[1 + n % 4],
       (ARRAY['Une invitation a été envoyée.','Une invitation a été acceptée.','Le rôle d''un membre a changé.','Les informations de l''école ont été mises à jour.'])[1 + n % 4],
       'school', md5('demo-school-1')::uuid::text,
       CASE WHEN n % 5 = 0 THEN (SELECT id::text FROM demo_admin) ELSE md5('demo-user-' || (1 + n % 2))::uuid::text END,
       jsonb_build_object('demo', true, 'index', n),
       now() - n * interval '3 hours'
FROM generate_series(1, 40) n
ON CONFLICT (id) DO NOTHING;

COMMIT;
