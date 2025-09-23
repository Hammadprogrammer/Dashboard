/*
  Warnings:

  - You are about to drop the column `isPublished` on the `Knowledge` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Knowledge" DROP COLUMN "isPublished",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
