// api/domestic/route.ts - FINAL & STABLE FIX: Using Base64 upload for reliability in production/live environment.

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary"; // Make sure to use v2
import prisma from "@/lib/prisma";

// --- Configuration for Serverless Function ---
export const config = {
  // Set maxDuration for Vercel/Next.js serverless function to prevent timeout (max is 60)
  maxDuration: 60,
};

// --- Headers for CORS ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// --- HELPER FUNCTION: Base64 Upload for Stability (The Fix) ---
const uploadImageToBase64 = async (file: File) => {
    // 1. Convert File to ArrayBuffer, then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 2. Convert Buffer to Base64 String
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    // 3. Upload Base64 String to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(base64Image, {
        folder: "domestic-packages",
        resource_type: "image",
        // Consistent transformation for better presentation
        transformation: [{ width: 800, height: 600, gravity: "center" }], 
    });

    return {
        secure_url: uploadRes.secure_url,
        public_id: uploadRes.public_id,
    };
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
    // Ensure category is normalized to correct capitalization for Prisma type
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

    // --- 1. Handle Replacement/Pre-Checks for CREATE ---
    if (!isUpdating) {
      if (!file || file.size === 0) {
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
          } catch (err: any) {
            console.error("⚠️ Failed to delete old image from Cloudinary during replacement:", err.message);
          }
        }
        await prisma.domesticPackage.delete({
          where: { id: existingPackage.id },
        });
      }
    }

    // --- 2. Handle File Upload (using Base64 helper) ---
    if (file && file.size > 0) {
      if (isUpdating) {
        // If updating AND a new file is provided, delete the old file first
        const existing = await prisma.domesticPackage.findUnique({
          where: { id: parseInt(id!) },
        });

        if (existing?.publicId) {
          try {
            await cloudinary.uploader.destroy(existing.publicId);
          } catch (err: any) {
            console.error("⚠️ Failed to delete old image during update:", err.message);
          }
        }
      }

      // Perform Cloudinary Upload using Base64 method (The Fix)
      try {
        const uploadRes = await uploadImageToBase64(file);
        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;

      } catch (err: any) {
        console.error("❌ Cloudinary upload failed:", err.message);
        return NextResponse.json(
          { error: "Image upload failed. Cloudinary service error.", details: err.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // --- 3. Validation for Update (if no new image provided) ---
    if (isUpdating && !imageUrl) {
        const existing = await prisma.domesticPackage.findUnique({ where: { id: parseInt(id!) } });
        if (!existing?.imageUrl) {
             return NextResponse.json(
                { error: "Cannot proceed with update: Image required." },
                { status: 400, headers: corsHeaders }
            );
        }
    }

    // --- 4. Save to Database ---
    let saved;
    const updateData = {
        title,
        price,
        category: normalizedCategory, 
        isActive,
        ...(imageUrl ? { imageUrl, publicId } : {}), // Update image only if uploaded
    };

    if (isUpdating) {
      saved = await prisma.domesticPackage.update({
        where: { id: parseInt(id!) },
        data: updateData,
      });
    } else {
       if (!imageUrl || !publicId) {
          throw new Error("Missing image data for new package creation after upload.");
       }

      saved = await prisma.domesticPackage.create({
        data: {
          ...updateData,
          imageUrl: imageUrl,
          publicId: publicId,
        },
      });
    }

    return NextResponse.json(saved, { status: isUpdating ? 200 : 201, headers: corsHeaders });

  } catch (error: any) {
    console.error("❌ POST /api/domestic global error:", error.message);
    return NextResponse.json(
      { error: "An unexpected error occurred during package processing.", details: error.message },
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