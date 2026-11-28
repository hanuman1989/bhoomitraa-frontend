import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  SowingMethod,
  SowingMethodBasicInput,
  SowingMethodImageChanges,
  SowingMethodOptions,
  SowingMethodsResponse,
  SowingMethodTranslation,
} from "@/types/admin/sowingMethod";

const endpoint = "/admin/sowing-methods";

export const sowingMethodsAPI = {
  list: (params: ApiParams) =>
    apiRequest<SowingMethodsResponse>(endpoint, { params }),
  options: () =>
    apiRequest<ApiResponse<SowingMethodOptions>>(`${endpoint}/options`),
  show: (id: number) =>
    apiRequest<ApiResponse<SowingMethod>>(`${endpoint}/${id}`),
  create: (data: SowingMethodBasicInput) =>
    apiRequest<ApiResponse<SowingMethod>>(endpoint, {
      method: "POST",
      data: { ...data, is_active: false },
    }),
  update: (id: number, data: SowingMethodBasicInput) =>
    apiRequest<ApiResponse<SowingMethod>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  translations: (
    id: number,
    translations: Record<string, SowingMethodTranslation>,
  ) =>
    apiRequest<ApiResponse<SowingMethod>>(`${endpoint}/${id}/step-2`, {
      method: "PATCH",
      data: { translations },
    }),
  images: (
    id: number,
    changes: SowingMethodImageChanges,
    uploads: FormData,
  ) => {
    if (Array.from(uploads.keys()).length === 0) {
      return apiRequest<ApiResponse<SowingMethod>>(`${endpoint}/${id}/step-3`, {
        method: "POST",
        data: changes,
      });
    }
    const data = new FormData();
    for (const [key, file] of uploads) data.append(key, file);
    for (const id of changes.remove_image_ids)
      data.append("remove_image_ids[]", String(id));
    for (const token of changes.image_order)
      data.append("image_order[]", token);
    return apiRequest<ApiResponse<SowingMethod>>(`${endpoint}/${id}/step-3`, {
      method: "POST",
      data,
    });
  },
  finalize: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<SowingMethod>>(`${endpoint}/${id}/finalize`, {
      method: "POST",
      data: { is_active },
    }),
  status: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<SowingMethod>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};
