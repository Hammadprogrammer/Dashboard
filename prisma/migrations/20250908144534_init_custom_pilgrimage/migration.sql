-- CreateTable
CREATE TABLE "public"."CustomPilgrimage" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle1" TEXT,
    "subtitle2" TEXT,
    "subtitle3" TEXT,
    "subtitle4" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "heroImage" TEXT,
    "heroImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomPilgrimage_pkey" PRIMARY KEY ("id")
);
