import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  Region,
  RegionPayload,
  RegionsListResponse,
} from "@/types/admin/region";

const endpoint = "/admin/regions";

export const regionsAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<RegionsListResponse>(endpoint, { params }),
  show: (id: number) => apiRequest<ApiResponse<Region>>(`${endpoint}/${id}`),
  create: (data: RegionPayload) =>
    apiRequest<ApiResponse<Region>>(endpoint, { method: "POST", data }),
  update: (id: number, data: RegionPayload) =>
    apiRequest<ApiResponse<Region>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
