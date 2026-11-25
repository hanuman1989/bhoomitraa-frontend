import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  BoundaryStepPayload,
  CropCatalog,
  CropDetail,
  CropFilters,
  CropMapRecord,
  CropOccupancy,
  CropSelection,
  CropSummary,
  CropCycle,
} from "@/types/account/farmCrop";

const cataloguePaths = {
  seasons: "seasons",
  categories: "crop-categories",
  crops: "crops/list",
  varieties: "crop-varieties",
} as const;
export const accountCropCatalogAPI = {
  list: <K extends keyof CropCatalog>(kind: K, params: ApiParams = {}) => {
    if (!Object.hasOwn(cataloguePaths, kind))
      throw new Error("Invalid catalogue");
    return apiRequest<PaginatedResponse<CropCatalog[K]>>(
      `/account/${cataloguePaths[kind]}`,
      { audience: "web", params },
    );
  },
};
export const accountFarmCropsAPI = {
  list: (params: CropFilters) =>
    apiRequest<PaginatedResponse<CropCycle>>("/account/farm-crops", {
      audience: "web",
      params,
    }),
  summary: (params: CropFilters = {}) =>
    apiRequest<ApiResponse<CropSummary>>("/account/farm-crops/summary", {
      audience: "web",
      params,
    }),
  map: () =>
    apiRequest<ApiResponse<CropMapRecord[]>>("/account/farm-crops/map", {
      audience: "web",
      params: { status: "active" },
    }),
  get: (id: number) =>
    apiRequest<ApiResponse<CropDetail>>(`/account/farm-crops/${id}`, {
      audience: "web",
    }),
  create: (data: CropSelection, idempotencyKey: string) =>
    apiRequest<ApiResponse<CropDetail>>("/account/farm-crops", {
      audience: "web",
      method: "POST",
      data,
      idempotencyKey,
    }),
  selection: (id: number, revision: number, data: CropSelection) =>
    apiRequest<ApiResponse<CropDetail>>(`/account/farm-crops/${id}/step-1`, {
      audience: "web",
      method: "PUT",
      data: { ...data, revision },
    }),
  boundary: (id: number, revision: number, data: BoundaryStepPayload) =>
    apiRequest<ApiResponse<CropDetail>>(`/account/farm-crops/${id}/step-2`, {
      audience: "web",
      method: "PUT",
      data: { ...data, revision },
    }),
  occupancy: (farmId: number, excludeCropId?: number) =>
    apiRequest<ApiResponse<CropOccupancy>>(
      `/account/farms/${farmId}/crop-boundaries`,
      { audience: "web", params: { exclude_crop_id: excludeCropId } },
    ),
  review: (id: number) =>
    apiRequest<ApiResponse<CropDetail>>(`/account/farm-crops/${id}/review`, {
      audience: "web",
    }),
  finalize: (id: number, revision: number) =>
    apiRequest<ApiResponse<CropDetail>>(`/account/farm-crops/${id}/finalize`, {
      audience: "web",
      method: "POST",
      data: { revision },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`/account/farm-crops/${id}`, {
      audience: "web",
      method: "DELETE",
    }),
  discardEdit: (id: number, revision: number) =>
    apiRequest<ApiResponse<CropDetail>>(
      `/account/farm-crops/${id}/edit-draft`,
      { audience: "web", method: "DELETE", params: { revision } },
    ),
};
