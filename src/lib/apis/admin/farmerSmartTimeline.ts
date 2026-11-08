import "server-only";

import { apiRequest } from "@/lib/api/request";
import type { ApiResponse } from "@/types/api";
import type {
  TimelinePreviewData,
  TimelinePreviewInput,
} from "@/types/admin/farmerSmartTimeline";

export function generateFarmerSmartTimelinePreview(data: TimelinePreviewInput) {
  return apiRequest<ApiResponse<TimelinePreviewData>>(
    "/admin/farmer-smart-timeline/preview",
    {
      method: "POST",
      data,
    },
  );
}
