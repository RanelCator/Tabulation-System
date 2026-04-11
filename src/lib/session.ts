import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export type SessionPayload = {
  id: string;
  role: "admin" | "judge";
  displayName: string;
};

const secretValue = process.env.AUTH_SECRET;

if (!secretValue) {
  throw new Error("AUTH_SECRET is not set");
}

const secret = new TextEncoder().encode(secretValue);

export async function createSession(user: SessionPayload): Promise<string> {
  return new SignJWT({
    id: user.id,
    role: user.role,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    return {
      id: String(payload.id),
      role: payload.role as "admin" | "judge",
      displayName: String(payload.displayName ?? ""),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}