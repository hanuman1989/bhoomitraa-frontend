import type { PaginatedResponse } from "@/types/api";

// Required by Laravel; other configured locales are optional.
export const requiredStageLocales = ["en", "hi"] as const;

export interface CropStageTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface CropStageListItem {
  id: number;
  crop_id: number;
  crop_name: string | null;
  code: string;
  sequence: number;
  is_active: boolean;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}

export interface CropStage extends CropStageListItem {
  translations: Record<string, CropStageTranslation>;
}

export interface CropStagePayload {
  crop_id: number;
  code: string;
  sequence: number;
  translations: Record<string, { name: string; description: string | null }>;
}

export interface CropStageFormValues {
  crop_id: string;
  code: string;
  sequence: string;
  is_active: boolean;
  translations: Record<string, { name: string; description: string }>;
}

export interface CropStagesFilterValues {
  keyword: string;
  crop_id: string;
  status: "" | "1" | "0";
}

export interface CropStageCropOption {
  id: number;
  name: string;
}

export type CropStagesListResponse = PaginatedResponse<CropStageListItem>;
