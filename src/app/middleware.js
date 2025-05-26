// middleware.js
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/admin") || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (e) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}

// Only run on /api/admin/*
export const config = {
  matcher: ["/api/admin/:path*"],
};
