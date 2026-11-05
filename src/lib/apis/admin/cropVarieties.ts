import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  CropVariety,
  CropVarietyPayload,
  CropVarietiesListResponse,
} from "@/types/admin/cropVariety";

const endpoint = "/admin/crop-varieties";
export const cropVarietiesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<CropVarietiesListResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<CropVariety>>(`${endpoint}/${id}`),
  create: (data: CropVarietyPayload) =>
    apiRequest<ApiResponse<CropVariety>>(endpoint, { method: "POST", data }),
  update: (id: number, data: CropVarietyPayload) =>
    apiRequest<ApiResponse<CropVariety>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<CropVariety>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
