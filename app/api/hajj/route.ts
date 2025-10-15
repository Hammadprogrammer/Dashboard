import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------- GET ----------------
export async function GET(req: NextRequest) {
  try {
    // Check for 'all=true' or similar parameter if you need to distinguish client views
    const packages = await prisma.hajjPackage.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ GET /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch packages", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- POST (CREATE + UPDATE with Image) ----------------
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string | null;
    const priceStr = formData.get("price") as string | null;
    const category = formData.get("category") as string | null;
    const file = formData.get("file") as File | null;
    const isActiveStr = formData.get("isActive") as string | null;

    if (!title || !priceStr || !category) {
      return NextResponse.json(
        { error: "Title, Price, and Category are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "Price must be a valid number greater than 0" },
        { status: 400, headers: corsHeaders }
      );
    }

    const isActive = isActiveStr === "true";

    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // Cloudinary Upload Utility
    async function uploadToCloudinary(file: File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "hajj-packages",
            // Optimized dimensions for card display
            width: 450,
            height: 300,
            crop: "fill"
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });
    }

    let saved;
    if (id) {
      // --- UPDATE OPERATION ---
      const packageId = parseInt(id);
      const existing = await prisma.hajjPackage.findUnique({
        where: { id: packageId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Package not found for update" },
          { status: 404, headers: corsHeaders }
        );
      }

      // Handle file upload and old image deletion
      if (file) {
        if (existing.publicId) {
          try {
            // Safely delete old image from Cloudinary
            await cloudinary.uploader.destroy(existing.publicId);
          } catch (err: any) {
            console.error("❌ Old image delete failed (Cloudinary):", err.message);
            // Non-critical error: continue with upload
          }
        }

        const uploadRes = await uploadToCloudinary(file);
        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
      }
      
      // Update Prisma record
      saved = await prisma.hajjPackage.update({
        where: { id: packageId },
        data: {
          title,
          price: parseFloat(price.toFixed(2)), // Ensure price is correctly formatted
          category,
          isActive,
          // Only update image fields if a new file was uploaded
          ...(file ? { imageUrl, publicId } : {}),
        },
      });

    } else {
      // --- CREATE OPERATION ---
      if (!file) {
        return NextResponse.json(
            { error: "Image file is required for new packages" },
            { status: 400, headers: corsHeaders }
          );
      }

      const uploadRes = await uploadToCloudinary(file);
      imageUrl = uploadRes.secure_url;
      publicId = uploadRes.public_id;
      
      // Create new Prisma record
      saved = await prisma.hajjPackage.create({
        data: {
          title,
          price: parseFloat(price.toFixed(2)),
          category,
          isActive,
          imageUrl: imageUrl || "",
          publicId: publicId || "",
        },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ POST /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to save package", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH (Toggle Active/Inactive) ----------------
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "ID and new status (isActive) are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.hajjPackage.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });

    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ PATCH /api/hajj error:", error.message);
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
        { error: "ID is required for deletion" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const packageId = parseInt(id);

    const existing = await prisma.hajjPackage.findUnique({
      where: { id: packageId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Delete image from Cloudinary
    if (existing.publicId) {
      try {
        await cloudinary.uploader.destroy(existing.publicId);
      } catch (err: any) {
        console.error("❌ Cloudinary delete failed:", err.message);
        // Non-critical error: proceed with Prisma delete
      }
    }

    // Delete record from Prisma
    await prisma.hajjPackage.delete({
      where: { id: packageId },
    });

    return NextResponse.json(
      { message: "Package deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ DELETE /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete package", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- OPTIONS (CORS Preflight) ----------------
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}