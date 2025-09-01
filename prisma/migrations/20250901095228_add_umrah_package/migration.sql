/*
  Warnings:

  - Made the column `imageUrl` on table `HajjPackage` required. This step will fail if there are existing NULL values in that column.
  - Made the column `publicId` on table `HajjPackage` required. This step will fail if there are existing NULL values in that column.
  - Made the column `category` on table `HajjPackage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."HajjPackage" ALTER COLUMN "imageUrl" SET NOT NULL,
ALTER COLUMN "publicId" SET NOT NULL,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'Economic';

-- CreateTable
CREATE TABLE "public"."UmrahPackage" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'Economic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UmrahPackage_pkey" PRIMARY KEY ("id")
);
