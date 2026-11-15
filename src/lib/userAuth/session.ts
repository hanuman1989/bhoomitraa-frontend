import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/ApiError";
import { USER_COOKIE } from "./constants";

export async function readUserToken(): Promise<string | null> {
  return (await cookies()).get(USER_COOKIE)?.value ?? null;
}
export async function setUserToken(
  token: string,
  expiresAt: string,
): Promise<void> {
  const expires = new Date(expiresAt);
  if (
    !token ||
    !Number.isFinite(expires.getTime()) ||
    expires.getTime() <= Date.now()
  )
    throw new ApiError("Invalid account session response", 502);
  (await cookies()).set(USER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}
export async function clearUserToken(): Promise<void> {
  (await cookies()).delete(USER_COOKIE);
}
