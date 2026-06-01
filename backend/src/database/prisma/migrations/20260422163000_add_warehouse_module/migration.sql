CREATE TABLE "warehouses" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "address" TEXT NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "country" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouses_name_key" ON "warehouses"("name");
CREATE INDEX "warehouses_is_active_idx" ON "warehouses"("is_active");
