-- Add OTP session token field for admin 2FA enforcement
ALTER TABLE "users" ADD COLUMN "otp_session_token" TEXT;
CREATE INDEX "users_otp_session_token_idx" ON "users"("otp_session_token");
