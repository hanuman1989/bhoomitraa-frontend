import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/ApiError";
import adminAuthAPI from "@/lib/apis/admin/adminAuth";
import { readAdminToken } from "@/lib/auth/session";
import type { AdminUser } from "@/types/admin/adminUser";

/**
 * Validate the admin's HttpOnly-cookie-backed Laravel Sanctum session.
 * The result is deduplicated within the current React server render.
 * A cookie by itself is not proof of authentication.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = await readAdminToken();

  if (!token) return null;

  try {
    const response = await adminAuthAPI.me();

    if (!response.status || !response.data?.status) {
      return null;
    }

    return response.data;
  } catch (error: unknown) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      return null;
    }

    // Do not mistake a backend outage or malformed response for logout.
    throw error;
  }
});

/** Require a verified admin before rendering protected pages. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}
