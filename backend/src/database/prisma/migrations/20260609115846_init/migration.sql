-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_INQUIRY';

-- DropIndex
DROP INDEX "idx_order_status_lookup";

-- DropIndex
DROP INDEX "users_email_verification_session_token_idx";

-- DropIndex
DROP INDEX "users_email_verified_at_idx";

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_name" TEXT,
    "device_info" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_baskets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_baskets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_basket_items" (
    "id" TEXT NOT NULL,
    "basket_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_basket_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_token_key" ON "trusted_devices"("token");

-- CreateIndex
CREATE INDEX "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");

-- CreateIndex
CREATE INDEX "trusted_devices_token_idx" ON "trusted_devices"("token");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_baskets_user_id_key" ON "quotation_baskets"("user_id");

-- CreateIndex
CREATE INDEX "quotation_baskets_user_id_idx" ON "quotation_baskets"("user_id");

-- CreateIndex
CREATE INDEX "quotation_basket_items_basket_id_idx" ON "quotation_basket_items"("basket_id");

-- CreateIndex
CREATE INDEX "quotation_basket_items_product_id_idx" ON "quotation_basket_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_basket_items_basket_id_product_id_key" ON "quotation_basket_items"("basket_id", "product_id");

-- CreateIndex
CREATE INDEX "two_factor_otps_used_expires_at_idx" ON "two_factor_otps"("used", "expires_at");

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_baskets" ADD CONSTRAINT "quotation_baskets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_basket_items" ADD CONSTRAINT "quotation_basket_items_basket_id_fkey" FOREIGN KEY ("basket_id") REFERENCES "quotation_baskets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_basket_items" ADD CONSTRAINT "quotation_basket_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
