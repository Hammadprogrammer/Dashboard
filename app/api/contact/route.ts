import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function verifyRecaptcha(token: string) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not set.");
    return false;
  }

  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
  
  try {
    const response = await fetch(verificationUrl, { method: 'POST' });
    const json = await response.json();
    return json.success; 
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
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
    } = await request.json();

    if (!name || !fatherName || !category || !phone || !service || !recaptchaToken) {
      return NextResponse.json(
        { message: "Missing required fields (Name, Father's Name, Category, Phone, Service) or reCAPTCHA token." },
        { status: 400, headers: corsHeaders }
      );
    }

    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return NextResponse.json(
        { message: "reCAPTCHA verification failed. Are you a bot?" },
        { status: 403, headers: corsHeaders }
      );
    }
    
    const nicValue = nic || "N/A (Not Provided)";
    const emailValue = email || "N/A (Not Provided)";
    const messageValue = message || "N/A (Not Provided)"; 
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Message from Contact Form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Father's Name:</strong> ${fatherName}</p>
        <p><strong>NIC:</strong> ${nicValue}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Email:</strong> ${emailValue}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Message:</strong> ${messageValue}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Email sent successfully!" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error sending email" },
      { status: 500, headers: corsHeaders }
    );
  }
}