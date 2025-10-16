// api/domestic/route.ts - FINAL FIX: Includes Package interface and stable config for live deployment.

import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary"; 
import prisma from "@/lib/prisma";

// --- Interface (FIX for Build Error) ---
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

// ⚠️ PRODUCTION FIX: Next.js API Route Config for App Router
// Disables default body parser which interferes with req.formData() and large file uploads.
export const config = {
  api: {
    bodyParser: false,
  },
  // Increase maxDuration for file uploads on serverless functions (30 seconds is a common safe limit)
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
    // req.formData() handles file parsing reliably in Next.js App Router
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
    // Normalize category (e.g., 'economic' -> 'Economic')
    const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    
    if (!["Economic", "Standard", "Premium"].includes(normalizedCategory)) {
         return NextResponse.json(
            { error: "Invalid category value provided." },
            { status: 400, headers: corsHeaders }
        );
    }

    const isUpdating = !!id;

    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // 1. --- Handle Category Replacement (For CREATE Only) ---
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
        
        if (existingPackage.publicId) {
          try {
            await cloudinary.uploader.destroy(existingPackage.publicId); 
            console.log("🗑️ Old image deleted from Cloudinary:", existingPackage.publicId);
          } catch (err: any) {
            console.error("⚠️ Failed to delete old image from Cloudinary:", err.message);
          }
        }
        await prisma.domesticPackage.delete({
          where: { id: existingPackage.id },
        });
        console.log("🗑️ Old package deleted from database:", existingPackage.id);
      }
    }

    // 2. --- Handle File Upload (for both CREATE and UPDATE) ---
    if (file) {
      // Check for file existence before proceeding with upload logic
      if (file.size === 0) {
          // This check prevents unnecessary processing if the file input was empty or upload failed early
          console.warn("Received file is empty. Skipping Cloudinary upload.");
      } else {
        if (isUpdating) {
          // Delete old image during update if a new one is provided
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
            stream.end(buffer); // End the stream with the file buffer
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
    }
    
    // 3. --- Final Data Validation/Preparation ---
    if (isUpdating && !imageUrl) {
        // Only allow update if image is not changing OR if new image failed to upload (though the outer try-catch handles upload failure)
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
          category: normalizedCategory as Package["category"], 
          isActive,
          ...(imageUrl ? { imageUrl, publicId } : {}), // Only update image/publicId if new image was uploaded
        },
      });
    } else {
       if (!imageUrl || !publicId) {
          // This should be caught by step 1's file check, but good for safety
          throw new Error("Missing image data for new package creation.");
       }

      saved = await prisma.domesticPackage.create({
        data: {
          title,
          price,
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