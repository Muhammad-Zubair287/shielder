CREATE TABLE "inventories" (
  "id" UUID NOT NULL,
  "product_id" TEXT NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventories_product_id_warehouse_id_key" ON "inventories"("product_id", "warehouse_id");
CREATE INDEX "inventories_product_id_idx" ON "inventories"("product_id");
CREATE INDEX "inventories_warehouse_id_idx" ON "inventories"("warehouse_id");

ALTER TABLE "inventories"
  ADD CONSTRAINT "inventories_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventories"
  ADD CONSTRAINT "inventories_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed initial inventory into Main Warehouse using existing product.stock values.
-- If Main Warehouse does not exist yet, this inserts 0 rows safely.
WITH "main_warehouse" AS (
  SELECT "id"
  FROM "warehouses"
  WHERE lower("name") = 'main warehouse'
  ORDER BY "created_at" ASC
  LIMIT 1
)
INSERT INTO "inventories" (
  "id",
  "product_id",
  "warehouse_id",
  "quantity",
  "reserved_quantity",
  "created_at",
  "updated_at"
)
SELECT
  (
    substr(md5(p."id" || mw."id"), 1, 8) || '-' ||
    substr(md5(p."id" || mw."id"), 9, 4) || '-' ||
    substr(md5(p."id" || mw."id"), 13, 4) || '-' ||
    substr(md5(p."id" || mw."id"), 17, 4) || '-' ||
    substr(md5(p."id" || mw."id"), 21, 12)
  )::uuid,
  p."id",
  mw."id",
  p."stock",
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "products" p
CROSS JOIN "main_warehouse" mw
ON CONFLICT ("product_id", "warehouse_id") DO NOTHING;
