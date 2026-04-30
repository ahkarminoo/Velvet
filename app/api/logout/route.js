import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ message: "Logout successful" });

    // Instruct the browser to clear the cookie by setting an expired date
    response.headers.set(
      "Set-Cookie",
      `customerToken=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure`
    );

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 