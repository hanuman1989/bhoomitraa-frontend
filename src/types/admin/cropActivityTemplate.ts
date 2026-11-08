import type { PaginatedResponse } from "@/types/api";
import type { Region } from "@/types/admin/region";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import type { RegionScope } from "@/types/admin/cropStageTimeline";

export const templatePriorities = ["low", "medium", "high"] as const;
export const requiredTemplateLocales = ["en", "hi"] as const;
export const maxTemplateOffset = 2147483647;
export type TemplatePriority = (typeof templatePriorities)[number];
export interface TemplateTranslation {
  locale: string;
  title: string;
  description: string | null;
  instructions: string | null;
}
export interface CropActivityTemplateListItem {
  id: number;
  crop_id: number;
  crop_name: string | null;
  crop_variety_id: number | null;
  crop_variety_name: string | null;
  category_id: number;
  category_name: string | null;
  crop_stage_id: number | null;
  crop_stage_name: string | null;
  season_id: number;
  season_name: string | null;
  schedule_type: "after_sowing";
  start_offset_days: number;
  end_offset_days: number;
  region_scope: RegionScope;
  priority: TemplatePriority;
  source_id: number;
  source_title: string | null;
  is_active: boolean;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}
export interface CropActivityTemplate extends CropActivityTemplateListItem {
  region_ids: number[];
  regions: Pick<Region, "id" | "parent_id" | "region_type" | "name">[];
  source: Pick<
    KnowledgeSource,
    | "id"
    | "title"
    | "publisher"
    | "source_type"
    | "source_url"
    | "language"
    | "reference_identifier"
    | "verification_status"
    | "is_active"
  > | null;
  description: string | null;
  instructions: string | null;
  translations: Record<string, TemplateTranslation>;
  publication_warnings?: {
    code: "potential_overlap";
    template_ids: number[];
    message: string;
  }[];
}
export interface CropActivityTemplatePayload {
  crop_id: number;
  crop_variety_id: number | null;
  category_id: number;
  crop_stage_id: number | null;
  season_id: number;
  source_id: number;
  schedule_type: "after_sowing";
  start_offset_days: number;
  end_offset_days: number;
  region_scope: RegionScope;
  region_ids: number[];
  priority: TemplatePriority;
  translations: Record<
    string,
    { title: string; description: string | null; instructions: string | null }
  >;
}
export interface CropActivityTemplateFormValues {
  crop_id: string;
  crop_variety_id: string;
  category_id: string;
  crop_stage_id: string;
  season_id: string;
  source_id: string;
  schedule_type: "after_sowing";
  start_offset_days: string;
  end_offset_days: string;
  region_scope: RegionScope;
  region_ids: number[];
  priority: TemplatePriority;
  translations: Record<
    string,
    { title: string; description: string; instructions: string }
  >;
}
export interface CropActivityTemplateFilters {
  keyword: string;
  crop_id: string;
  category_id: string;
  crop_variety_id: string;
  crop_stage_id: string;
  season_id: string;
  priority: TemplatePriority | "";
  status: "" | "0" | "1";
}
export type CropActivityTemplatesResponse =
  PaginatedResponse<CropActivityTemplateListItem>;
