import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  SeedPrice,
  SeedPricePayload,
  SeedPricesResponse,
} from "@/types/admin/seedPrice";

const endpoint = "/admin/seed-prices";
export const seedPricesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<SeedPricesResponse>(endpoint, { params }),
  show: (id: number) => apiRequest<ApiResponse<SeedPrice>>(`${endpoint}/${id}`),
  create: (data: SeedPricePayload) =>
    apiRequest<ApiResponse<SeedPrice>>(endpoint, { method: "POST", data }),
  update: (id: number, data: SeedPricePayload) =>
    apiRequest<ApiResponse<SeedPrice>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<SeedPrice>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
