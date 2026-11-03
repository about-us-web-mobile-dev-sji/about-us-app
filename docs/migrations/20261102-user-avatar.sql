-- Profile photo shown wherever a user is displayed (members, invitations, logs...).
ALTER TABLE "user"."users" ADD COLUMN IF NOT EXISTS "avatarUrl" text;
