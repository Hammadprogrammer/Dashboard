import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------------- GET ----------------
export async function GET() {
  try {
    const services = await prisma.umrahService.findMany({
      include: { serviceImages: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(services, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ GET error:", error.message);
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

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title & description required" },
        { status: 400, headers: corsHeaders }
      );
    }
    const isActive = isActiveStr === "true";

    let heroImageUrl: string | undefined;
    let heroImageId: string | undefined;
    let serviceUploads: { url: string; publicId: string }[] = [];

    // --- Upload Hero Image ---
    if (heroFile) {
      const buffer = Buffer.from(await heroFile.arrayBuffer());
      const uploadRes: any = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "umrah-services/hero", crop: "fill" },
            (err, result) => (err ? reject(err) : resolve(result))
          )
          .end(buffer);
      });
      heroImageUrl = uploadRes.secure_url;
      heroImageId = uploadRes.public_id;
    }

    // --- Upload Service Gallery Images ---
    if (serviceFiles.length > 0) {
      for (const file of serviceFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadRes: any = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "umrah-services/gallery", crop: "fill" },
              (err, result) => (err ? reject(err) : resolve(result))
            )
            .end(buffer);
        });
        serviceUploads.push({
          url: uploadRes.secure_url,
          publicId: uploadRes.public_id,
        });
      }
    }

    // --- Update or Create ---
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

      // 🔄 If a new hero image is uploaded, delete the old one first
      if (heroImageId && existing.heroImageId) {
        await cloudinary.uploader.destroy(existing.heroImageId);
      }

      // 🔄 If new gallery images are uploaded, delete the old ones and their records
      if (serviceUploads.length > 0) {
        for (const img of existing.serviceImages) {
          if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
        }
        await prisma.serviceImage.deleteMany({
          where: { serviceId: existing.id },
        });
      }

      saved = await prisma.umrahService.update({
        where: { id: parseInt(id) },
        data: {
          title,
          description,
          isActive,
          heroImage: heroImageUrl ?? existing.heroImage,
          heroImageId: heroImageId ?? existing.heroImageId,
          ...(serviceUploads.length > 0
            ? { serviceImages: { create: serviceUploads } }
            : {}),
        },
        include: { serviceImages: true },
      });
    } else {
      // ➕ Create new
      if (!heroFile && serviceFiles.length === 0) {
        return NextResponse.json(
          { error: "Image is required for new service" },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // New logic for deleting existing hero image tours
      if (heroFile) {
          const existingHeroService = await prisma.umrahService.findFirst({
              where: { NOT: { heroImage: null } }
          });
          if (existingHeroService) {
              await cloudinary.uploader.destroy(existingHeroService.heroImageId!);
              await prisma.umrahService.delete({ where: { id: existingHeroService.id } });
          }
      }

      saved = await prisma.umrahService.create({
        data: {
          title,
          description,
          isActive,
          heroImage: heroImageUrl || null,
          heroImageId: heroImageId || null,
          serviceImages: { create: serviceUploads },
        },
        include: { serviceImages: true },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to save service", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH (toggle active/inactive) ----------------
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;
    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.umrahService.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ PATCH error:", error.message);
    return NextResponse.json(
      { error: "Failed to toggle active", details: error.message },
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
      await cloudinary.uploader.destroy(existing.heroImageId);
    }
    if (existing.serviceImages.length > 0) {
      for (const img of existing.serviceImages) {
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
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

// ---------------- OPTIONS ----------------
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}