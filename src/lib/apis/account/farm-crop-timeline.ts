import "server-only";
import { apiRequest } from "@/lib/api/request";
import type { ApiResponse } from "@/types/api";
import type {
  ActivityMutationData,
  CropTimelineData,
  NoteInput,
  RescheduleInput,
} from "@/types/account/cropTimeline";

export const accountCropTimelineAPI = {
  get: (cycleId: number) =>
    apiRequest<ApiResponse<CropTimelineData>>(
      `/account/farm-crops/${cycleId}/timeline`,
      { audience: "web" },
    ),
  generate: (cycleId: number) =>
    apiRequest<ApiResponse<CropTimelineData>>(
      `/account/farm-crops/${cycleId}/timeline/generate`,
      { audience: "web", method: "POST" },
    ),
  alertSeen: (cycleId: number) =>
    apiRequest<ApiResponse<{ alert: { show: boolean } }>>(
      `/account/farm-crops/${cycleId}/timeline/alert-seen`,
      { audience: "web", method: "POST" },
    ),
  status: (activityId: number, action: "complete" | "reopen") =>
    apiRequest<ApiResponse<ActivityMutationData>>(
      `/account/crop-activities/${activityId}/status`,
      { audience: "web", method: "PATCH", data: { action } },
    ),
  schedule: (activityId: number, data: RescheduleInput) =>
    apiRequest<ApiResponse<ActivityMutationData>>(
      `/account/crop-activities/${activityId}/schedule`,
      { audience: "web", method: "PATCH", data },
    ),
  addNote: (activityId: number, data: NoteInput) =>
    apiRequest<ApiResponse<ActivityMutationData>>(
      `/account/crop-activities/${activityId}/notes`,
      { audience: "web", method: "POST", data },
    ),
  deleteNote: (noteId: number) =>
    apiRequest<ApiResponse<ActivityMutationData>>(
      `/account/crop-activity-notes/${noteId}`,
      { audience: "web", method: "DELETE" },
    ),
};
