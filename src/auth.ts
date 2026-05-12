import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "./types.js";

// ─── JWT ──────────────────────────────────────────────────────────────────────

const JWT_ALGORITHM = "HS256";
const JWT_EXPIRY = "90d";

function jwtSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(jwtSecretKey(secret));
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey(secret));
    if (typeof payload.email !== "string") return null;
    return { email: payload.email, iat: payload.iat, exp: payload.exp };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export const JWT_COOKIE_NAME = "mcp_session";

export function makeSessionCookie(token: string, secure: boolean): string {
  const parts = [
    `${JWT_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=7776000",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [
    `${JWT_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function getJWTFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === JWT_COOKIE_NAME) return rest.join("=");
  }
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// ─── Auth resolution ──────────────────────────────────────────────────────────

export async function resolveAuth(
  request: Request,
  jwtSecret: string,
): Promise<{ email: string } | null> {
  const token = getJWTFromRequest(request);
  if (!token) return null;
  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) return null;
  return { email: payload.email };
}
