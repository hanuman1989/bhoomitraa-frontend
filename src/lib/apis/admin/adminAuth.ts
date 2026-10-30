import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiResponse } from "@/types/api";
import type { AdminUser } from "@/types/admin/adminUser";
import type { AdminLoginPayload, AdminLoginResponse } from "@/types/auth";

/** Laravel authentication endpoints. Only call this service on the Next.js server. */
const adminAuthAPI = {
  login: (credentials: AdminLoginPayload): Promise<AdminLoginResponse> =>
    apiRequest<AdminLoginResponse>("/admin/login", {
      method: "POST",
      audience: "public",
      data: credentials,
    }),

  logout: (): Promise<ApiResponse<null>> =>
    apiRequest<ApiResponse<null>>("/admin/logout", {
      method: "POST",
      audience: "admin",
    }),

  me: (): Promise<ApiResponse<AdminUser>> =>
    apiRequest<ApiResponse<AdminUser>>("/admin/me", {
      audience: "admin",
    }),
};

export default adminAuthAPI;
