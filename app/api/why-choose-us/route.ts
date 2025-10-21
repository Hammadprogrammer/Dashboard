
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

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

/**
 * @param publicId The public ID of the image to delete.
 */
const deleteImage = async (publicId: string | null | undefined) => {
  if (publicId) {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.warn(` Cloudinary deletion failed for ID: ${publicId}. Error:`, error);
    }
  }
};

/**
 * @param imageFile The File object from the form data.
 * @returns Object containing secure_url and public_id.
 */
const uploadImageBase64 = async (imageFile: File) => {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const base64Image = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

    const uploadResult = await cloudinary.uploader.upload(base64Image, { 
        folder: "why_choose_us",
        resource_type: "image",
    });

    return {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
    };
};


export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const items = await prisma.whyChooseUsItem.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(items, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error(" Failed to fetch Why Choose Us items:", error);
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
    const imageFile = formData.get("imageFile") as File | null;
    const oldPublicId = formData.get("oldPublicId") as string | null; 

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    let imageUrl = null;
    let publicId = null;

    if (imageFile && imageFile.size > 0) {
      const result = await uploadImageBase64(imageFile);
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    if (id) {
      const dataToUpdate: any = { title, description };
      
      if (imageUrl && publicId) {
        dataToUpdate.imageUrl = imageUrl;
        dataToUpdate.publicId = publicId;
        
        if (oldPublicId) {
            await deleteImage(oldPublicId); 
        }
      }

      const updatedItem = await prisma.whyChooseUsItem.update({
        where: { id: parseInt(id) },
        data: dataToUpdate,
      });

      return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
    } 
    
    else {
      if (!imageUrl || !publicId) {
        return NextResponse.json(
          { error: "Image file is required for new items." },
          { status: 400, headers: corsHeaders }
        );
      }
      
      const newItem = await prisma.whyChooseUsItem.create({
        data: {
          title,
          description,
          imageUrl,
          publicId,
          isActive: true, 
        },
      });

      return NextResponse.json(newItem, { status: 201, headers: corsHeaders });
    }
  } catch (error) {
    console.error(" Failed to save Why Choose Us item:", error);
    return NextResponse.json(
        { error: "Failed to save item. Check server logs for Cloudinary/Prisma error details." }, 
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
        { error: "ID is required for deletion." },
        { status: 400, headers: corsHeaders }
      );
    }

    const itemToDelete = await prisma.whyChooseUsItem.findUnique({
      where: { id: parseInt(id) },
    });

    if (!itemToDelete) {
      return NextResponse.json({ error: "Item not found." }, { status: 404, headers: corsHeaders });
    }

    await deleteImage(itemToDelete.publicId);

    await prisma.whyChooseUsItem.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Item deleted successfully." }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error(" Failed to delete Why Choose Us item:", error);
    return NextResponse.json(
      { error: "Failed to delete item due to a server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, isActive } = await request.json();

    if (typeof id !== 'number' || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid request body: ID must be a number and isActive a boolean." },
        { status: 400, headers: corsHeaders }
      );
    }

    const updatedItem = await prisma.whyChooseUsItem.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updatedItem, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error(" Failed to toggle active status:", error);
    return NextResponse.json({ error: "Failed to update status." }, { status: 500, headers: corsHeaders });
  }
}