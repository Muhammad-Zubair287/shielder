/*
  Warnings:

  - Added the required column `price_at_time` to the `cart_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT');

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "price_at_time" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
