import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

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
      { error: "Failed to fetch testimonials" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST (Create or Update) a testimonial
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string | null;
    const rating = parseFloat(formData.get("rating") as string);
    const description = formData.get("description") as string;
    const name = formData.get("name") as string;
    const title = formData.get("title") as string;
    const imageFile = formData.get("image") as File | null;

    if (!rating || !description || !name || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const uploadRes: any = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "testimonials", crop: "fill" },
            (err, result) => (err ? reject(err) : resolve(result))
          )
          .end(buffer);
      });
      imageUrl = uploadRes.secure_url;
      imageId = uploadRes.public_id;
    }

    let savedTestimonial;
    if (id) {
      const existing = await prisma.testimonial.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Testimonial not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      if (imageFile && existing.imageId) {
        await cloudinary.uploader.destroy(existing.imageId);
      }

      savedTestimonial = await prisma.testimonial.update({
        where: { id: parseInt(id) },
        data: {
          rating,
          description,
          name,
          title,
          image: imageUrl || existing.image,
          imageId: imageId || existing.imageId,
        },
      });
    } else {
      if (!imageFile) {
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
          image: imageUrl as string,
          imageId: imageId as string,
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

    const existing = await prisma.testimonial.findUnique({
      where: { id: parseInt(id) },
    });
    if (existing?.imageId) {
      await cloudinary.uploader.destroy(existing.imageId);
    }
    
    await prisma.testimonial.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Testimonial deleted" }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("❌ DELETE error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete testimonial" },
      { status: 500, headers: corsHeaders }
    );
  }
}   