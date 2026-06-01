-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "fk_order_warehouse";

-- DropIndex
DROP INDEX IF EXISTS "users_otp_session_token_idx";

-- CreateTable
CREATE TABLE IF NOT EXISTS "privacy_policy" (
    "id" TEXT NOT NULL DEFAULT 'CURRENT',
    "content_en" TEXT NOT NULL,
    "content_ar" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_profiles_full_name_idx" ON "user_profiles"("full_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_profiles_phone_number_idx" ON "user_profiles"("phone_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_profiles_company_name_idx" ON "user_profiles"("company_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_role_is_active_deleted_at_idx" ON "users"("role", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_email_deleted_at_idx" ON "users"("email", "deleted_at");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_warehouse_id_fkey'
    ) THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

-- RenameIndex
-- RenameIndex (safe: only rename if the old index exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_delivery_type') THEN
        ALTER INDEX "idx_order_delivery_type" RENAME TO "orders_delivery_type_idx";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_warehouse') THEN
        ALTER INDEX "idx_order_warehouse" RENAME TO "orders_warehouse_id_idx";
    END IF;
END
$$;
