// app/api/hajj/route.ts
import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary"; // Make sure this path is correct
import prisma from "@/lib/prisma";

// ⭐ Required to use Node.js features like the Cloudinary SDK for file uploads
export const runtime = "nodejs"; 

// Define CORS headers (adjust "Access-Control-Allow-Origin" for production)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------- GET (Fetch All Packages) ----------------
export async function GET() {
  try {
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

    // 1. Extract Form Data
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string | null;
    const priceStr = formData.get("price") as string | null;
    const category = formData.get("category") as string | null;
    const file = formData.get("file") as File | null; 
    const isActiveStr = formData.get("isActive") as string | null;

    // 2. Validate Basic Fields
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

    // 3. Cloudinary Upload Helper (uses buffer stream for robustness)
    async function uploadToCloudinary(file: File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "hajj-packages", 
            width: 400,
            height: 600,
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

    // 4. Handle UPDATE logic (ID exists)
    if (id) {
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

      // If a new file is provided, upload it and delete the old one
      if (file) {
        if (existing.publicId) {
          try {
            // Delete old image from Cloudinary
            await cloudinary.uploader.destroy(existing.publicId);
          } catch (err: any) {
            console.error("❌ Old image delete failed:", err.message);
          }
        }

        const uploadRes = await uploadToCloudinary(file);
        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
      }

      // Update the database record
      saved = await prisma.hajjPackage.update({
        where: { id: packageId },
        data: {
          title,
          price,
          category,
          isActive,
          // Only include image fields if a new image was uploaded
          ...(imageUrl ? { imageUrl, publicId } : {}),
        },
      });
    
    // 5. Handle CREATE logic (No ID)
    } else {
      
      if (file) {
        const uploadRes = await uploadToCloudinary(file);
        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
      }
      
      // Create the new database record
      saved = await prisma.hajjPackage.create({
        data: {
          title,
          price,
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

// ---------------- PATCH (Toggle Active/Inactive Status) ----------------
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

    const updated = await prisma.hajjPackage.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
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
        { error: "ID is required" },
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

    // Attempt to delete the image from Cloudinary
    if (existing.publicId) {
      try {
        await cloudinary.uploader.destroy(existing.publicId);
        console.log(`✅ Cloudinary image deleted: ${existing.publicId}`);
      } catch (err: any) {
        console.error("❌ Cloudinary delete failed:", err.message);
      }
    }

    // Delete the database record
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