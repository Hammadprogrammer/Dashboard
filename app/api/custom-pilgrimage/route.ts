// app/api/custom-pilgrimage/route.ts (UPDATED with Base64 upload logic)

import { NextRequest, NextResponse } from "next/server";
// Make sure this file correctly loads and configures Cloudinary using ENV variables
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
    const data = await prisma.customPilgrimage.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: any) {
    console.error("CustomPilgrimage GET error:", error.message);

    return NextResponse.json(
      { error: "Failed to fetch data", details: error.message },
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
    const subtitle1 = formData.get("subtitle1") as string | null;
    const subtitle2 = formData.get("subtitle2") as string | null;
    const subtitle3 = formData.get("subtitle3") as string | null;
    const subtitle4 = formData.get("subtitle4") as string | null;
    const isActiveStr = formData.get("isActive") as string | null;
    const heroFile = formData.get("heroImage") as File | null;

    // --- Basic Validation ---
    if (!title || !subtitle1 || !subtitle2 || !subtitle3 || !subtitle4) {
      return NextResponse.json(
        { error: "All title and subtitle fields are required" },
        { status: 400, headers: corsHeaders }
      );
    }
    const isActive = isActiveStr === "true";

    let heroImageUrl: string | undefined;
    let heroImageId: string | undefined;

    // --- Base64 Cloudinary Upload FIX ---
    if (heroFile && heroFile.size > 0) {
      // Convert File to a Base64 string
      const buffer = Buffer.from(await heroFile.arrayBuffer());
      const base64Image = `data:${heroFile.type};base64,${buffer.toString("base64")}`;

      const uploadRes: any = await cloudinary.uploader.upload(base64Image, {
        folder: "custom-pilgrimage",
        resource_type: "image",
      });

      heroImageUrl = uploadRes.secure_url;
      heroImageId = uploadRes.public_id;
    }
    // ------------------------------------

    // --- Update or Create ---
    let saved;
    if (id) {
      // --- UPDATE ---
      const existing = await prisma.customPilgrimage.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Entry not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      // Delete old image if a new image was uploaded
      if (heroImageId && existing.heroImageId) {
        await cloudinary.uploader.destroy(existing.heroImageId);
      }

      saved = await prisma.customPilgrimage.update({
        where: { id: parseInt(id) },
        data: {
          title,
          subtitle1,
          subtitle2,
          subtitle3,
          subtitle4,
          isActive,
          // Use new image if uploaded, otherwise keep existing
          heroImage: heroImageUrl ?? existing.heroImage,
          heroImageId: heroImageId ?? existing.heroImageId,
        },
      });
    } else {
      // --- CREATE ---
      if (!heroImageId) {
        return NextResponse.json(
          { error: "Image is required for new entry" },
          { status: 400, headers: corsHeaders }
        );
      }
      
      saved = await prisma.customPilgrimage.create({
        data: {
          title,
          subtitle1,
          subtitle2,
          subtitle3,
          subtitle4,
          isActive,
          heroImage: heroImageUrl!,
          heroImageId: heroImageId!,
        },
      });
    }

    return NextResponse.json(saved, { headers: corsHeaders });
  } catch (error: any) {
    // This will catch Cloudinary errors, Prisma errors, and other POST function errors
    console.error("CustomPilgrimage POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to save data", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- PATCH (toggle active/inactive) ----------------
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;
    if (!id || typeof isActive === 'undefined') {
      return NextResponse.json(
        { error: "ID and isActive status are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = await prisma.customPilgrimage.update({
      where: { id: parseInt(id) },
      data: { isActive: Boolean(isActive) },
    });
    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error: any) {
    console.error("CustomPilgrimage PATCH error:", error.message);
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

    const existing = await prisma.customPilgrimage.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (existing.heroImageId) {
      // Delete image from Cloudinary
      await cloudinary.uploader.destroy(existing.heroImageId);
    }

    await prisma.customPilgrimage.delete({
      where: { id: existing.id },
    });

    return NextResponse.json(
      { message: "Entry deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("CustomPilgrimage DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete entry", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ---------------- OPTIONS ----------------
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}