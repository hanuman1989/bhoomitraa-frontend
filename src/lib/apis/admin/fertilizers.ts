import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  Fertilizer,
  FertilizerBasicPayload,
  FertilizerTranslation,
  FertilizerNutrientsPayload,
  FertilizersResponse,
} from "@/types/admin/fertilizer";

const endpoint = "/admin/fertilizers";
export const fertilizersAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<FertilizersResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}`),
  createStepOne: (data: FertilizerBasicPayload) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/step-1`, {
      method: "POST",
      data,
    }),
  updateStepOne: (id: number, data: FertilizerBasicPayload) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}/step-1`, {
      method: "PATCH",
      data,
    }),
  saveNutrients: (id: number, data: FertilizerNutrientsPayload) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}/step-2`, {
      method: "PATCH",
      data,
    }),
  saveTranslations: (
    id: number,
    translations: Record<string, FertilizerTranslation>,
  ) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}/step-3`, {
      method: "PATCH",
      data: { translations },
    }),
  saveMedia: (id: number, data: FormData) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}/step-4`, {
      method: "POST",
      data,
    }),
  review: (id: number) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}/review`),
  finalize: (id: number) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}/finalize`, {
      method: "POST",
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<Fertilizer>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
