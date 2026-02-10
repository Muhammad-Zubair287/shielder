-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "changes" JSONB,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;
