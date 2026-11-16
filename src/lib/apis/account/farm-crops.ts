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
  FertilizerRecommendation,
  FertilizerStepPayload,
  SeedRecommendation,
  SeedStepPayload,
  CropCycle,
} from "@/types/account/farmCrop";

const cataloguePaths = {
  seasons: "seasons",
  categories: "crop-categories",
  crops: "crops/list",
  varieties: "crop-varieties",
  seeds: "seeds",
  fertilizers: "fertilizers",
  seedPrices: "seed-prices",
  fertilizerPrices: "fertilizer-prices",
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
  seed: (id: number, revision: number, data: SeedStepPayload) =>
    apiRequest<ApiResponse<CropDetail>>(`/account/farm-crops/${id}/step-3`, {
      audience: "web",
      method: "PUT",
      data: { ...data, revision },
    }),
  soil: (id: number, revision: number, data: FormData) => {
    data.set("revision", String(revision));
    return apiRequest<ApiResponse<CropDetail>>(
      `/account/farm-crops/${id}/step-4`,
      { audience: "web", method: "POST", data },
    );
  },
  fertilizer: (id: number, revision: number, data: FertilizerStepPayload) =>
    apiRequest<ApiResponse<CropDetail>>(`/account/farm-crops/${id}/step-5`, {
      audience: "web",
      method: "PUT",
      data: { ...data, revision },
    }),
  occupancy: (farmId: number, excludeCropId?: number) =>
    apiRequest<ApiResponse<CropOccupancy>>(
      `/account/farms/${farmId}/crop-boundaries`,
      { audience: "web", params: { exclude_crop_id: excludeCropId } },
    ),
  seedRecommendation: (id: number, seedId?: number) =>
    apiRequest<ApiResponse<SeedRecommendation>>(
      `/account/farm-crops/${id}/seed-recommendation`,
      { audience: "web", params: { seed_id: seedId } },
    ),
  fertilizerRecommendation: (id: number) =>
    apiRequest<ApiResponse<FertilizerRecommendation>>(
      `/account/farm-crops/${id}/fertilizer-recommendation`,
      { audience: "web" },
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
  soilReport: (id: number) =>
    apiRequest(`/account/farm-crops/${id}/soil-report`, {
      audience: "web",
      responseType: "binary",
    }),
};
