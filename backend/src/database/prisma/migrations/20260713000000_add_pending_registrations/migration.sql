-- CreateTable
CREATE TABLE "pending_registrations" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location" TEXT,
    "company_name" TEXT,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "otp_hash" TEXT NOT NULL,
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "resend_count" INTEGER NOT NULL DEFAULT 0,
    "last_resend_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_registrations_session_token_key" ON "pending_registrations"("session_token");

-- CreateIndex
CREATE INDEX "pending_registrations_email_idx" ON "pending_registrations"("email");

-- CreateIndex
CREATE INDEX "pending_registrations_expires_at_idx" ON "pending_registrations"("expires_at");
