import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  //  Allow Travel Agency frontend
  res.headers.set("Access-Control-Allow-Origin", "http://localhost:3002");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  //  Handle OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      headers: res.headers,
    });
  }

  return res;
}

//  Apply only on API routes
export const config = {
  matcher: "/api/:path*",
};
