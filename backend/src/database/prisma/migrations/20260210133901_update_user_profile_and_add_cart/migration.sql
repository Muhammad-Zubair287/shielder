/*
  Warnings:

  - You are about to drop the column `companyName` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `locale` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `taxId` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "companyName",
DROP COLUMN "createdAt",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "locale",
DROP COLUMN "phone",
DROP COLUMN "taxId",
DROP COLUMN "updatedAt",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "preferred_language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "profile_image" TEXT,
ADD COLUMN     "tax_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
