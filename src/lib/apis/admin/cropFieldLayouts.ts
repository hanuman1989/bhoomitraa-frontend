import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  CropFieldLayout,
  CropFieldLayoutBasicInput,
  CropFieldLayoutOptions,
  CropFieldLayoutReview,
  CropFieldLayoutsResponse,
  FieldLayoutConfigurationInput,
  FieldLayoutTranslation,
} from "@/types/admin/cropFieldLayout";

const endpoint = "/admin/crop-field-layouts";

export const cropFieldLayoutsAPI = {
  list: (params: ApiParams) =>
    apiRequest<CropFieldLayoutsResponse>(endpoint, { params }),
  options: () =>
    apiRequest<ApiResponse<CropFieldLayoutOptions>>(`${endpoint}/options`),
  show: (id: number) =>
    apiRequest<ApiResponse<CropFieldLayout>>(`${endpoint}/${id}`),
  review: (id: number) =>
    apiRequest<ApiResponse<CropFieldLayoutReview>>(`${endpoint}/${id}/review`),
  create: (data: CropFieldLayoutBasicInput) =>
    apiRequest<ApiResponse<CropFieldLayout>>(`${endpoint}/step-1`, {
      method: "POST",
      data,
    }),
  basic: (id: number, revision: number, data: CropFieldLayoutBasicInput) =>
    apiRequest<ApiResponse<CropFieldLayout>>(`${endpoint}/${id}/step-1`, {
      method: "PUT",
      data: { ...data, draft_revision: revision },
    }),
  configuration: (
    id: number,
    revision: number,
    data: FieldLayoutConfigurationInput,
  ) =>
    apiRequest<ApiResponse<CropFieldLayout>>(`${endpoint}/${id}/step-2`, {
      method: "PUT",
      data: { ...data, draft_revision: revision },
    }),
  translations: (
    id: number,
    revision: number,
    translations: Record<string, FieldLayoutTranslation>,
  ) =>
    apiRequest<ApiResponse<CropFieldLayout>>(`${endpoint}/${id}/step-3`, {
      method: "PUT",
      data: { translations, draft_revision: revision },
    }),
  finalize: (id: number, revision: number) =>
    apiRequest<ApiResponse<CropFieldLayout>>(`${endpoint}/${id}/finalize`, {
      method: "POST",
      data: { draft_revision: revision },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
