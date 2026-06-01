ALTER TABLE "products"
ADD COLUMN "warehouse_id" UUID;

CREATE INDEX "products_warehouse_id_idx" ON "products"("warehouse_id");

ALTER TABLE "products"
ADD CONSTRAINT "products_warehouse_id_fkey"
FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Ensure a default Main Warehouse exists for safe backfill.
INSERT INTO "warehouses" ("id", "name", "address", "city", "country", "is_active", "created_at", "updated_at")
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Main Warehouse',
  'Default warehouse (auto-created by migration)',
  'N/A',
  'N/A',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "warehouses"
  WHERE LOWER("name") = LOWER('Main Warehouse')
);

-- Backfill all existing products to Main Warehouse.
UPDATE "products"
SET "warehouse_id" = (
  SELECT "id"
  FROM "warehouses"
  WHERE LOWER("name") = LOWER('Main Warehouse')
  ORDER BY "created_at" ASC
  LIMIT 1
)
WHERE "warehouse_id" IS NULL;
