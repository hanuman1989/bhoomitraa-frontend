import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  FertilizerRecommendation,
  FertilizerRecommendationPayload,
  FertilizerRecommendationsResponse,
  FertilizerRecommendationOptions,
} from "@/types/admin/fertilizerRecommendation";

const endpoint = "/admin/fertilizer-recommendations";
export const fertilizerRecommendationsAPI = {
  options: () =>
    apiRequest<ApiResponse<FertilizerRecommendationOptions>>(
      `${endpoint}/options`,
    ),
  list: (params: ApiParams = {}) =>
    apiRequest<FertilizerRecommendationsResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<FertilizerRecommendation>>(`${endpoint}/${id}`),
  create: (data: FertilizerRecommendationPayload) =>
    apiRequest<ApiResponse<FertilizerRecommendation>>(endpoint, {
      method: "POST",
      data,
    }),
  update: (id: number, data: FertilizerRecommendationPayload) =>
    apiRequest<ApiResponse<FertilizerRecommendation>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<FertilizerRecommendation>>(
      `${endpoint}/${id}/status`,
      {
        method: "PATCH",
        data: { is_active },
      },
    ),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
