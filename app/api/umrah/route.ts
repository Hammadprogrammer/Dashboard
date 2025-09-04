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
   const packages = await prisma.umrahPackage.findMany({
  orderBy: { createdAt: "desc" },
});

    return NextResponse.json(packages, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ GET /api/umrah error:", error.message);
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

    // 🆕 New logic: If creating a new package, check for and delete an existing one with the same category.
    if (!id) {
      const existingPackage = await prisma.umrahPackage.findFirst({
        where: { category: normalizedCategory },
      });

      if (existingPackage) {
        console.log(`⚠️ Existing package found for category '${normalizedCategory}'. Deleting old one.`);
        if (existingPackage.publicId) {
          try {
            await cloudinary.uploader.destroy(existingPackage.publicId);
            console.log("🗑️ Old image deleted from Cloudinary:", existingPackage.publicId);
          } catch (err: any) {
            console.error("❌ Failed to delete old image from Cloudinary:", err.message);
          }
        }
        await prisma.umrahPackage.delete({
          where: { id: existingPackage.id },
        });
        console.log("🗑️ Old package deleted from database:", existingPackage.id);
      }
    }

    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // ✅ If it's an update and a new file is uploaded, delete the old one.
    if (id && file) {
      const existing = await prisma.umrahPackage.findUnique({
        where: { id: parseInt(id) },
      });

      if (existing?.publicId) {
        try {
          await cloudinary.uploader.destroy(existing.publicId);
          console.log("🗑️ Old image deleted from Cloudinary:", existing.publicId);
        } catch (err: any) {
          console.error("❌ Failed to delete old image from Cloudinary:", err.message);
        }
      }
    }

    // ✅ Upload the new file to Cloudinary (only if a new file is provided).
    if (file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadRes: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "umrah-packages", // ✅ Updated folder name
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
      // ✅ Update an existing package.
      saved = await prisma.umrahPackage.update({
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
      // ✅ Create a new package.
      saved = await prisma.umrahPackage.create({
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
    console.error("❌ POST /api/umrah error:", error.message);
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

    // First, find the package to get the public ID for Cloudinary.
    const existing = await prisma.umrahPackage.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // ✅ If a Cloudinary image exists, delete it.
    if (existing.publicId) {
      try {
        await cloudinary.uploader.destroy(existing.publicId);
        console.log("🗑️ Image deleted from Cloudinary:", existing.publicId);
      } catch (err: any) {
        console.error("❌ Cloudinary delete failed:", err.message);
      }
    }

    // Delete the package from the database.
    await prisma.umrahPackage.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      { message: "🗑️ Package deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ DELETE /api/umrah error:", error.message);
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