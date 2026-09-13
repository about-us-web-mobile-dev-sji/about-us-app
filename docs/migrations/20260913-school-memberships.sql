CREATE TABLE IF NOT EXISTS school.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES school.schools(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user".users(id) ON DELETE CASCADE,
  CONSTRAINT memberships_school_user_unique UNIQUE (school_id, user_id)
);

CREATE INDEX IF NOT EXISTS memberships_school_id_idx
  ON school.memberships (school_id);

CREATE INDEX IF NOT EXISTS memberships_user_id_idx
  ON school.memberships (user_id);