import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  SeedLot,
  SeedLotPayload,
  SeedLotsResponse,
} from "@/types/admin/seedLot";
import type { VerificationStatus } from "@/types/admin/knowledgeSource";

const endpoint = "/admin/seed-lots";
export const seedLotsAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<SeedLotsResponse>(endpoint, { params }),
  show: (id: number) => apiRequest<ApiResponse<SeedLot>>(`${endpoint}/${id}`),
  create: (data: SeedLotPayload | FormData) =>
    apiRequest<ApiResponse<SeedLot>>(endpoint, { method: "POST", data }),
  update: (id: number, data: SeedLotPayload | FormData) => {
    if (data instanceof FormData) data.set("_method", "PATCH");
    return apiRequest<ApiResponse<SeedLot>>(`${endpoint}/${id}`, {
      method: data instanceof FormData ? "POST" : "PATCH",
      data,
    });
  },
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<SeedLot>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  updateVerification: (id: number, verification_status: VerificationStatus) =>
    apiRequest<ApiResponse<SeedLot>>(`${endpoint}/${id}/verification`, {
      method: "PATCH",
      data: { verification_status },
    }),
  report: (id: number) =>
    apiRequest(`${endpoint}/${id}/report`, { responseType: "binary" }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
