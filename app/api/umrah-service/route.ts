
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
 * @param folder Cloudinary folder name.
 * @returns Object containing secure_url and public_id.
 */
const uploadImageBase64 = async (imageFile: File, folder: string) => {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const base64Image = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

    const uploadResult: any = await cloudinary.uploader.upload(base64Image, { 
        folder: folder,
        resource_type: "image",
    });

    return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
    };
};

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const services = await prisma.umrahService.findMany({
      include: { serviceImages: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(services, { headers: corsHeaders });
  } catch (error: any) {
    console.error(" GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch services", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- POST (Create + Update) ----------------
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const isActiveStr = formData.get("isActive") as string | null;
    const heroFile = formData.get("heroImage") as File | null;
    const serviceFiles = formData.getAll("serviceImages") as File[];
    
    const hasHeroFile = heroFile && heroFile.size > 0; 
    const hasServiceFiles = serviceFiles.filter(f => f && f.size > 0).length > 0;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title & description required" },
        { status: 400, headers: corsHeaders }
      );
    }
    const isActive = isActiveStr === "true";

    let heroUpload: { url: string; publicId: string } | undefined;
    let serviceUploads: { url: string; publicId: string }[] = [];

    if (hasHeroFile) {
      heroUpload = await uploadImageBase64(heroFile, "umrah-services/hero");
    }

   if (hasServiceFiles) {
      for (const file of serviceFiles.filter(f => f && f.size > 0)) {
        const result = await uploadImageBase64(file, "umrah-services/gallery");
        serviceUploads.push({
          url: result.url,
          publicId: result.publicId,
        });
      }
    }

    let saved;
    if (id) {
      const existing = await prisma.umrahService.findUnique({
        where: { id: parseInt(id) },
        include: { serviceImages: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404, headers: corsHeaders }
        );
      }
      
      const updateData: any = {
          title,
          description,
          isActive,
      };

      if (heroUpload) {
        if (existing.heroImageId) {
            await deleteImage(existing.heroImageId);
        }
        updateData.heroImage = heroUpload.url;
        updateData.heroImageId = heroUpload.publicId;
        updateData.serviceImages = { set: [] }; 
      }
      
      if (serviceUploads.length > 0) {
        for (const img of existing.serviceImages) {
          if (img.publicId) await deleteImage(img.publicId);
        }
        await prisma.serviceImage.deleteMany({
          where: { serviceId: existing.id },
        });

        updateData.serviceImages = { create: serviceUploads };
        updateData.heroImage = null;
        updateData.heroImageId = null;
      }

      saved = await prisma.umrahService.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: { serviceImages: true },
      });
      
    } else {
      if (!hasHeroFile && !hasServiceFiles) {
        return NextResponse.json(
          { error: "Image is required for new service" },
          { status: 400, headers: corsHeaders }
        );
      }
      
      if (hasHeroFile) {
          const existingHeroService = await prisma.umrahService.findFirst({
              where: { NOT: { heroImage: null } }
          });
          if (existingHeroService && existingHeroService.heroImageId) {
              await deleteImage(existingHeroService.heroImageId);
              await prisma.umrahService.delete({ where: { id: existingHeroService.id } });
          }
      }

      saved = await prisma.umrahService.create({
        data: {
          title,
          description,
          isActive,
          heroImage: heroUpload?.url || null,
          heroImageId: heroUpload?.publicId || null,
          serviceImages: { create: serviceUploads },
        },
        include: { serviceImages: true },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    console.error(" POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to save service", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;
    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "ID and isActive boolean are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.umrahService.update({
      where: { id: parseInt(id) },
      data: { isActive: isActive },
    });
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("PATCH error:", error.message);
    return NextResponse.json(
      { error: "Failed to toggle active", details: error.message },
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
        { error: "ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const existing = await prisma.umrahService.findUnique({
      where: { id: parseInt(id) },
      include: { serviceImages: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (existing.heroImageId) {
      await deleteImage(existing.heroImageId);
    }
    if (existing.serviceImages.length > 0) {
      for (const img of existing.serviceImages) {
        if (img.publicId) await deleteImage(img.publicId);
      }
    }

    await prisma.umrahService.delete({
      where: { id: existing.id },
    });

    return NextResponse.json(
      { message: "Service deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete service", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}