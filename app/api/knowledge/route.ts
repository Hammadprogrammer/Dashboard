import { NextRequest, NextResponse } from "next/server";
// Assuming you have 'prisma' initialized and configured at this path
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

// Define the runtime for environments that support it (like Vercel Edge/Node)
export const runtime = "nodejs"; 

// --- Cloudinary Configuration ---
// Ensure these environment variables are correctly set in your .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

// --- CORS Headers ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Adjust this for production security
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Helper: Safely delete a file from Cloudinary.
 */
const deleteFile = async (publicId: string | null) => {
  if (!publicId) return;
  try {
    // Specify resource_type as 'raw' since these are non-image files (PDFs)
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    console.log(`✅ Cloudinary file deleted: ${publicId}`);
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err);
    // Note: Do not throw an error here, as deletion is a non-critical side effect
    // We still want the main operation (e.g., POST/DELETE) to succeed if the DB update works
  }
};

// --- API METHODS ---

/**
 * GET: Fetch all knowledge items.
 */
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

/**
 * POST: Add new or Update existing knowledge item.
 * Handles file upload via FormData.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null;
    
    const isUpdating = !!id;

    // --- Validation ---
    if (!title.trim() && !description.trim() && !file && !isUpdating) {
        return NextResponse.json(
            { error: "New items require at least a title, description, or a file." },
            { status: 400, headers: corsHeaders }
        );
    }
    
    let fileUrl: string | null = null;
    let publicId: string | null = null;

    // --- File Upload Logic ---
    if (file && file.size > 0) {
      if (file.type !== "application/pdf") {
          return NextResponse.json(
              { error: "Only PDF files are accepted." },
              { status: 400, headers: corsHeaders }
          );
      }
      
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Convert buffer to Base64 to upload via the standard upload method
      const base64File = `data:${file.type};base64,${buffer.toString('base64')}`;

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(base64File, {
          folder: "knowledge_files",
          resource_type: "raw", // For PDFs
          // The public_id can be derived from the title or a unique ID if needed
          // Using a unique public_id is better for updates
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

    // --- Create new item ---
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

/**
 * DELETE: Remove item by ID.
 */
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

    // Fetch item to get publicId before deleting from DB
    const item = await prisma.knowledge.findUnique({
      where: { id: numericId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Delete file from Cloudinary first (non-critical, but good practice)
    if (item.publicId) await deleteFile(item.publicId);

    // Delete record from database
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

/**
 * PATCH: Toggle isActive status.
 */
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
    console.error("❌ Failed to update status:", error);
    return NextResponse.json(
      { error: "Failed to update status.", details: error.message || "An unknown server error occurred." },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS: CORS Preflight Handler.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}