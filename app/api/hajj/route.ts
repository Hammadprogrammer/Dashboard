import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary"; 

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, 
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Helper function for reliable Base64 synchronous image upload.
 */
async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
        throw new Error("File must be an image type.");
    }
    
    // Convert File to Buffer, then to Base64 string
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64File = `data:${file.type};base64,${buffer.toString('base64')}`;
    
    const uploadResult = await cloudinary.uploader.upload(base64File, {
        folder: "hajj-packages", 
        resource_type: "image",
        transformation: [{ width: 400, height: 600, crop: "fill" }],
    });

    return uploadResult;
}

// ---------------- OPTIONS (CORS preflight) ----------------
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// ---------------- GET (Fetch all packages) ----------------
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
    
    const isUpdating = !!id;

    if (!isUpdating && !file) {
        return NextResponse.json(
            { error: "A file is required for a new Hajj package." },
            { status: 400, headers: corsHeaders }
        );
    }

    const isActive = isActiveStr === "true";
    let imageUrl: string | undefined;
    let publicId: string | undefined;

    // 🔄 Handle File Upload (if a file is present)
    if (file && file.size > 0) {
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "Only image files are accepted." },
                { status: 400, headers: corsHeaders }
            );
        }
        const uploadRes = await uploadImage(file); 
        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
    }


    // 🔁 UPDATE existing
    if (isUpdating) {
      const existing = await prisma.hajjPackage.findUnique({
        where: { id: parseInt(id!) },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Package not found." },
          { status: 404, headers: corsHeaders }
        );
      }
      
      // If a NEW file was uploaded, delete the OLD file.
      if (imageUrl && existing.publicId) { 
          try {
              await cloudinary.uploader.destroy(existing.publicId); 
          } catch (err: any) {
              console.error("⚠️ Old image delete failed:", err.message);
          }
      }

      const updated = await prisma.hajjPackage.update({
        where: { id: parseInt(id!) },
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
    if (!imageUrl || !publicId) {
       // Should not happen if file check is done correctly, but as a fallback:
       throw new Error("File upload data is missing for new package creation.");
    }
    
    const created = await prisma.hajjPackage.create({
      data: {
        title,
        price,
        category,
        isActive,
        imageUrl,
        publicId,
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

    if (!id || typeof isActive === 'undefined') {
      return NextResponse.json(
        { error: "ID and isActive status are required." },
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