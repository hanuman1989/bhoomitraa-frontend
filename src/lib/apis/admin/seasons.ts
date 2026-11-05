import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  Season,
  SeasonPayload,
  SeasonsListResponse,
} from "@/types/admin/season";

const endpoint = "/admin/seasons";

export const seasonsAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<SeasonsListResponse>(endpoint, { params }),
  show: (id: number) => apiRequest<ApiResponse<Season>>(`${endpoint}/${id}`),
  create: (data: SeasonPayload) =>
    apiRequest<ApiResponse<Season>>(endpoint, { method: "POST", data }),
  update: (id: number, data: SeasonPayload) =>
    apiRequest<ApiResponse<Season>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<Season>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
