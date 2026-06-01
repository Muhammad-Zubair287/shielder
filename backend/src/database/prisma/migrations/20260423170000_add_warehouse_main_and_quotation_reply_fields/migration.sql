-- Warehouse: add main flag
ALTER TABLE "warehouses"
  ADD COLUMN IF NOT EXISTS "is_main" BOOLEAN NOT NULL DEFAULT false;

-- Ensure the historical main warehouse is marked as main
UPDATE "warehouses"
SET "is_main" = true
WHERE lower("name") = 'main warehouse';

-- Quotation: add in-app request/reply fields
ALTER TABLE "quotations"
  ADD COLUMN IF NOT EXISTS "user_message" TEXT,
  ADD COLUMN IF NOT EXISTS "admin_reply" TEXT;

-- Extend quotation status enum for internal request lifecycle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'QuotationStatus' AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE "QuotationStatus" ADD VALUE 'PENDING';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'QuotationStatus' AND e.enumlabel = 'REPLIED'
  ) THEN
    ALTER TYPE "QuotationStatus" ADD VALUE 'REPLIED';
  END IF;
END $$;
