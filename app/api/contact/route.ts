export const runtime = "nodejs"; 

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function verifyRecaptcha(token: string) {
  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) throw new Error("Missing RECAPTCHA_SECRET_KEY");

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

    const validCaptcha = await verifyRecaptcha(recaptchaToken);
    if (!validCaptcha) {
      return NextResponse.json(
        { message: "Invalid reCAPTCHA. Please try again." },
        { status: 400, headers: corsHeaders }
      );
    }

    const {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_SECURE,
      EMAIL_USER,
      EMAIL_PASS,
      EMAIL_FROM,
    } = process.env;

    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
      throw new Error("Missing email environment variables");
    }

    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: false, 
      requireTLS: true,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      tls: {
        ciphers: "SSLv3",
      },
    });

    await transporter
      .verify()
      .then(() => console.log(" SMTP connection successful"))
      .catch((err) => {
        console.error(" SMTP connection failed:", err);
        throw new Error("SMTP connection failed");
      });

    // ✅ Compose mail
    const mailOptions = {
      from: EMAIL_FROM || EMAIL_USER,
      to: EMAIL_USER,
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

    // ✅ Send mail
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Message sent successfully!" },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error(" Email sending error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response,
    });

    return NextResponse.json(
      {
        message:
          "Failed to send message. Please try again later or check server logs.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
