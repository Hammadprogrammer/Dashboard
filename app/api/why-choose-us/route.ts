// app/api/why-choose-us/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

// Configure Cloudinary with your environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId: string) => {
  if (publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
};

// GET Request: Fetch all items
export async function GET() {
  try {
    const items = await prisma.whyChooseUsItem.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch Why Choose Us items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

// POST Request: Create or update an item
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const imageFile = formData.get("imageFile") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    let imageUrl = null;
    let publicId = null;

    // Handle image upload if a new file is provided
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "why_choose_us" },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        ).end(buffer);
      });

      const result = uploadResult as { secure_url: string; public_id: string };
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    if (id) {
      // Update existing item
      const dataToUpdate: any = { title, description };
      if (imageUrl && publicId) {
        dataToUpdate.imageUrl = imageUrl;
        dataToUpdate.publicId = publicId;
        // Delete old image from Cloudinary
        await deleteImage(oldPublicId as string);
      }

      const updatedItem = await prisma.whyChooseUsItem.update({
        where: { id: parseInt(id) },
        data: dataToUpdate,
      });

      return NextResponse.json(updatedItem, { status: 200 });
    } else {
      // Create new item
      if (!imageUrl || !publicId) {
        return NextResponse.json(
          { error: "Image file is required for new item" },
          { status: 400 }
        );
      }
      const newItem = await prisma.whyChooseUsItem.create({
        data: {
          title,
          description,
          imageUrl,
          publicId,
          isActive: true, // ✅ New items are active by default
        },
      });

      return NextResponse.json(newItem, { status: 201 });
    }
  } catch (error) {
    console.error("Failed to save Why Choose Us item:", error);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}

// DELETE Request: Delete an item
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    // Find the item to get the publicId
    const itemToDelete = await prisma.whyChooseUsItem.findUnique({
      where: { id: parseInt(id) },
    });

    if (!itemToDelete) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Delete image from Cloudinary
    await deleteImage(itemToDelete.publicId);

    // Delete the item from the database
    await prisma.whyChooseUsItem.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Item deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete Why Choose Us item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

// ✅ PATCH Request: Toggle active status
export async function PATCH(request: Request) {
  try {
    const { id, isActive } = await request.json();

    if (typeof id !== 'number' || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.whyChooseUsItem.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error("Failed to toggle active status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

// ---------------- OPTIONS (CORS Preflight) ----------------
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}