import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/ApiError";

const COOKIE = "admin_access_token";

export async function readAdminToken() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

// Call setters ONLY from Server Actions or Route Handlers.
// The cookie expires exactly when the Laravel Sanctum token does
// (`expires_at` from the login response), so the frontend session can never
// outlive the backend token.
export async function setAdminToken(token, expiresAt) {
  const expires = new Date(expiresAt);

  if (
    !token ||
    !Number.isFinite(expires.getTime()) ||
    expires.getTime() <= Date.now()
  ) {
    throw new ApiError("Invalid admin session response", 502);
  }

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearAdminToken() {
  (await cookies()).delete(COOKIE);
}
