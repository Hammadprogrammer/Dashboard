// api/domestic/route.ts - FIX: Added necessary interface and fixed Next.js config export structure.

import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary"; 
import prisma from "@/lib/prisma";

// --- Interface (Copied from frontend to resolve 'Type error: Cannot find name 'Package'') ---
interface Package {
  id: number;
  title: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  category: "Economic" | "Standard" | "Premium";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ⚠️ FIX 1: Next.js API Route Config Export for App Router
// To disable default bodyParser when using req.formData, we export this object.
export const config = {
  api: {
    bodyParser: false,
  },
  // Increase maxDuration for file uploads
  maxDuration: 30, 
};

// ---------------- GET ----------------
export async function GET() {
  try {
    const packages = await prisma.domesticPackage.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ GET /api/domestic error:", error.message);
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
    // Normalize category: ensure it matches the Prisma schema's expected format (e.g., "Economic")
    const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    
    // Type check for category (important for Prisma/TypeScript)
    if (!["Economic", "Standard", "Premium"].includes(normalizedCategory)) {
         return NextResponse.json(
            { error: "Invalid category value provided." },
            { status: 400, headers: corsHeaders }
        );
    }

    const isUpdating = !!id;

    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // 1. --- Handle Category Replacement (Only for CREATE/New Package) ---
    if (!isUpdating) {
      if (!file) {
          return NextResponse.json(
              { error: "A file is required for a new Domestic package." },
              { status: 400, headers: corsHeaders }
          );
      }
      
      const existingPackage = await prisma.domesticPackage.findFirst({
        where: { category: normalizedCategory },
      });

      if (existingPackage) {
        console.log(`Existing package found for category '${normalizedCategory}'. Replacing it.`);
        
        // Delete old image from Cloudinary
        if (existingPackage.publicId) {
          try {
            await cloudinary.uploader.destroy(existingPackage.publicId); 
            console.log("🗑️ Old image deleted from Cloudinary:", existingPackage.publicId);
          } catch (err: any) {
            console.error("⚠️ Failed to delete old image from Cloudinary:", err.message);
          }
        }
        // Delete old package from database
        await prisma.domesticPackage.delete({
          where: { id: existingPackage.id },
        });
        console.log("🗑️ Old package deleted from database:", existingPackage.id);
      }
    }

    // 2. --- Handle File Upload (for both CREATE and UPDATE) ---
    if (file) {
      if (isUpdating) {
        // If updating AND a new file is provided, delete the old file first
        const existing = await prisma.domesticPackage.findUnique({
          where: { id: parseInt(id!) },
        });

        if (existing?.publicId) {
          try {
            await cloudinary.uploader.destroy(existing.publicId);
            console.log("🗑️ Old image deleted during update:", existing.publicId);
          } catch (err: any) {
            console.error("⚠️ Failed to delete old image during update:", err.message);
          }
        }
      }

      // Perform Cloudinary Upload
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadRes: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "domestic-packages",
              resource_type: "image",
              transformation: [{ width: 800, height: 600, crop: "fill", gravity: "center" }], 
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(buffer);
        });

        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;

      } catch (err: any) {
        console.error("❌ Cloudinary upload failed:", err.message);
        return NextResponse.json(
          { error: "Image upload failed", details: err.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // 3. --- Data Validation before Database Write ---
    if (isUpdating && !imageUrl) {
        const existing = await prisma.domesticPackage.findUnique({ where: { id: parseInt(id!) } });
        if (!existing?.imageUrl) {
             return NextResponse.json(
                { error: "Cannot remove existing image during update. Upload a replacement or keep the current one." },
                { status: 400, headers: corsHeaders }
            );
        }
    }


    // 4. --- Save to Database ---
    let saved;
    if (isUpdating) {
      saved = await prisma.domesticPackage.update({
        where: { id: parseInt(id!) },
        data: {
          title,
          price,
          // FIX: Used the imported/defined Package type here
          category: normalizedCategory as Package["category"], 
          isActive,
          ...(imageUrl ? { imageUrl, publicId } : {}), 
        },
      });
    } else {
       if (!imageUrl || !publicId) {
          throw new Error("Missing image data for new package creation.");
       }

      saved = await prisma.domesticPackage.create({
        data: {
          title,
          price,
          // FIX: Used the imported/defined Package type here
          category: normalizedCategory as Package["category"],
          isActive,
          imageUrl: imageUrl,
          publicId: publicId,
        },
      });
    }

    return NextResponse.json(saved, { status: isUpdating ? 200 : 201, headers: corsHeaders });

  } catch (error: any) {
    console.error("❌ POST /api/domestic error:", error.message);
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

    if (!id || typeof isActive === 'undefined') {
      return NextResponse.json(
        { error: "ID and isActive status are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.domesticPackage.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ PATCH /api/domestic error:", error.message);
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

    const existing = await prisma.domesticPackage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (existing.publicId) {
      try {
        await cloudinary.uploader.destroy(existing.publicId);
        console.log("🗑️ Image deleted from Cloudinary:", existing.publicId);
      } catch (err: any) {
        console.error("⚠️ Cloudinary delete failed:", err.message);
      }
    }

    await prisma.domesticPackage.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: "✅ Package deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ DELETE /api/domestic error:", error.message);
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