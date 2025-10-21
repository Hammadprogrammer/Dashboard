import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; 

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(videos, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos from database." },
      { status: 500, headers: corsHeaders }
    );
  }
}

function convertToEmbedUrl(videoUrl: string): string {
  let finalUrl = videoUrl;
  
  if (finalUrl.startsWith("http://")) {
      finalUrl = finalUrl.replace("http://", "https://");
  }

  if (finalUrl.includes("youtube.com/watch?v=")) {
    finalUrl = finalUrl.replace("watch?v=", "embed/");
  } else if (finalUrl.includes("youtu.be/")) {
    finalUrl = finalUrl.replace("youtu.be/", "youtube.com/embed/");
  }
  
  finalUrl = finalUrl.split('?')[0];
  
  return finalUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, videoUrl } = body;

    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: "Title and Video URL are required." },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const finalUrl = convertToEmbedUrl(videoUrl);

    if (id) {
      const updatedVideo = await prisma.video.update({
        where: { id: parseInt(id, 10) },
        data: { title, description, videoUrl: finalUrl },
      });
      return NextResponse.json(updatedVideo, { status: 200, headers: corsHeaders });
    } else {
      const newVideo = await prisma.video.create({
        data: { title, description, videoUrl: finalUrl, isActive: true },
      });
      return NextResponse.json(newVideo, { status: 201, headers: corsHeaders });
    }
  } catch (error) {
    console.error("Failed to save video:", error);
    return NextResponse.json(
      { error: "Failed to save video due to a server error." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const newStatus = searchParams.get("isActive") === 'true'; 

    if (!id) {
      return NextResponse.json(
        { error: "Video ID is required for status update" },
        { status: 400, headers: corsHeaders }
      );
    }

    const updatedVideo = await prisma.video.update({
      where: { id: parseInt(id, 10) },
      data: { isActive: newStatus },
    });

    return NextResponse.json(updatedVideo, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Failed to update video status:", error);
    return NextResponse.json(
      { error: "Failed to update video status due to a server error." },
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
        { error: "ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    await prisma.video.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json(
      { message: "Video deleted successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Failed to delete video:", error);
    return NextResponse.json(
      { error: "Failed to delete video." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}