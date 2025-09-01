import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

// ✅ Common CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    const normalizedCategory = category.toLowerCase();

    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // ✅ Agar update ho raha hai aur file upload ki gayi hai → purani image delete karo
    if (id && file) {
      const existing = await prisma.domesticPackage.findUnique({
        where: { id: parseInt(id) },
      });

      if (existing?.publicId) {
        try {
          await cloudinary.uploader.destroy(existing.publicId);
          console.log("🗑️ Old image deleted:", existing.publicId);
        } catch (err: any) {
          console.error("❌ Failed to delete old image:", err.message);
        }
      }
    }

    // ✅ Cloudinary Upload
    if (file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadRes: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "domestic-packages",
              width: 400,
              height: 600,
              crop: "fill",
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

    let saved;
    if (id) {
      saved = await prisma.domesticPackage.update({
        where: { id: parseInt(id) },
        data: {
          title,
          price,
          category: normalizedCategory,
          isActive,
          ...(imageUrl ? { imageUrl, publicId } : {}),
        },
      });
    } else {
      saved = await prisma.domesticPackage.create({
        data: {
          title,
          price,
          category: normalizedCategory,
          isActive,
          imageUrl: imageUrl || "",
          publicId: publicId || "",
        },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ POST /api/domestic error:", error.message);
    return NextResponse.json(
      { error: "Failed to save package", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH ----------------
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

    const updated = await prisma.domesticPackage.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json(updated, { headers: corsHeaders });
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
        console.log("🗑️ Image deleted:", existing.publicId);
      } catch (err: any) {
        console.error("❌ Cloudinary delete failed:", err.message);
      }
    }

    await prisma.domesticPackage.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: "🗑️ Package deleted successfully" },
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
