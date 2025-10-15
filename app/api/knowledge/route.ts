import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs"; 

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ Helper: Delete old file safely
const deleteFile = async (publicId: string | null) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err);
  }
};

// ✅ GET: Fetch all knowledge items
export async function GET() {
  try {
    const items = await prisma.knowledge.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("❌ Failed to fetch knowledge items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ✅ POST: Add / Update knowledge item
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const file = formData.get("file") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null;
    const removeFile = formData.get("removeFile") === "true";

    // ✅ Validation
    if (!title && !description && (!file || file.size === 0)) {
      return NextResponse.json(
        { error: "Please provide title, description, or file." },
        { status: 400, headers: corsHeaders }
      );
    }

    let fileUrl: string | null = null;
    let publicId: string | null = null;

    // ✅ Upload new file (if provided)
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "knowledge_files",
              resource_type: "raw", // PDFs or docs
            },
            (error, result) => {
              if (error || !result) return reject(error || new Error("Upload failed"));
              resolve({ secure_url: result.secure_url, public_id: result.public_id });
            }
          );
          uploadStream.end(buffer);
        }
      );

      fileUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;

      // ✅ Delete old file if updating
      if (oldPublicId) await deleteFile(oldPublicId);
    }

    // ✅ Update existing item
    if (id) {
      const dataToUpdate: any = { title, description };

      if (fileUrl && publicId) {
        dataToUpdate.fileUrl = fileUrl;
        dataToUpdate.publicId = publicId;
      } else if (removeFile) {
        dataToUpdate.fileUrl = null;
        dataToUpdate.publicId = null;
        if (oldPublicId) await deleteFile(oldPublicId);
      }

      const updatedItem = await prisma.knowledge.update({
        where: { id: Number(id) },
        data: dataToUpdate,
      });

      return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
    }

    // ✅ Create new item
    const newItem = await prisma.knowledge.create({
      data: {
        title: title || "",
        description: description || "",
        fileUrl,
        publicId,
        isActive: true,
      },
    });

    return NextResponse.json(newItem, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ Failed to save knowledge item:", error);
    return NextResponse.json(
      { error: "Failed to save item", details: error.message || error },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ✅ DELETE: Remove item by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const item = await prisma.knowledge.findUnique({
      where: { id: Number(id) },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (item.publicId) await deleteFile(item.publicId);

    await prisma.knowledge.delete({ where: { id: Number(id) } });

    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("❌ Failed to delete knowledge item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ✅ PATCH: Toggle isActive status
export async function PATCH(request: NextRequest) {
  try {
    const { id, isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.knowledge.update({
      where: { id: Number(id) },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("❌ Failed to update status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ✅ OPTIONS: CORS support
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
