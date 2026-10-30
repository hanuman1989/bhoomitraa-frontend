import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiResponse, ApiParams } from "@/types/api";
import type {
  AdminUser,
  AdminUserFormValues,
  AdminUsersListResponse,
  ChangeAdminPasswordValues,
} from "@/types/admin/adminUser";

const endpoint = "/admin/admin-users";

/** Example calls; adjust endpoint paths to your Laravel route definitions. */
export const adminUsersAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<AdminUsersListResponse>(endpoint, { params }),

  show: (id: number) => apiRequest<ApiResponse<AdminUser>>(`${endpoint}/${id}`),

  create: (data: AdminUserFormValues) =>
    apiRequest<ApiResponse<AdminUser>>(endpoint, { method: "POST", data }),

  update: (id: number, data: Partial<AdminUserFormValues>) =>
    apiRequest<ApiResponse<AdminUser>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  changePassword: (id: number, data: ChangeAdminPasswordValues) =>
    apiRequest<ApiResponse<unknown>>(`${endpoint}/${id}/password`, {
      method: "PATCH",
      audience: "admin",
      data,
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
