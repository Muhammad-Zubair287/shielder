-- Pending registrations are created before email OTP verification. Address is
-- optional in the signup contract, so the staging record must accept NULL.
ALTER TABLE "pending_registrations"
ALTER COLUMN "address" DROP NOT NULL;
