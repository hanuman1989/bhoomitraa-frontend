import "server-only";
import { cache } from "react";
import { apiRequest } from "@/lib/api/request";
import { ApiError } from "@/lib/api/ApiError";

export const getAdmin = cache(async () => {
  try {
    const response = await apiRequest("/admin/me");
    const user = response?.data;
    if (!user || typeof user !== "object") throw new ApiError("Unauthenticated", 401);
    // Never return an API access token, hashes or other sensitive fields to the browser.
    return {
      id: user.id, first_name: user.first_name, last_name: user.last_name,
      email: user.email, is_super_user: Boolean(user.is_super_user),
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

export async function requireAdmin(permission) {
  const admin = await getAdmin();
  if (!admin) throw new ApiError("Please sign in again", 401);
  // Frontend check helps UX, Laravel MUST enforce authorization independently.
  if (permission && !admin.is_super_user && !admin.permissions.includes(permission)) {
    throw new ApiError("You do not have permission", 403);
  }
  return admin;
}
