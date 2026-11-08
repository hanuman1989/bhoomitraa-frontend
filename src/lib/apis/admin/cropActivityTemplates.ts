import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiParams, ApiResponse } from "@/types/api";
import type {
  CropActivityTemplate,
  CropActivityTemplatePayload,
  CropActivityTemplatesResponse,
} from "@/types/admin/cropActivityTemplate";
import { getTimelineOptions } from "@/lib/apis/admin/cropStageTimelines";
import type { TimelineChoices } from "@/types/admin/cropStageTimeline";

const endpoint = "/admin/crop-activity-templates";
export const cropActivityTemplatesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<CropActivityTemplatesResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<CropActivityTemplate>>(`${endpoint}/${id}`),
  create: (data: CropActivityTemplatePayload) =>
    apiRequest<ApiResponse<CropActivityTemplate>>(endpoint, {
      method: "POST",
      data,
    }),
  update: (id: number, data: Omit<CropActivityTemplatePayload, "crop_id">) =>
    apiRequest<ApiResponse<CropActivityTemplate>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<CropActivityTemplate>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};

export async function getTemplateChoices(
  cropId: number | null,
  eligible: boolean,
  includeSource = true,
): Promise<TimelineChoices> {
  const [crop, category, variety, stage, season, source] = await Promise.all([
    getTimelineOptions("crop", null, eligible),
    getTimelineOptions("category", null, eligible),
    cropId || !eligible
      ? getTimelineOptions("variety", cropId, eligible)
      : undefined,
    cropId || !eligible
      ? getTimelineOptions("stage", cropId, eligible)
      : undefined,
    getTimelineOptions("season", null, eligible),
    includeSource ? getTimelineOptions("source", null, false) : undefined,
  ]);
  return { crop, category, variety, stage, season, source };
}
