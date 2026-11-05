import "server-only";

import { apiRequest } from "@/lib/api/request";
import { ApiError } from "@/lib/api/ApiError";
import { cropsAPI } from "@/lib/apis/admin/crops";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  CropStage,
  CropStagePayload,
  CropStageCropOption,
  CropStagesListResponse,
} from "@/types/admin/cropStage";

const endpoint = "/admin/crop-stages";

export const cropStagesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<CropStagesListResponse>(endpoint, { params }),
  show: (id: number) => apiRequest<ApiResponse<CropStage>>(`${endpoint}/${id}`),
  create: (data: CropStagePayload) =>
    apiRequest<ApiResponse<CropStage>>(endpoint, { method: "POST", data }),
  // The parent crop is immutable; omit it from metadata updates.
  update: (id: number, data: Omit<CropStagePayload, "crop_id">) =>
    apiRequest<ApiResponse<CropStage>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<CropStage>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};

// Native select options are loaded server-side, including all API pages.
export async function getCropStageCropOptions(
  activeOnly: boolean,
): Promise<CropStageCropOption[]> {
  const options: CropStageCropOption[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await cropsAPI.list({
      page,
      per_page: 100,
      ...(activeOnly && { is_active: 1 }),
    });
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError("Invalid crop options response", 502);
    options.push(
      ...response.data.map((crop) => ({
        id: crop.id,
        name: crop.name ?? crop.slug,
      })),
    );
    lastPage = response.pagination.last_page;
    page++;
  } while (page <= lastPage);
  return options;
}
