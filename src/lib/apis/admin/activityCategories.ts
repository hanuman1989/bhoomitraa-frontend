import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  ActivityCategory,
  ActivityCategoryPayload,
  ActivityCategoriesListResponse,
} from "@/types/admin/activityCategory";

const endpoint = "/admin/activity-categories";

export const activityCategoriesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<ActivityCategoriesListResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<ActivityCategory>>(`${endpoint}/${id}`),
  create: (data: ActivityCategoryPayload) =>
    apiRequest<ApiResponse<ActivityCategory>>(endpoint, {
      method: "POST",
      data,
    }),
  update: (id: number, data: Omit<ActivityCategoryPayload, "is_system">) =>
    apiRequest<ApiResponse<ActivityCategory>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<ActivityCategory>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
