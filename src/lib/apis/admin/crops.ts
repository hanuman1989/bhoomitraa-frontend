import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type { Crop, CropPayload, CropsListResponse } from "@/types/admin/crop";

const endpoint = "/admin/crops";

export const cropsAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<CropsListResponse>(endpoint, { params }),
  show: (id: number) => apiRequest<ApiResponse<Crop>>(`${endpoint}/${id}`),
  create: (data: CropPayload | FormData) =>
    apiRequest<ApiResponse<Crop>>(endpoint, { method: "POST", data }),
  update: (id: number, data: CropPayload | FormData | { image: null }) => {
    if (data instanceof FormData) data.set("_method", "PATCH");
    return apiRequest<ApiResponse<Crop>>(`${endpoint}/${id}`, {
      method: data instanceof FormData ? "POST" : "PATCH",
      data,
    });
  },
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<Crop>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
