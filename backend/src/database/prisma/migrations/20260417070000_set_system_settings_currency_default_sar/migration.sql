-- Set durable default currency for system settings to SAR
ALTER TABLE "system_settings"
ALTER COLUMN "currency" SET DEFAULT 'SAR';

-- Optional one-time backfill for untouched legacy CURRENT row
UPDATE "system_settings"
SET "currency" = 'SAR'
WHERE "id" = 'CURRENT'
  AND "currency" = 'USD'
  AND "updated_by" IS NULL;
