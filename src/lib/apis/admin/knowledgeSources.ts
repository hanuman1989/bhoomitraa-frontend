import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  KnowledgeSource,
  KnowledgeSourceAttachment,
  KnowledgeSourcePayload,
  KnowledgeSourceReviewPayload,
  KnowledgeSourcesListResponse,
} from "@/types/admin/knowledgeSource";

const endpoint = "/admin/knowledge-sources";

export const knowledgeSourcesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<KnowledgeSourcesListResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<KnowledgeSource>>(`${endpoint}/${id}`),
  create: (data: KnowledgeSourcePayload) =>
    apiRequest<ApiResponse<KnowledgeSource>>(endpoint, {
      method: "POST",
      data,
    }),
  update: (id: number, data: KnowledgeSourcePayload) =>
    apiRequest<ApiResponse<KnowledgeSource>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
  review: (id: number, data: KnowledgeSourceReviewPayload) =>
    apiRequest<ApiResponse<KnowledgeSource>>(`${endpoint}/${id}/review`, {
      method: "POST",
      data,
    }),
  status: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<KnowledgeSource>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  upload: (id: number, data: FormData) =>
    apiRequest<ApiResponse<KnowledgeSourceAttachment[]>>(
      `${endpoint}/${id}/attachments`,
      { method: "POST", data },
    ),
  deleteAttachment: (id: number, attachment: number) =>
    apiRequest<ApiResponse<null>>(
      `${endpoint}/${id}/attachments/${attachment}`,
      { method: "DELETE" },
    ),
  downloadAttachment: (id: number, attachment: number) =>
    apiRequest(`${endpoint}/${id}/attachments/${attachment}`, {
      responseType: "binary",
    }),
};
