// app/api/umrah-service/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

// Initialize Prisma client
const prisma = new PrismaClient();

// ✅ Configure Cloudinary Directly (Fix #3)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Helper function to delete an image from Cloudinary (Safe Deletion).
 */
const deleteImage = async (publicId: string | null | undefined) => {
  if (publicId) {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.warn(`⚠️ Cloudinary deletion failed for ID: ${publicId}. Error:`, error);
    }
  }
};

/**
 * ✅ NEW Base64 Image Upload Technique (The Core Fix #2)
 * @param imageFile The File object from the form data.
 * @param folder Cloudinary folder name.
 * @returns Object containing secure_url and public_id.
 */
const uploadImageBase64 = async (imageFile: File, folder: string) => {
    // Convert File to Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Convert Buffer to Base64 String (Data URI)
    const base64Image = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

    // Upload Base64 string directly to Cloudinary
    const uploadResult: any = await cloudinary.uploader.upload(base64Image, { 
        folder: folder,
        resource_type: "image",
    });

    return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
    };
};

// ---------------- OPTIONS ----------------
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// ---------------- GET ----------------
// ✅ Assumes file name is route.ts for correct Next.js App Router Functionality (Fix #1)
export async function GET() {
  try {
    const services = await prisma.umrahService.findMany({
      include: { serviceImages: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(services, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch services", details: error.message },
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
    const heroFile = formData.get("heroImage") as File | null;
    const serviceFiles = formData.getAll("serviceImages") as File[];
    
    // Check if heroFile is actually present (not just a placeholder File object)
    const hasHeroFile = heroFile && heroFile.size > 0; 
    // Check if serviceFiles actually contains files
    const hasServiceFiles = serviceFiles.filter(f => f && f.size > 0).length > 0;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title & description required" },
        { status: 400, headers: corsHeaders }
      );
    }
    const isActive = isActiveStr === "true";

    let heroUpload: { url: string; publicId: string } | undefined;
    let serviceUploads: { url: string; publicId: string }[] = [];

    // --- Upload Hero Image (Base64) ---
    if (hasHeroFile) {
      heroUpload = await uploadImageBase64(heroFile, "umrah-services/hero");
    }

    // --- Upload Service Gallery Images (Base64) ---
    if (hasServiceFiles) {
      for (const file of serviceFiles.filter(f => f && f.size > 0)) {
        const result = await uploadImageBase64(file, "umrah-services/gallery");
        serviceUploads.push({
          url: result.url,
          publicId: result.publicId,
        });
      }
    }

    // --- Update or Create ---
    let saved;
    if (id) {
      // 🔄 Update existing
      const existing = await prisma.umrahService.findUnique({
        where: { id: parseInt(id) },
        include: { serviceImages: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404, headers: corsHeaders }
        );
      }
      
      const updateData: any = {
          title,
          description,
          isActive,
      };

      // 1. Handle Hero Image Update
      if (heroUpload) {
        // If a new hero image is uploaded, delete the old one first
        if (existing.heroImageId) {
            await deleteImage(existing.heroImageId);
        }
        updateData.heroImage = heroUpload.url;
        updateData.heroImageId = heroUpload.publicId;
        // Ensure other image types are cleared/removed if switching type
        updateData.serviceImages = { set: [] }; 
      }
      
      // 2. Handle Gallery Image Update (only if new files are provided)
      if (serviceUploads.length > 0) {
        // Delete all old service images and their records
        for (const img of existing.serviceImages) {
          if (img.publicId) await deleteImage(img.publicId);
        }
        await prisma.serviceImage.deleteMany({
          where: { serviceId: existing.id },
        });

        updateData.serviceImages = { create: serviceUploads };
        // Clear hero image fields if switching type
        updateData.heroImage = null;
        updateData.heroImageId = null;
      }

      saved = await prisma.umrahService.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: { serviceImages: true },
      });
      
    } else {
      // ➕ Create new
      if (!hasHeroFile && !hasServiceFiles) {
        return NextResponse.json(
          { error: "Image is required for new service" },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // NOTE: This complex logic for deleting *other* hero services on creation
      // of a new hero service is unusual but retained from your original code:
      if (hasHeroFile) {
          const existingHeroService = await prisma.umrahService.findFirst({
              where: { NOT: { heroImage: null } }
          });
          if (existingHeroService && existingHeroService.heroImageId) {
              await deleteImage(existingHeroService.heroImageId);
              await prisma.umrahService.delete({ where: { id: existingHeroService.id } });
          }
      }

      saved = await prisma.umrahService.create({
        data: {
          title,
          description,
          isActive,
          heroImage: heroUpload?.url || null,
          heroImageId: heroUpload?.publicId || null,
          serviceImages: { create: serviceUploads },
        },
        include: { serviceImages: true },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to save service", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH (toggle active/inactive) ----------------
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;
    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "ID and isActive boolean are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.umrahService.update({
      where: { id: parseInt(id) },
      data: { isActive: isActive },
    });
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ PATCH error:", error.message);
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

    const existing = await prisma.umrahService.findUnique({
      where: { id: parseInt(id) },
      include: { serviceImages: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // ✅ Delete Hero Image
    if (existing.heroImageId) {
      await deleteImage(existing.heroImageId);
    }
    // ✅ Delete Gallery Images
    if (existing.serviceImages.length > 0) {
      for (const img of existing.serviceImages) {
        if (img.publicId) await deleteImage(img.publicId);
      }
    }

    await prisma.umrahService.delete({
      where: { id: existing.id },
    });

    return NextResponse.json(
      { message: "Service deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete service", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}