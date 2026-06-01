ALTER TABLE "system_settings"
ADD COLUMN IF NOT EXISTS "company_name_en" TEXT,
ADD COLUMN IF NOT EXISTS "company_name_ar" TEXT,
ADD COLUMN IF NOT EXISTS "company_location_en" TEXT,
ADD COLUMN IF NOT EXISTS "company_location_ar" TEXT;