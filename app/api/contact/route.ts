export const runtime = "nodejs"; // required for nodemailer to work on Vercel

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ reCAPTCHA verification
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

// ✅ POST handler for contact form
export async function POST(req: Request) {
  const reqData = await req.json(); // Use a local variable to capture request body
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
  } = reqData;

  // Get environment variables for logging and validation
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM,
  } = process.env;

  try {
    // Verify reCAPTCHA
    const validCaptcha = await verifyRecaptcha(recaptchaToken);
    if (!validCaptcha) {
      return NextResponse.json(
        { message: "Invalid reCAPTCHA. Please try again." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate env variables
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
      // Log an error if environment variables are missing
      console.error("Missing critical email environment variables in Vercel settings.");
      throw new Error("Missing required email environment variables");
    }

    // 🛠️ CORRECTED: GoDaddy/SecureServer SMTP configuration
    // Use the official Nodemailer guide for secure connections on Vercel
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST, // Should be smtpout.secureserver.net
      port: Number(EMAIL_PORT) || 587,
      secure: false, // Use false for port 587 (STARTTLS)
      requireTLS: true, // Force STARTTLS
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS, // Make sure this is the App Password if 2FA is on
      },
      // Added robust timeouts to catch connection issues quickly
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000, // 5 seconds
      // Removed: tls: { ciphers: "SSLv3" } - Often causes issues unnecessarily
    });

    // ✅ Verify SMTP connection
    await transporter
      .verify()
      .then(() => console.log("✅ SMTP connection successful on Vercel"))
      .catch((err) => {
        // 🚨 IMPORTANT: This will show the exact GoDaddy/Vercel error in the logs
        console.error("❌ SMTP connection failed. Check GoDaddy Credentials and Host/Port.", {
          host: EMAIL_HOST,
          port: EMAIL_PORT,
          user: EMAIL_USER,
          error: { code: err.code, message: err.message, response: err.response },
        });
        // Throw an explicit error for the user/system to see
        throw new Error("SMTP connection failed: " + (err.code || err.message));
      });

    // ✅ Email content
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

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Message sent successfully!" },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    // 🚨 Log all error details when sending mail fails
    console.error(" Email sending error:", {
      message: error.message,
      code: error.code,
      response: error.response,
      // Log the required form data on failure for context
      formData: { name, email, phone, service },
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