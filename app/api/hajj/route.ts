// app/api/hajj/route.ts
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

// ---------------- GET: fetch all packages ----------------
export async function GET() {
  try {
    const packages = await prisma.hajjPackage.findMany({
      orderBy: { createdAt: "desc" }, // latest first
    });

    console.log("📦 Packages fetched:", packages.length);

    const headers = {
      "Access-Control-Allow-Origin": "*", // ya specific frontend domain
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };

    return NextResponse.json(packages, { headers });
  } catch (error) {
    console.error("❌ GET /api/hajj error:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

// ---------------- POST: create new package ----------------
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const title = formData.get("title") as string | null;
    const priceStr = formData.get("price") as string | null;
    const file = formData.get("file") as File | null;

    if (!title || !priceStr || !file) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    // file -> buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // upload to Cloudinary
    const uploadRes: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "hajj-packages" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });

    console.log("✅ Cloudinary upload:", uploadRes.secure_url);

    // save in DB
    const saved = await prisma.hajjPackage.create({
      data: {
        title,
        price,
        imageUrl: uploadRes.secure_url,
      },
    });

    console.log("✅ Package saved in DB:", saved);

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };

    return NextResponse.json(saved, { headers });
  } catch (error) {
    console.error("❌ POST /api/hajj error:", error);
    return NextResponse.json(
      { error: "Failed to save package" },
      { status: 500 }
    );
  }
}

// ---------------- OPTIONS: preflight ----------------
export async function OPTIONS() {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return new Response(null, { status: 204, headers });
}
