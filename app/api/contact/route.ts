import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ reCAPTCHA verify
async function verifyRecaptcha(token: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });

  const data = await res.json();
  return data.success;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const {
      name,
      fatherName,
      nic,
      category,
      email,
      phone,
      service,
      message,
      recaptchaToken,
    } = await req.json();

    const validCaptcha = await verifyRecaptcha(recaptchaToken);
    if (!validCaptcha) {
      return NextResponse.json(
        { message: "Invalid reCAPTCHA" },
        { status: 400, headers: corsHeaders }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Father's Name:</strong> ${fatherName}</p>
        <p><strong>NIC:</strong> ${nic || "N/A"}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Email:</strong> ${email || "N/A"}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Message:</strong> ${message || "N/A"}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Message sent successfully!" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { message: "Failed to send message. Please try again later." },
      { status: 500, headers: corsHeaders }
    );
  }
}
