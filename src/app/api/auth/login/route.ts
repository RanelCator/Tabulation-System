import { NextResponse } from "next/server";
import { loginWithPasscode } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { passcode?: string };
    const passcode = body.passcode?.trim();

    if (!passcode) {
      return NextResponse.json(
        { success: false, message: "Passcode is required." },
        { status: 400 },
      );
    }

    const user = await loginWithPasscode(passcode);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid passcode." },
        { status: 401 },
      );
    }

   const token = await createSession({
    id: user.id,
    role: user.role,
    displayName: user.displayName,
  });

    const response = NextResponse.json({
      success: true,
      role: user.role,
      redirectTo: user.role === "admin" ? "/admin" : "/judge",
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Unable to login." },
      { status: 500 },
    );
  }
}