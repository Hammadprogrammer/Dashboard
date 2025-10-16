// api/international-tour/route.ts - FINAL & STABLE FIX: Optimized for logic and production use.

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary"; 
import prisma from "@/lib/prisma";

// --- Cloudinary Configuration ---
// Note: Assuming configuration is done elsewhere (e.g., global middleware or lib file)
// If not, it should be done here:
/*
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
*/

// --- Configuration for Serverless Function ---
export const config = {
  // Set maxDuration for Vercel/Next.js serverless function to prevent timeout
  maxDuration: 60, 
};

// --- Headers for CORS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// --- HELPER FUNCTION: Base64 Upload for Stability (The Fix) ---
const uploadImageToBase64 = async (file: File, folder: string) => {
  // 1. Convert File to ArrayBuffer, then to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // 2. Convert Buffer to Base64 String
  const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

  // 3. Upload Base64 String to Cloudinary
  const uploadRes = await cloudinary.uploader.upload(base64Image, {
    folder: folder,
    resource_type: "image",
    transformation: [{ width: 800, height: 600, crop: "fill", gravity: "center" }], 
  });

  return {
    secure_url: uploadRes.secure_url,
    // Using Cloudinary's standard property name
    public_id: uploadRes.public_id, 
  };
};


// ---------------- OPTIONS ----------------
// Must be defined for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders }) ;
}

// ---------------- GET ----------------
export async function GET() {
  try {
    const tours = await prisma.internationalTour.findMany({
      include: { sliderImages: true },
      orderBy: { createdAt: "desc" },
    });
    // ✅ FIX: Added corsHeaders to the response
    return NextResponse.json(tours, { headers: corsHeaders }); 
  } catch (error: any) {
    console.error("❌ GET /api/international-tour error:", error.message);
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
    // getAll returns an array, but if a single file is selected, it might return a File object or an empty array.
    // It's safer to treat it as an array of files.
    const sliderFiles = formData.getAll("sliderImages") as File[]; 
    
    // ✅ REMOVED: imageType check from formData, using file presence instead.

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title & description required" },
        { status: 400, headers: corsHeaders }
      );
    }
    const isActive = isActiveStr === "true";
    const isUpdating = !!id;

    let backgroundUrl: string | undefined;
    let backgroundId: string | undefined;
    let sliderUploads: { url: string; publicId: string }[] = [];

    // --- 1. Handle Background Upload (Base64 Fix) ---
    // Only process if a background file is present
    if (backgroundFile && backgroundFile.size > 0) {
      try {
        const uploadRes = await uploadImageToBase64(backgroundFile, "international-tours/backgrounds");
        backgroundUrl = uploadRes.secure_url;
        // Corrected mapping to Prisma schema's 'publicId'
        backgroundId = uploadRes.public_id; 
      } catch (err: any) {
        console.error("❌ Cloudinary Background upload failed:", err.message);
        return NextResponse.json(
          { error: "Background image upload failed", details: err.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // --- 2. Handle Slider Uploads (Base64 Fix) ---
    // Only process if slider files are present
    if (sliderFiles.length > 0 && sliderFiles[0].size > 0) { // Check size of the first file for safety
      for (const file of sliderFiles) {
        if (file.size > 0) {
          try {
            const uploadRes = await uploadImageToBase64(file, "international-tours/sliders");
            sliderUploads.push({
              url: uploadRes.secure_url,
              // Corrected mapping to Prisma schema's 'publicId'
              publicId: uploadRes.public_id, 
            });
          } catch (err: any) {
            console.error("❌ Cloudinary Slider upload failed for a file:", err.message);
            return NextResponse.json(
              { error: "One or more slider images failed to upload", details: err.message },
              { status: 500, headers: corsHeaders }
            );
          }
        }
      }
    }

    // --- 3. Update or Create ---
    let saved;
    if (isUpdating) {
      const existing = await prisma.internationalTour.findUnique({
        where: { id: parseInt(id!) },
        include: { sliderImages: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Tour not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      // ✅ FIX 1: If a new background is uploaded, delete the old one
      if (backgroundId && existing.backgroundId) { 
        try {
          await cloudinary.uploader.destroy(existing.backgroundId);
        } catch (err) {
          console.warn("⚠️ Could not destroy old background image:", err);
        }
      }
      
      // ✅ FIX 2: If new sliders are uploaded, delete the old ones and their records
      if (sliderUploads.length > 0) {
        // Delete images from Cloudinary
        for (const img of existing.sliderImages) {
          if (img.publicId) {
             try {
               await cloudinary.uploader.destroy(img.publicId);
             } catch (err) {
               console.warn("⚠️ Could not destroy old slider image:", err);
             }
          }
        }
        // Delete records from database
        await prisma.sliderImage.deleteMany({
          where: { tourId: existing.id },
        });
      }

      // Determine update data
      const updateData: any = {
        title,
        description,
        isActive,
      };

      if (backgroundUrl) {
        updateData.backgroundUrl = backgroundUrl;
        updateData.backgroundId = backgroundId;
      }
      
      if (sliderUploads.length > 0) {
        updateData.sliderImages = { create: sliderUploads };
      }

      saved = await prisma.internationalTour.update({
        where: { id: parseInt(id!) },
        data: updateData,
        include: { sliderImages: true },
      });
      
    } else {
      // ➕ Create new
      // ✅ FIX 3: Simplified New Tour Validation: Ensure at least ONE file is uploaded
      if (!backgroundFile && sliderFiles.length === 0) {
         return NextResponse.json(
           { error: "Image is required for new tour (background or slider)" },
           { status: 400, headers: corsHeaders }
         );
      }

      // Logic from frontend was: If creating a new background tour, delete all existing background tours.
      // This is a business logic decision, but generally, one should not delete other records on CREATE.
      // Assuming you want multiple background/slider tours to exist, this 'delete old' logic is removed from CREATE.

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
    console.error("❌ POST /api/international-tour global error:", error.message);
    return NextResponse.json(
      { error: "An unexpected error occurred during tour processing.", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH (toggle active/inactive) ----------------
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;
    if (!id || typeof isActive === 'undefined') {
      return NextResponse.json(
        { error: "ID and isActive status are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.internationalTour.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ PATCH /api/international-tour error:", error.message);
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

    // Delete background image
    if (existing.backgroundId) {
      try {
        await cloudinary.uploader.destroy(existing.backgroundId);
      } catch (err) {
        console.warn("⚠️ Could not destroy background image on delete:", err);
      }
    }
    
    // Delete slider images
    if (existing.sliderImages.length > 0) {
      for (const img of existing.sliderImages) {
        if (img.publicId) {
           try {
             await cloudinary.uploader.destroy(img.publicId);
           } catch (err) {
           console.warn("⚠️ Could not destroy slider image on delete:", err);
           }
        }
      }
    }
    
    // Delete associated slider records (Prisma handles cascade delete if set up, but explicit is safer)
    if (existing.sliderImages.length > 0) {
      await prisma.sliderImage.deleteMany({
        where: { tourId: existing.id },
      });
    }

    await prisma.internationalTour.delete({
      where: { id: existing.id },
    });

    return NextResponse.json(
      { message: "Tour deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ DELETE /api/international-tour error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete tour", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}