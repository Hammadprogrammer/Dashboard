import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Delete old file
const deleteFile = async (publicId: string) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
    } catch (err) {
      console.error("Failed to delete file from Cloudinary:", err);
    }
  }
};

// GET: Fetch all Knowledge items
export async function GET() {
  try {
    const items = await prisma.knowledge.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(items, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Failed to fetch knowledge items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Add or Update Knowledge item
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null;

    if (!title && !description && (!file || file.size === 0)) {
      return NextResponse.json(
        { error: "Please provide a title, description, or file." },
        { status: 400, headers: corsHeaders }
      );
    }

    let fileUrl: string | null = null;
    let publicId: string | null = null;

    // ✅ Upload PDF file only if exists
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "knowledge_files",
            resource_type: "auto", // ✅ auto-detect (keeps PDF as PDF)
            format: "pdf",         // ✅ force extension to .pdf
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error("Upload failed"));
            }
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          }
        );
        stream.end(buffer);
      });
      fileUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }

    if (id) {
      // Update existing
      const dataToUpdate: any = { title, description };
      if (fileUrl && publicId) {
        dataToUpdate.fileUrl = fileUrl;
        dataToUpdate.publicId = publicId;
        if (oldPublicId) await deleteFile(oldPublicId);
      } else if (file === null && formData.get("removeFile") === "true") {
        dataToUpdate.fileUrl = null;
        dataToUpdate.publicId = null;
        if (oldPublicId) await deleteFile(oldPublicId);
      }

      const updatedItem = await prisma.knowledge.update({
        where: { id: parseInt(id, 10) },
        data: dataToUpdate,
      });

      return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
    } else {
      // New item
      const newItem = await prisma.knowledge.create({
        data: {
          title,
          description,
          fileUrl,
          publicId,
          isActive: true,
        },
      });

      return NextResponse.json(newItem, { status: 201, headers: corsHeaders });
    }
  } catch (error) {
    console.error("Failed to save knowledge item:", error);
    return NextResponse.json(
      { error: "Failed to save item" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE
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

    const itemToDelete = await prisma.knowledge.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!itemToDelete) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (itemToDelete.publicId) {
      await deleteFile(itemToDelete.publicId);
    }

    await prisma.knowledge.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Failed to delete knowledge item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const isActive = Boolean(body.isActive);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updatedItem = await prisma.knowledge.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Failed to toggle active status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}
