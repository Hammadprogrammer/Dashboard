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
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    } catch (err) {
      console.error("Failed to delete file from Cloudinary:", err);
    }
  }
};

// GET: Fetch all PDFs or a single PDF for download
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const download = searchParams.get("download");

    if (id && download) {
      // Handle file download
      const item = await prisma.pdfsItem.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!item) {
        return NextResponse.json({ error: "File not found" }, { status: 404, headers: corsHeaders });
      }

      const fileRes = await fetch(item.fileUrl);
      if (!fileRes.ok) {
        throw new Error("Failed to fetch file from Cloudinary");
      }

      const blob = await fileRes.blob();
      const headers = new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${item.title}.pdf"`,
      });

      return new NextResponse(blob, { status: 200, headers });
    } else {
      // Fetch all PDFs
      const items = await prisma.pdfsItem.findMany({
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json(items, { status: 200, headers: corsHeaders });
    }
  } catch (error) {
    console.error("Failed to fetch PDF items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Add or Update PDF
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    let fileUrl: string | null = null;
    let publicId: string | null = null;

    // Upload file if given
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "pdf_files", resource_type: "raw" },
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
      }

      const updatedItem = await prisma.pdfsItem.update({
        where: { id: parseInt(id, 10) },
        data: dataToUpdate,
      });

      return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
    } else {
      // New PDF
      if (!fileUrl || !publicId) {
        return NextResponse.json(
          { error: "PDF file is required for a new item" },
          { status: 400, headers: corsHeaders }
        );
      }

      const newItem = await prisma.pdfsItem.create({
        data: {
          title,
          description,
          fileUrl,
          publicId,
          isPublished: true,
        },
      });

      return NextResponse.json(newItem, { status: 201, headers: corsHeaders });
    }
  } catch (error) {
    console.error("Failed to save PDF item:", error);
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

    const itemToDelete = await prisma.pdfsItem.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!itemToDelete) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    await deleteFile(itemToDelete.publicId);

    await prisma.pdfsItem.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Failed to delete PDF item:", error);
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
    const isPublished = Boolean(body.isPublished);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updatedItem = await prisma.pdfsItem.update({
      where: { id },
      data: { isPublished },
    });

    return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Failed to toggle published status:", error);
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