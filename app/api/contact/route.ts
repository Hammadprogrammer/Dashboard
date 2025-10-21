export const runtime = "nodejs"; // ensures nodemailer works on Vercel

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ reCAPTCHA verification
async function verifyRecaptcha(token: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) throw new Error("Missing RECAPTCHA_SECRET_KEY");

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    });

    const data = await res.json();
    return data.success;
  } catch (err) {
    console.error("reCAPTCHA verification failed:", err);
    return false;
  }
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

    // ✅ Step 1: reCAPTCHA validation
    const validCaptcha = await verifyRecaptcha(recaptchaToken);
    if (!validCaptcha) {
      return NextResponse.json(
        { message: "Invalid reCAPTCHA. Please try again." },
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ Step 2: Validate env variables
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } =
      process.env;

    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
      console.error("❌ Missing SMTP ENV vars");
      return NextResponse.json(
        { message: "Server email configuration is missing." },
        { status: 500, headers: corsHeaders }
      );
    }

    // ✅ Step 3: GoDaddy / SecureServer SMTP configuration
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST, // smtpout.secureserver.net
      port: Number(EMAIL_PORT) || 587,
      secure: false, // Use false for port 587
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Important for GoDaddy SSL
      },
      connectionTimeout: 20000, // 20 seconds
    });

    // ✅ Step 4: Verify connection only locally (skip on Vercel)
    if (process.env.NODE_ENV === "development") {
      await transporter.verify();
      console.log("SMTP connection verified locally ✅");
    }

    // ✅ Step 5: Prepare mail content
    const mailOptions = {
      from: EMAIL_FROM || EMAIL_USER,
      to: EMAIL_USER, // send to yourself
      replyTo: email || EMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Father's Name:</b> ${fatherName}</p>
        <p><b>NIC:</b> ${nic || "N/A"}</p>
        <p><b>Category:</b> ${category}</p>
        <p><b>Email:</b> ${email || "N/A"}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Service:</b> ${service}</p>
        <p><b>Message:</b> ${message || "N/A"}</p>
      `,
    };

    // ✅ Step 6: Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Message sent successfully!" },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ Email send failed:", error.message);
    return NextResponse.json(
      { message: "Failed to send message. Please try again later." },
      { status: 500, headers: corsHeaders }
    );
  }
}
