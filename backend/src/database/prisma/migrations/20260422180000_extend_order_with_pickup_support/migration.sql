-- CreateEnum for DeliveryType
CREATE TYPE "DeliveryType" AS ENUM ('DELIVERY', 'PICKUP');

-- Add delivery_type column to orders (default DELIVERY for existing orders)
ALTER TABLE "orders" ADD COLUMN "delivery_type" "DeliveryType" NOT NULL DEFAULT 'DELIVERY';

-- Add warehouse_id column to orders (nullable for flexibility)
ALTER TABLE "orders" ADD COLUMN "warehouse_id" uuid;

-- Create foreign key constraint (warehouse can be NULL for DELIVERY orders)
ALTER TABLE "orders" ADD CONSTRAINT "fk_order_warehouse" 
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL;

-- Create indexes for query performance
CREATE INDEX "idx_order_delivery_type" ON "orders"("delivery_type");
CREATE INDEX "idx_order_warehouse" ON "orders"("warehouse_id");

-- Create composite index for common queries (delivery type + warehouse)
CREATE INDEX "idx_order_delivery_warehouse" ON "orders"("delivery_type", "warehouse_id") WHERE "warehouse_id" IS NOT NULL;
