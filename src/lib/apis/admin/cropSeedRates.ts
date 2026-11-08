import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  CropSeedRate,
  CropSeedRatePayload,
  CropSeedRatesResponse,
} from "@/types/admin/cropSeedRate";

const endpoint = "/admin/crop-seed-rates";
export const cropSeedRatesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<CropSeedRatesResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<CropSeedRate>>(`${endpoint}/${id}`),
  create: (data: CropSeedRatePayload) =>
    apiRequest<ApiResponse<CropSeedRate>>(endpoint, { method: "POST", data }),
  update: (id: number, data: CropSeedRatePayload) =>
    apiRequest<ApiResponse<CropSeedRate>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<CropSeedRate>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
