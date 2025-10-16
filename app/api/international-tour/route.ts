// api/international-tour/route.ts - FINAL & STABLE API CODE

import { NextRequest, NextResponse } from "next/server";
// Assuming you have your Cloudinary configuration exported as default from this file
import cloudinary from "@/lib/cloudinary"; 
import prisma from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// --- HELPER FUNCTION: Deletes Tour by ID and cleans up Cloudinary ---
async function deleteTourAndCloudinary(tourId: number) {
  const existing = await prisma.internationalTour.findUnique({
    where: { id: tourId },
    include: { sliderImages: true },
  });

  if (!existing) return;

  // 1. Delete background image from Cloudinary
  if (existing.backgroundId) {
    try {
      await cloudinary.uploader.destroy(existing.backgroundId);
    } catch (err) {
      console.warn("⚠️ Could not destroy background image:", err);
    }
  }
  
  // 2. Delete slider images from Cloudinary
  for (const img of existing.sliderImages) {
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.warn("⚠️ Could not destroy slider image:", err);
      }
    }
  }

  // 3. Delete slider records and the tour record from Prisma
  await prisma.sliderImage.deleteMany({
    where: { tourId: existing.id },
  });
  await prisma.internationalTour.delete({
    where: { id: existing.id },
  });
}


// ---------------- GET ----------------
export async function GET() {
  try {
    const tours = await prisma.internationalTour.findMany({
      include: { sliderImages: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tours, { headers: corsHeaders });
  } catch (error: any) {
    console.error("GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch tours", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- POST (Create + Update) ----------------
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const isActiveStr = formData.get("isActive") as string | null;
    const backgroundFile = formData.get("backgroundImage") as File | null;
    // NOTE: Filter out empty file entries from formData.getAll()
    const sliderFiles = formData.getAll("sliderImages").filter(f => f instanceof File && f.size > 0) as File[];

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title & description required" },
        { status: 400, headers: corsHeaders }
      );
    }
    const isActive = isActiveStr === "true";

    let backgroundUrl: string | undefined;
    let backgroundId: string | undefined;
    let sliderUploads: { url: string; publicId: string }[] = [];

    // --- 1. Upload Background Image ---
    if (backgroundFile && backgroundFile.size > 0) {
      const buffer = Buffer.from(await backgroundFile.arrayBuffer());
      const uploadRes: any = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "international-tours/backgrounds" },
            (err, result) => (err ? reject(err) : resolve(result))
          )
          .end(buffer);
      });
      backgroundUrl = uploadRes.secure_url;
      backgroundId = uploadRes.public_id;
    }

    // --- 2. Upload Slider Images ---
    if (sliderFiles.length > 0) {
      for (const file of sliderFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadRes: any = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "international-tours/sliders"},
              (err, result) => (err ? reject(err) : resolve(result))
            )
            .end(buffer);
        });
        sliderUploads.push({
          url: uploadRes.secure_url,
          publicId: uploadRes.public_id,
        });
      }
    }

    // --- 3. Update or Create ---
    let saved;
    if (id) {
      // LOGIC FOR UPDATING
      const existing = await prisma.internationalTour.findUnique({
        where: { id: parseInt(id) },
        include: { sliderImages: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Tour not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      // If a new background image is uploaded, delete the old one first (for the SAME tour)
      if (backgroundId && existing.backgroundId) {
        await cloudinary.uploader.destroy(existing.backgroundId);
      }

      // If new sliders are uploaded, delete the old sliders and their records
      if (sliderUploads.length > 0) {
        for (const img of existing.sliderImages) {
          if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
        }
        await prisma.sliderImage.deleteMany({
          where: { tourId: existing.id },
        });
      }

      saved = await prisma.internationalTour.update({
        where: { id: parseInt(id) },
        data: {
          title,
          description,
          isActive,
          // Only update background if a new one was uploaded
          backgroundUrl: backgroundUrl ?? existing.backgroundUrl,
          backgroundId: backgroundId ?? existing.backgroundId,
          // Replace sliders if new ones were uploaded
          ...(sliderUploads.length > 0
            ? { sliderImages: { create: sliderUploads } }
            : {}),
        },
        include: { sliderImages: true },
      });
    } else {
      // LOGIC FOR CREATING (Enforcing single background tour)
      if (!backgroundFile && sliderFiles.length === 0) {
        return NextResponse.json(
          { error: "Image is required for new tour" },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // ✅ NEW REPLACEMENT LOGIC: Find and delete the existing background tour if a new one is being created.
      if (backgroundFile) {
        const existingBackgroundTour = await prisma.internationalTour.findFirst({
            where: { backgroundUrl: { not: null } },
            select: { id: true },
        });
        
        if (existingBackgroundTour) {
            console.log(`Deleting old background tour ID: ${existingBackgroundTour.id} to enforce single background.`);
            await deleteTourAndCloudinary(existingBackgroundTour.id);
        }
      }

      saved = await prisma.internationalTour.create({
        data: {
          title,
          description,
          isActive,
          backgroundUrl: backgroundUrl || null,
          backgroundId: backgroundId || null,
          sliderImages: { create: sliderUploads },
        },
        include: { sliderImages: true },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    console.error("POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to save tour", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH (toggle active/inactive) ----------------
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;
    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.internationalTour.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("PATCH error:", error.message);
    return NextResponse.json(
      { error: "Failed to toggle active", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- DELETE ----------------
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    await deleteTourAndCloudinary(parseInt(id));

    return NextResponse.json(
      { message: "Tour deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete tour", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- OPTIONS ----------------
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders }) ;
}