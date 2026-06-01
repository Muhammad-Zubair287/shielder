-- Enforce 10-minute maximum inactivity timeout policy for admin/superadmin settings.
ALTER TABLE "system_settings"
  ALTER COLUMN "session_timeout_minutes" SET DEFAULT 10;

UPDATE "system_settings"
SET "session_timeout_minutes" = 10
WHERE "session_timeout_minutes" > 10;
