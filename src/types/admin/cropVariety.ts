import type { PaginatedResponse } from "@/types/api";
import type { Crop } from "./crop";
import type { KnowledgeSource } from "./knowledgeSource";

// Required by Laravel's CropVariety contract; available languages come from i18n/languages.
export const requiredVarietyLocales = ["en", "hi"] as const;

export interface CropVarietyTranslation {
  locale: string;
  name: string;
  description: string | null;
  region_notes: string | null;
}
export interface CropVarietyPayload {
  crop_id: number;
  slug: string;
  variety_code: string | null;
  maturity_days_min: number | null;
  maturity_days_max: number | null;
  source_id: number | null;
  is_active: boolean;
  translations: Record<
    string,
    { name: string; description: string | null; region_notes: string | null }
  >;
}
export interface CropVariety extends Omit<CropVarietyPayload, "translations"> {
  id: number;
  name: string | null;
  crop_name: string | null;
  crop_slug: string | null;
  source_title: string | null;
  translations: Record<string, CropVarietyTranslation>;
  added_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export interface CropVarietyFormValues {
  crop_id: string;
  slug: string;
  variety_code: string;
  maturity_days_min: string;
  maturity_days_max: string;
  source_id: string;
  is_active: boolean;
  translations: Record<
    string,
    { name: string; description: string; region_notes: string }
  >;
}
export interface CropVarietiesFilterValues {
  keyword: string;
  crop_id: string;
  source_id: string;
  status: "" | "1" | "0";
}
export type CropVarietiesListResponse = PaginatedResponse<CropVariety>;
export type VarietyRelation = Crop | KnowledgeSource;
export type VarietyRelationPage = PaginatedResponse<VarietyRelation>;
