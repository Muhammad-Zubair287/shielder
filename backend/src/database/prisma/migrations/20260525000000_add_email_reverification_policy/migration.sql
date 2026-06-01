-- Add forced email re-verification support for customer accounts
CREATE TYPE "EmailVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVERIFY_REQUIRED');

ALTER TABLE "users"
  ADD COLUMN "email_verified_at" TIMESTAMP(3),
  ADD COLUMN "verification_status" "EmailVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "requires_email_reverification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "email_verification_session_token" TEXT,
  ADD COLUMN "email_verification_session_expiry" TIMESTAMP(3),
  ADD COLUMN "verification_otp_sent_at" TIMESTAMP(3);

CREATE INDEX "users_email_verified_at_idx" ON "users"("email_verified_at");
CREATE INDEX "users_verification_status_idx" ON "users"("verification_status");
CREATE INDEX "users_requires_email_reverification_idx" ON "users"("requires_email_reverification");
CREATE INDEX "users_email_verification_session_token_idx" ON "users"("email_verification_session_token");

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
