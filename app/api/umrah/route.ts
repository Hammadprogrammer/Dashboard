// app/api/umrah/route.ts
import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

// Ensure cloudinary config is done once, usually in a lib/cloudinary.ts file.
// Assuming it's correctly configured based on your working environment.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------- GET ----------------
export async function GET() {
  try {
    const packages = await prisma.umrahPackage.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(packages, { headers: corsHeaders });
  } catch (error: any) {
    console.error("GET /api/umrah error:", error.message);
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
    const normalizedCategory = category; // Assuming category is already normalized (Economic, Standard, Premium)

    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // 🔴 CORE FIX: Base64 Upload Logic
    if (file) {
        try {
            // 1. Convert File to ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            // 2. Convert ArrayBuffer to Base64 String
            const base64Image = Buffer.from(arrayBuffer).toString("base64");
            const dataUri = `data:${file.type};base64,${base64Image}`;

            // Handle existing image deletion if updating
            if (id) {
                const existing = await prisma.umrahPackage.findUnique({
                    where: { id: parseInt(id) },
                });
                if (existing?.publicId) {
                    await cloudinary.uploader.destroy(existing.publicId);
                    console.log("🗑️ Old image deleted from Cloudinary during update:", existing.publicId);
                }
            }
            
            // 3. Upload Base64 Data URI directly
            const uploadRes: any = await cloudinary.uploader.upload(dataUri, {
                folder: "umrah-packages",
                width: 400,
                height: 600,
            });

            imageUrl = uploadRes.secure_url;
            publicId = uploadRes.public_id;
            
        } catch (err: any) {
            console.error("Cloudinary upload failed (Base64 method):", err.message);
            return NextResponse.json(
                { error: "Image upload failed", details: err.message },
                { status: 500, headers: corsHeaders }
            );
        }
    }
    
    let saved;
    if (id) {
      // 🟢 UPDATE existing package
      saved = await prisma.umrahPackage.update({
        where: { id: parseInt(id) },
        data: {
          title,
          price,
          category: normalizedCategory as "Economic" | "Standard" | "Premium",
          isActive,
          ...(imageUrl ? { imageUrl, publicId } : {}), 
        },
      });
    } else {
      // 🚩 ENFORCE: If creating a NEW package, delete the existing package in that category first.
      const existingPackage = await prisma.umrahPackage.findFirst({
        where: { category: normalizedCategory },
      });

      if (existingPackage) {
        await prisma.umrahPackage.delete({
          where: { id: existingPackage.id },
        });
        console.log("🗑️ Old package deleted from database before new one was created:", existingPackage.id);
      }
      
      // 🟢 CREATE new package
      saved = await prisma.umrahPackage.create({
        data: {
          title,
          price,
          category: normalizedCategory as "Economic" | "Standard" | "Premium",
          isActive,
          imageUrl: imageUrl || "",
          publicId: publicId || "",
        },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    console.error("POST /api/umrah error:", error.message);
    return NextResponse.json(
      { error: "Failed to save package", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH, DELETE, OPTIONS (No change needed) ----------------

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

    const updated = await prisma.umrahPackage.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ PATCH /api/umrah error:", error.message);
    return NextResponse.json(
      { error: "Failed to toggle active", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

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

    const existing = await prisma.umrahPackage.findUnique({
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
        console.error("Cloudinary delete failed:", err.message);
      }
    }

    await prisma.umrahPackage.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: "Package deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("DELETE /api/umrah error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete package", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}