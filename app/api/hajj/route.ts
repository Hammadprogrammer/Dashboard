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


async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
        throw new Error("File must be an image type.");
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64File = `data:${file.type};base64,${buffer.toString('base64')}`;
    
    const uploadResult = await cloudinary.uploader.upload(base64File, {
        folder: "hajj-packages", 
        resource_type: "image",
        transformation: [{ width: 400, height: 600 }],
    });

    return uploadResult;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const packages = await prisma.hajjPackage.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error(" GET /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch packages", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

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
      
      if (imageUrl && existing.publicId) { 
          try {
              await cloudinary.uploader.destroy(existing.publicId); 
              console.log("Old image deleted from Cloudinary during update:", existing.publicId);
          } catch (err: any) {
              console.error(" Old image delete failed:", err.message);
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

    
    const existingPackageInCategory = await prisma.hajjPackage.findFirst({
        where: { category: category },
    });

    if (existingPackageInCategory) {
        console.log(`Existing package found for category '${category}'. Replacing it.`);
        
        if (existingPackageInCategory.publicId) {
            try {
                await cloudinary.uploader.destroy(existingPackageInCategory.publicId);
                console.log(" Old package image deleted from Cloudinary:", existingPackageInCategory.publicId);
            } catch (err: any) {
                console.error(" Failed to delete old image from Cloudinary:", err.message);
            }
        }
        await prisma.hajjPackage.delete({
            where: { id: existingPackageInCategory.id },
        });
        console.log(" Old package deleted from database:", existingPackageInCategory.id);
    }

    if (!imageUrl || !publicId) {
       throw new Error("File upload data is missing for new package creation after category check.");
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
    console.error(" POST /api/hajj error:", error);
    return NextResponse.json(
      { error: "Failed to save package", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

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
    console.error(" PATCH /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to toggle active status", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

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
        console.error(" Cloudinary delete failed:", err.message);
      }
    }

    await prisma.hajjPackage.delete({ where: { id: parseInt(id) } });

    return NextResponse.json(
      { message: "Package deleted successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error(" DELETE /api/hajj error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete package", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}