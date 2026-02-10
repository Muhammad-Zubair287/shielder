/*
  Warnings:

  - You are about to drop the column `changes` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `category_translations` table. All the data in the column will be lost.
  - You are about to drop the column `customization` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `billingAddress` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddress` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `seoDescription` on the `product_translations` table. All the data in the column will be lost.
  - You are about to drop the column `seoTitle` on the `product_translations` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `product_translations` table. All the data in the column will be lost.
  - You are about to drop the column `specifications` on the `product_translations` table. All the data in the column will be lost.
  - You are about to drop the column `basePrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `meta` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `stockQuantity` on the `products` table. All the data in the column will be lost.
  - Added the required column `price` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subcategoryId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Made the column `categoryId` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DataType" AS ENUM ('NUMBER', 'TEXT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'DATASHEET', 'MANUAL', 'CERTIFICATE');

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parentId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_categoryId_fkey";

-- DropIndex
DROP INDEX "audit_logs_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_entityType_entityId_idx";

-- DropIndex
DROP INDEX "audit_logs_userId_idx";

-- DropIndex
DROP INDEX "categories_parentId_idx";

-- DropIndex
DROP INDEX "categories_status_idx";

-- DropIndex
DROP INDEX "category_translations_locale_idx";

-- DropIndex
DROP INDEX "category_translations_slug_idx";

-- DropIndex
DROP INDEX "order_items_orderId_idx";

-- DropIndex
DROP INDEX "order_items_productId_idx";

-- DropIndex
DROP INDEX "orders_orderNumber_idx";

-- DropIndex
DROP INDEX "orders_status_idx";

-- DropIndex
DROP INDEX "orders_userId_idx";

-- DropIndex
DROP INDEX "product_translations_locale_idx";

-- DropIndex
DROP INDEX "product_translations_slug_idx";

-- DropIndex
DROP INDEX "products_categoryId_idx";

-- DropIndex
DROP INDEX "products_sku_idx";

-- DropIndex
DROP INDEX "products_sku_key";

-- DropIndex
DROP INDEX "products_status_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "changes",
DROP COLUMN "ipAddress",
DROP COLUMN "userAgent";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "parentId",
DROP COLUMN "sortOrder",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "category_translations" DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "customization";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "billingAddress",
DROP COLUMN "currency",
DROP COLUMN "discount",
DROP COLUMN "notes",
DROP COLUMN "shippingAddress",
DROP COLUMN "subtotal",
DROP COLUMN "tax",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "product_translations" DROP COLUMN "seoDescription",
DROP COLUMN "seoTitle",
DROP COLUMN "slug",
DROP COLUMN "specifications";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "basePrice",
DROP COLUMN "meta",
DROP COLUMN "sku",
DROP COLUMN "status",
DROP COLUMN "stockQuantity",
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subcategoryId" TEXT NOT NULL,
ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategory_translations" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategory_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "unit" TEXT,
    "dataType" "DataType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specification_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_translations" (
    "id" TEXT NOT NULL,
    "specificationDefinitionId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specification_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specificationId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attachments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subcategory_translations_subcategoryId_locale_key" ON "subcategory_translations"("subcategoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "specification_definitions_key_key" ON "specification_definitions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "specification_translations_specificationDefinitionId_locale_key" ON "specification_translations"("specificationDefinitionId", "locale");

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategory_translations" ADD CONSTRAINT "subcategory_translations_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_translations" ADD CONSTRAINT "specification_translations_specificationDefinitionId_fkey" FOREIGN KEY ("specificationDefinitionId") REFERENCES "specification_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "specification_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attachments" ADD CONSTRAINT "product_attachments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
