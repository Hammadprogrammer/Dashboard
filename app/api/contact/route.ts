import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error, success) => {
  if (error) console.error("SMTP Connection Error:", error);
  else console.log("SMTP Server Ready to Send Emails!");
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function verifyRecaptcha(token: string) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return false;

  try {
    const res = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      { method: "POST" }
    );
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, fatherName, nic, category, email, phone, service, message, recaptchaToken } =
      body;

    if (!name || !fatherName || !category || !phone || !service || !recaptchaToken) {
      return NextResponse.json(
        { message: "Missing required fields or reCAPTCHA token." },
        { status: 400, headers: corsHeaders }
      );
    }

    const valid = await verifyRecaptcha(recaptchaToken);
    if (!valid) {
      return NextResponse.json(
        { message: "reCAPTCHA verification failed." },
        { status: 403, headers: corsHeaders }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h3 style="color:#0078D4;">New Contact Form Submission</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Father's Name:</b> ${fatherName}</p>
        ${nic ? `<p><b>NIC:</b> ${nic}</p>` : ""}
        <p><b>Category:</b> ${category}</p>
        ${email ? `<p><b>Email:</b> ${email}</p>` : ""}
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Service:</b> ${service}</p>
        ${message ? `<p><b>Message:</b> ${message}</p>` : ""}
        <hr/>
        <p style="font-size: 12px; color: #777;">
          Sent from Al Muallim Travels Website Contact Form
        </p>
      </div>
    `;

    const text = `
New Contact Form Submission:

Name: ${name}
Father's Name: ${fatherName}
NIC: ${nic || "N/A"}
Category: ${category}
Email: ${email || "N/A"}
Phone: ${phone}
Service: ${service}
Message: ${message || "N/A"}

-- 
Sent from Al Muallim Travels Website
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: "info@almuallimtravels.com",
      subject: `New Contact Form from ${name}`,
      text,
      html,
    });

    return NextResponse.json(
      { message: " Email sent successfully!" },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error(" Email send error:", error);
    return NextResponse.json(
      { message: "Email sending failed", error: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}


// import { NextResponse } from "next/server";
// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT || 465),
//   secure: process.env.EMAIL_SECURE === "true", 
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false, 
//   },
// });

// transporter.verify((error, success) => {
//   if (error) console.error("SMTP Connection Error:", error);
//   else console.log(" SMTP Server Ready to Send Emails!");
// });

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// };

// async function verifyRecaptcha(token: string) {
//   const secret = process.env.RECAPTCHA_SECRET_KEY;
//   if (!secret) return false;

//   try {
//     const res = await fetch(
//       `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
//       { method: "POST" }
//     );
//     const data = await res.json();
//     return data.success;
//   } catch {
//     return false;
//   }
// }

// export async function OPTIONS() {
//   return NextResponse.json({}, { headers: corsHeaders });
// }

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const { name, fatherName, nic, category, email, phone, service, message, recaptchaToken } =
//       body;

//     if (!name || !fatherName || !category || !phone || !service || !recaptchaToken) {
//       return NextResponse.json(
//         { message: "Missing required fields or reCAPTCHA token." },
//         { status: 400, headers: corsHeaders }
//       );
//     }

//     const valid = await verifyRecaptcha(recaptchaToken);
//     if (!valid) {
//       return NextResponse.json(
//         { message: "reCAPTCHA verification failed." },
//         { status: 403, headers: corsHeaders }
//       );
//     }

//     const html = `
//       <h2>New Contact Form Submission</h2>
//       <p><strong>Name:</strong> ${name}</p>
//       <p><strong>Father's Name:</strong> ${fatherName}</p>
//       <p><strong>NIC:</strong> ${nic || "N/A"}</p>
//       <p><strong>Category:</strong> ${category}</p>
//       <p><strong>Email:</strong> ${email || "N/A"}</p>
//       <p><strong>Phone:</strong> ${phone}</p>
//       <p><strong>Service:</strong> ${service}</p>
//       <p><strong>Message:</strong> ${message || "N/A"}</p>
//     `;

//     await transporter.sendMail({
//       from: process.env.EMAIL_FROM,
//       to: "info@almuallimtravels.com", 
//       subject: `New Contact Form from ${name}`,
//       html,
//     });

//     return NextResponse.json(
//       { message: " Email sent successfully!" },
//       { headers: corsHeaders }
//     );
//   } catch (error: any) {
//     console.error(" Email send error:", error);
//     return NextResponse.json(
//       { message: " Email sending failed", error: String(error) },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }
