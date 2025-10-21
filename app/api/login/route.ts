import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { id: "admin", email },
        process.env.JWT_SECRET!,
        { expiresIn: "1d" }
      );

      return NextResponse.json({ message: "Login successful", token });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  } catch (error) {
    console.error(" Login Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
