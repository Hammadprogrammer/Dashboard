/*
  Warnings:

  - You are about to drop the column `category` on the `InternationalTour` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `InternationalTour` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `InternationalTour` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `InternationalTour` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."InternationalTour" DROP COLUMN "category",
DROP COLUMN "imageUrl",
DROP COLUMN "publicId",
DROP COLUMN "type",
ADD COLUMN     "backgroundId" TEXT,
ADD COLUMN     "backgroundUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."SliderImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tourId" INTEGER NOT NULL,

    CONSTRAINT "SliderImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."SliderImage" ADD CONSTRAINT "SliderImage_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "public"."InternationalTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
