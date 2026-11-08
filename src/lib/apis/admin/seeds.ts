import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  Seed,
  SeedBasicPayload,
  SeedTranslation,
  SeedsResponse,
} from "@/types/admin/seed";

const endpoint = "/admin/seeds";
export const seedsAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<SeedsResponse>(endpoint, { params }),
  show: (id: number) => apiRequest<ApiResponse<Seed>>(`${endpoint}/${id}`),
  createStepOne: (data: SeedBasicPayload) =>
    apiRequest<ApiResponse<Seed>>(`${endpoint}/step-1`, {
      method: "POST",
      data,
    }),
  updateStepOne: (id: number, data: SeedBasicPayload) =>
    apiRequest<ApiResponse<Seed>>(`${endpoint}/${id}/step-1`, {
      method: "PATCH",
      data,
    }),
  saveTranslations: (
    id: number,
    translations: Record<string, SeedTranslation>,
  ) =>
    apiRequest<ApiResponse<Seed>>(`${endpoint}/${id}/step-2`, {
      method: "PATCH",
      data: { translations },
    }),
  saveMedia: (id: number, data: FormData) =>
    apiRequest<ApiResponse<Seed>>(`${endpoint}/${id}/step-3`, {
      method: "POST",
      data,
    }),
  review: (id: number) =>
    apiRequest<ApiResponse<Seed>>(`${endpoint}/${id}/review`),
  finalize: (id: number) =>
    apiRequest<ApiResponse<Seed>>(`${endpoint}/${id}/finalize`, {
      method: "POST",
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<Seed>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
