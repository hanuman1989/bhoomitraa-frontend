import "server-only";
import { cookies } from "next/headers";

const COOKIE = "admin_access_token";

export async function readAdminToken() {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

// Call setters ONLY from Server Actions or Route Handlers.
export async function setAdminToken(token, remember = false) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });
}

export async function clearAdminToken() {
  (await cookies()).delete(COOKIE);
}
