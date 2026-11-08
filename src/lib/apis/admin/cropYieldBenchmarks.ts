import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  CropYieldBenchmark,
  CropYieldBenchmarkPayload,
  CropYieldBenchmarksResponse,
} from "@/types/admin/cropYieldBenchmark";

const endpoint = "/admin/crop-yield-benchmarks";
export const cropYieldBenchmarksAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<CropYieldBenchmarksResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<CropYieldBenchmark>>(`${endpoint}/${id}`),
  create: (data: CropYieldBenchmarkPayload) =>
    apiRequest<ApiResponse<CropYieldBenchmark>>(endpoint, {
      method: "POST",
      data,
    }),
  update: (id: number, data: CropYieldBenchmarkPayload) =>
    apiRequest<ApiResponse<CropYieldBenchmark>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<CropYieldBenchmark>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
