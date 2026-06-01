-- Add forced email re-verification support for customer accounts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailVerificationStatus') THEN
    CREATE TYPE "EmailVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVERIFY_REQUIRED');
  END IF;
END
$$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verification_status" "EmailVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "requires_email_reverification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "email_verification_session_token" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verification_session_expiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verification_otp_sent_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_email_verified_at_idx" ON "users"("email_verified_at");
CREATE INDEX IF NOT EXISTS "users_verification_status_idx" ON "users"("verification_status");
CREATE INDEX IF NOT EXISTS "users_requires_email_reverification_idx" ON "users"("requires_email_reverification");
CREATE INDEX IF NOT EXISTS "users_email_verification_session_token_idx" ON "users"("email_verification_session_token");

-- Security-first migration: all existing customer accounts must re-verify.
-- This prevents old fake / unreachable emails from continuing to access the system.
UPDATE "users"
SET
  "email_verified" = false,
  "email_verified_at" = NULL,
  "verification_status" = 'REVERIFY_REQUIRED',
  "requires_email_reverification" = true,
  "status" = 'PENDING',
  "verification_token" = NULL,
  "verification_token_expiry" = NULL,
  "email_verification_session_token" = NULL,
  "email_verification_session_expiry" = NULL,
  "verification_otp_sent_at" = NULL
WHERE "role" = 'USER' AND "deleted_at" IS NULL;
