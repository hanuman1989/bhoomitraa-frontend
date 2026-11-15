import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Farm, FarmBasicPayload, FarmDetailsPayload, FarmFilters, FarmSummary, BoundaryDraft } from "@/types/account/farm";

export const accountFarmsAPI = {
  list: (filters: FarmFilters = {}) => apiRequest<PaginatedResponse<Farm>>("/account/farms", { audience: "web", params: { ...filters } }),
  summary: () => apiRequest<ApiResponse<FarmSummary>>("/account/farms/summary", { audience: "web" }),
  get: (id: number) => apiRequest<ApiResponse<Farm>>(`/account/farms/${id}`, { audience: "web" }),
  create: (data: FarmBasicPayload & BoundaryDraft, idempotencyKey: string) => apiRequest<ApiResponse<Farm>>("/account/farms", { method: "POST", audience: "web", data, idempotencyKey }),
  update: (id: number, data: FarmBasicPayload) => apiRequest<ApiResponse<Farm>>(`/account/farms/${id}`, { method: "PATCH", audience: "web", data }),
  updateDetails: (id: number, data: FarmDetailsPayload) => apiRequest<ApiResponse<Farm>>(`/account/farms/${id}/details`, { method: "PATCH", audience: "web", data }),
  updateBoundary: (id: number, data: BoundaryDraft) => apiRequest<ApiResponse<Farm>>(`/account/farms/${id}/boundary`, { method: "PATCH", audience: "web", data }),
  updateStatus: (id: number, is_active: boolean) => apiRequest<ApiResponse<Farm>>(`/account/farms/${id}/status`, { method: "PATCH", audience: "web", data: { is_active } }),
};
