// /api/testimonials/route.ts (UPDATED with Base64 upload logic)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary"; // Assuming this correctly loads your configured Cloudinary client

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle OPTIONS requests
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// GET all testimonials
export async function GET() {
  try {
    const data = await prisma.testimonial.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ GET error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch testimonials", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST (Create or Update) a testimonial
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string | null;
    // Use Number() for robust parsing, ensuring validation handles potential NaN
    const rating = Number(formData.get("rating")); 
    const description = formData.get("description") as string;
    const name = formData.get("name") as string;
    const title = formData.get("title") as string;
    const imageFile = formData.get("image") as File | null;

    if (isNaN(rating) || !description || !name || !title) {
      return NextResponse.json(
        { error: "Missing required fields or invalid rating value" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1.0 and 5.0" },
        { status: 400, headers: corsHeaders }
      );
    }

    let imageUrl: string | undefined;
    let imageId: string | undefined;

    // --- Base64 Cloudinary Upload Fix ---
    if (imageFile && imageFile.size > 0) {
      // 1. Convert File to a Buffer
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      // 2. Convert Buffer to a Base64 string for direct upload
      const base64Image = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

      const uploadRes: any = await cloudinary.uploader.upload(base64Image, {
        folder: "testimonials",
        resource_type: "image",
      });

      imageUrl = uploadRes.secure_url;
      imageId = uploadRes.public_id;
    }
    // ------------------------------------

    let savedTestimonial;
    if (id) {
      // --- UPDATE ---
      const existing = await prisma.testimonial.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Testimonial not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      // Delete old image only if a new image was successfully uploaded
      if (imageId && existing.imageId) { 
        await cloudinary.uploader.destroy(existing.imageId);
      }

      savedTestimonial = await prisma.testimonial.update({
        where: { id: parseInt(id) },
        data: {
          rating,
          description,
          name,
          title,
          // Use new values if available, otherwise keep existing
          image: imageUrl ?? existing.image,
          imageId: imageId ?? existing.imageId,
        },
      });
    } else {
      // --- CREATE ---
      // Image must be present for new entry
      if (!imageUrl || !imageId) {
        return NextResponse.json(
          { error: "Image is required for new entry" },
          { status: 400, headers: corsHeaders }
        );
      }

      savedTestimonial = await prisma.testimonial.create({
        data: {
          rating,
          description,
          name,
          title,
          image: imageUrl,
          imageId: imageId,
        },
      });
    }

    return NextResponse.json(savedTestimonial, { headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ POST error:", error.message);
    return NextResponse.json(
      { error: "Failed to save testimonial", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE  testimonial
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
    const parsedId = parseInt(id);

    const existing = await prisma.testimonial.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404, headers: corsHeaders }
      );
    }
    
    if (existing.imageId) {
      await cloudinary.uploader.destroy(existing.imageId);
    }
    
    await prisma.testimonial.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ message: "Testimonial deleted" }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete testimonial", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}