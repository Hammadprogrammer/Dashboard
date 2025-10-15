// import { NextRequest, NextResponse } from "next/server";
// import { PrismaClient } from "@prisma/client";
// import { v2 as cloudinary } from "cloudinary";

// const prisma = new PrismaClient();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
//   api_key: process.env.CLOUDINARY_API_KEY!,
//   api_secret: process.env.CLOUDINARY_API_SECRET!,
// });

// export async function GET() {
//   try {
//     const pdfs = await prisma.pDF.findMany({ orderBy: { createdAt: "desc" } });
//     return NextResponse.json(pdfs);
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// export async function POST(req: NextRequest) {
//   const formData = await req.formData();
//   const name = formData.get("name") as string;
//   const file = formData.get("file") as any;

//   if (!name || !file)
//     return NextResponse.json({ error: "Name & file required" }, { status: 400 });

//   const buffer = Buffer.from(await file.arrayBuffer());

//   return new Promise<NextResponse>((resolve) => {
//     const stream = cloudinary.uploader.upload_stream(
//       { folder: "pdf_uploads", resource_type: "raw" },
//       async (err, result) => {
//         if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));

//         const pdf = await prisma.pDF.create({
//           data: { name, filePath: result!.secure_url },
//         });

//         resolve(NextResponse.json(pdf));
//       }
//     );
//     stream.end(buffer);
//   });
// }

// export async function DELETE(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { id } = body;

//     if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

//     const pdf = await prisma.pDF.findUnique({ where: { id } });
//     if (!pdf) return NextResponse.json({ error: "PDF not found" }, { status: 404 });

//     const parts = pdf.filePath.split("/");
//     const filename = parts[parts.length - 1];
//     const public_id = `pdf_uploads/${filename.split(".")[0]}`;
//     await cloudinary.uploader.destroy(public_id, { resource_type: "raw" });

//     await prisma.pDF.delete({ where: { id } });

//     return NextResponse.json({ message: "PDF deleted successfully" });
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from "next/server";

// 🟢 GET Request
export async function GET(req: NextRequest) {
  return NextResponse.json({ message: "GET request working successfully!" });
}

// 🟡 POST Request
export async function POST(req: NextRequest) {
  return NextResponse.json({ message: "POST request working successfully!" });
}

// 🔴 DELETE Request
export async function DELETE(req: NextRequest) {
  return NextResponse.json({ message: "DELETE request working successfully!" });
}
