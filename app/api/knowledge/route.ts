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


const deleteFile = async (publicId: string | null) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    console.log(`✅ Cloudinary file deleted: ${publicId}`);
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err);

  }
};



export async function GET() {
  try {
    const items = await prisma.knowledge.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("❌ Failed to fetch knowledge items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items due to a server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null;
    
    const isUpdating = !!id;

    if (!title.trim() && !description.trim() && !file && !isUpdating) {
        return NextResponse.json(
            { error: "New items require at least a title, description, or a file." },
            { status: 400, headers: corsHeaders }
        );
    }
    
    let fileUrl: string | null = null;
    let publicId: string | null = null;

    if (file && file.size > 0) {
      if (file.type !== "application/pdf") {
          return NextResponse.json(
              { error: "Only PDF files are accepted." },
              { status: 400, headers: corsHeaders }
          );
      }
      
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const base64File = `data:${file.type};base64,${buffer.toString('base64')}`;

      const uploadResult = await cloudinary.uploader.upload(base64File, {
          folder: "knowledge_files",
          resource_type: "raw", 
      });

      fileUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;

      if (isUpdating && oldPublicId) {
        await deleteFile(oldPublicId);
      }
    }

    if (isUpdating) {
      const dataToUpdate: any = { 
        title: title || "", 
        description: description || "" 
      };

      if (fileUrl && publicId) {
        dataToUpdate.fileUrl = fileUrl;
        dataToUpdate.publicId = publicId;
      }

      const updatedItem = await prisma.knowledge.update({
        where: { id: Number(id) },
        data: dataToUpdate,
      });

      return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
    }

    if (!fileUrl) {

      fileUrl = null;
      publicId = null;
    }
    
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
    // Detailed error for debugging, generic for client
    return NextResponse.json(
      { error: "Failed to save item.", details: error.message || "An unknown server error occurred." },
      { status: 500, headers: corsHeaders }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID parameter is required for deletion." },
        { status: 400, headers: corsHeaders }
      );
    }

    const numericId = Number(id);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: "Invalid ID format." },
        { status: 400, headers: corsHeaders }
      );
    }

    const item = await prisma.knowledge.findUnique({
      where: { id: numericId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (item.publicId) await deleteFile(item.publicId);

    await prisma.knowledge.delete({ where: { id: numericId } });

    return NextResponse.json(
      { message: "Item deleted successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ Failed to delete knowledge item:", error);
    return NextResponse.json(
      { error: "Failed to delete item.", details: error.message || "An unknown server error occurred." },
      { status: 500, headers: corsHeaders }
    );
  }
}


export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive === 'undefined') {
      return NextResponse.json(
        { error: "Missing 'id' or 'isActive' status in request body." },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.knowledge.update({
      where: { id: Number(id) },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json(updated, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error(" Failed to update status:", error);
    return NextResponse.json(
      { error: "Failed to update status.", details: error.message || "An unknown server error occurred." },
      { status: 500, headers: corsHeaders }
    );
  }
}


export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}