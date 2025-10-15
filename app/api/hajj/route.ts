import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

// ✅ Force Node.js runtime (Edge runtime causes Buffer & Cloudinary crash)
export const runtime = "nodejs";

// ✅ CORS headers (safe and consistent)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ Utility: Cloudinary upload using buffer stream
async function uploadToCloudinary(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "hajj-packages",
        resource_type: "image",
        transformation: [{ width: 400, height: 600, crop: "fill" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

// ✅ OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// ---------------- GET ----------------
export async function GET() {
  try {
    const packages = await prisma.hajjPackage.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ GET /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch packages", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- POST (CREATE or UPDATE) ----------------
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
        { error: "Title, Price, and Category are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "Price must be a valid number greater than 0." },
        { status: 400, headers: corsHeaders }
      );
    }

    const isActive = isActiveStr === "true";
    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // 🔁 UPDATE existing
    if (id) {
      const existing = await prisma.hajjPackage.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Package not found." },
          { status: 404, headers: corsHeaders }
        );
      }

      if (file) {
        // Delete old image
        if (existing.publicId) {
          try {
            await cloudinary.uploader.destroy(existing.publicId);
          } catch (err: any) {
            console.error("⚠️ Old image delete failed:", err.message);
          }
        }

        const uploadRes = await uploadToCloudinary(file);
        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
      }

      const updated = await prisma.hajjPackage.update({
        where: { id: parseInt(id) },
        data: {
          title,
          price,
          category,
          isActive,
          ...(imageUrl ? { imageUrl, publicId } : {}),
        },
      });

      return NextResponse.json(updated, { status: 200, headers: corsHeaders });
    }

    // ➕ CREATE new
    if (file) {
      const uploadRes = await uploadToCloudinary(file);
      imageUrl = uploadRes.secure_url;
      publicId = uploadRes.public_id;
    }

    const created = await prisma.hajjPackage.create({
      data: {
        title,
        price,
        category,
        isActive,
        imageUrl: imageUrl || "",
        publicId: publicId || "",
      },
    });

    return NextResponse.json(created, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ POST /api/hajj error:", error);
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

    if (!id) {
      return NextResponse.json(
        { error: "ID is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.hajjPackage.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ PATCH /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to toggle active status", details: error.message },
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
        { error: "ID is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const existing = await prisma.hajjPackage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Package not found." },
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

    await prisma.hajjPackage.delete({ where: { id: parseInt(id) } });

    return NextResponse.json(
      { message: "Package deleted successfully." },
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
