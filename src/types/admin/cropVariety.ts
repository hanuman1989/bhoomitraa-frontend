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
  knowledge_sources: number[];
  is_active: boolean;
  translations: Record<
    string,
    { name: string; description: string | null; region_notes: string | null }
  >;
}
export type CropVarietySourceOption = Pick<KnowledgeSource, "id" | "title"> &
  Partial<Pick<KnowledgeSource, "is_active" | "verification_status">>;
export interface CropVariety extends Omit<
  CropVarietyPayload,
  "translations" | "knowledge_sources"
> {
  id: number;
  name: string | null;
  crop_name: string | null;
  crop_color?: Crop["crop_color"];
  crop_slug: string | null;
  knowledge_sources: CropVarietySourceOption[];
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
  knowledge_sources: number[];
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
