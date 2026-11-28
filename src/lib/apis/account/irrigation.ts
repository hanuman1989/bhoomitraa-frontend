import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiResponse } from "@/types/api";
import type {
  CreateIrrigationAssetInput,
  IrrigationAsset,
  IrrigationFilters,
  IrrigationListResponse,
  IrrigationMapCollection,
  IrrigationOptions,
  IrrigationSummary,
  UpdateIrrigationAssetInput,
} from "@/types/account/irrigation";

const path = "/account/irrigation-assets";

/** The farmer's water sources and pipelines. Laravel scopes every request to the owner. */
export const accountIrrigationAPI = {
  list: (params: IrrigationFilters = {}) =>
    apiRequest<IrrigationListResponse>(path, {
      audience: "web",
      params: { ...params },
    }),
  summary: () =>
    apiRequest<ApiResponse<IrrigationSummary>>(`${path}/summary`, {
      audience: "web",
    }),
  map: ({ page, per_page, ...params }: IrrigationFilters = {}) =>
    apiRequest<ApiResponse<IrrigationMapCollection>>(`${path}/map`, {
      audience: "web",
      params,
    }),
  options: () =>
    apiRequest<ApiResponse<IrrigationOptions>>(`${path}/options`, {
      audience: "web",
    }),
  show: (id: string) =>
    apiRequest<ApiResponse<IrrigationAsset>>(`${path}/${id}`, {
      audience: "web",
    }),
  create: (data: CreateIrrigationAssetInput) =>
    apiRequest<ApiResponse<IrrigationAsset>>(path, {
      audience: "web",
      method: "POST",
      data,
    }),
  update: (id: string, data: UpdateIrrigationAssetInput) =>
    apiRequest<ApiResponse<IrrigationAsset>>(`${path}/${id}`, {
      audience: "web",
      method: "PATCH",
      data,
    }),
  remove: (id: string) =>
    apiRequest<ApiResponse<null>>(`${path}/${id}`, {
      audience: "web",
      method: "DELETE",
    }),
};
