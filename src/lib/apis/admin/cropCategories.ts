import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  CropCategory,
  CropCategoryPayload,
  CropCategoriesListResponse,
} from "@/types/admin/cropCategory";

const endpoint = "/admin/crop-categories";

export const cropCategoriesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<CropCategoriesListResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<CropCategory>>(`${endpoint}/${id}`),
  create: (data: CropCategoryPayload) =>
    apiRequest<ApiResponse<CropCategory>>(endpoint, { method: "POST", data }),
  update: (id: number, data: CropCategoryPayload) =>
    apiRequest<ApiResponse<CropCategory>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<CropCategory>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
