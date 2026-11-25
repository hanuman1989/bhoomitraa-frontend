import type { PaginatedResponse } from "@/types/api";
import type { Region } from "@/types/admin/region";
import type { RegionScope } from "@/types/admin/cropStageTimeline";

export const templatePriorities = ["low", "medium", "high"] as const;
export const templateScheduleTypes = [
  "before_sowing",
  "after_sowing",
  "after_harvesting",
] as const;
export const templateScheduleBases = ["fixed_offsets", "growth_stage"] as const;
export const templateActivityTypes = [
  "information",
  "observation",
  "task",
] as const;
export const applicabilityScopes = ["all", "specific"] as const;
export const templateSmartActions = [
  "crop_details",
  "crop_planning",
  "field_layout_spacing",
  "sowing_planting_method",
  "soil_assessment",
  "soil_test",
  "seed_calculator",
  "seed_record",
  "sowing_record",
  "choose_seed",
  "fertilizer_recommendation",
  "fertilizer_record",
  "irrigation_recommendation",
  "irrigation_record",
  "water_management",
  "weather_forecast",
  "weather_alerts",
  "crop_observation",
  "growth_stage_tracking",
  "ai_crop_doctor",
  "ask_agricultural_expert",
  "pest_monitoring",
  "disease_monitoring",
  "yield_estimation",
  "actual_yield_record",
  "harvest_record",
  "produce_quality",
  "storage_record",
  "transport_record",
  "market_prices",
  "produce_sale",
  "income_estimation",
  "financial_summary",
  "expense_summary",
  "crop_profitability",
  "machinery_usage",
  "labour_assignment",
  "crop_completion",
  "knowledge_reference",
] as const;
export const requiredTemplateLocales = ["en", "hi"] as const;
export const maxTemplateOffset = 2147483647;

export type TemplatePriority = (typeof templatePriorities)[number];
export type TemplateScheduleType = (typeof templateScheduleTypes)[number];
export type TemplateScheduleBasis = (typeof templateScheduleBases)[number];
export type TemplateActivityType = (typeof templateActivityTypes)[number];
export type ApplicabilityScope = (typeof applicabilityScopes)[number];
export type TemplateSmartAction = (typeof templateSmartActions)[number];

export interface TemplateTranslation {
  locale: string;
  title: string;
  description: string | null;
  instructions: string | null;
}

export interface TemplateNamedRelation {
  id: number;
  name: string | null;
}

export interface TemplateSeasonRelation extends TemplateNamedRelation {
  slug: string | null;
  icon: string | null;
  start_month: number | null;
  end_month: number | null;
}

export interface TemplateKnowledgeSourceRelation {
  id: number;
  title: string | null;
  publisher: string | null;
  source_type: string | null;
  source_url: string | null;
  language: string | null;
  reference_identifier: string | null;
  verification_status: string;
  is_active: boolean;
}

export interface TemplateSelectionOption {
  id: number;
  label: string;
  is_active?: boolean;
  verified?: boolean;
}

export interface CropActivityTemplateListItem {
  id: number;
  crop_id: number;
  crop_name: string | null;
  crop_color?: string | null;
  category_id: number;
  category_name: string | null;
  crop_stage_id: number | null;
  crop_stage_name: string | null;
  variety_scope: ApplicabilityScope;
  crop_variety_ids: number[];
  varieties: TemplateNamedRelation[];
  season_scope: ApplicabilityScope;
  season_ids: number[];
  seasons: TemplateSeasonRelation[];
  schedule_type: TemplateScheduleType;
  schedule_basis: TemplateScheduleBasis;
  start_offset_days: number | null;
  end_offset_days: number | null;
  activity_type: TemplateActivityType;
  allow_status_update: boolean;
  allow_expenses: boolean;
  allow_labour: boolean;
  allow_notes: boolean;
  allow_attachments: boolean;
  allow_rescheduling: boolean;
  smart_actions: TemplateSmartAction[];
  knowledge_source_ids: number[];
  knowledge_sources: TemplateKnowledgeSourceRelation[];
  region_scope: RegionScope;
  priority: TemplatePriority;
  is_active: boolean;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}

export interface CropActivityTemplate extends CropActivityTemplateListItem {
  region_ids: number[];
  regions: Pick<Region, "id" | "parent_id" | "region_type" | "name">[];
  translations: Record<string, TemplateTranslation>;
  publication_warnings?: {
    code: "potential_overlap";
    template_ids: number[];
    message: string;
  }[];
}

export interface CropActivityTemplatePayload {
  crop_id: number;
  category_id: number;
  crop_stage_id: number | null;
  variety_scope: ApplicabilityScope;
  crop_variety_ids: number[];
  season_scope: ApplicabilityScope;
  season_ids: number[];
  knowledge_source_ids: number[];
  schedule_type: TemplateScheduleType;
  schedule_basis: TemplateScheduleBasis;
  start_offset_days: number | null;
  end_offset_days: number | null;
  activity_type: TemplateActivityType;
  allow_status_update: boolean;
  allow_expenses: boolean;
  allow_labour: boolean;
  allow_notes: boolean;
  allow_attachments: boolean;
  allow_rescheduling: boolean;
  smart_actions: TemplateSmartAction[];
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
  category_id: string;
  crop_stage_id: string;
  variety_scope: ApplicabilityScope;
  crop_variety_ids: number[];
  season_scope: ApplicabilityScope;
  season_ids: number[];
  knowledge_source_ids: number[];
  schedule_type: TemplateScheduleType;
  schedule_basis: TemplateScheduleBasis;
  start_offset_days: string;
  end_offset_days: string;
  activity_type: TemplateActivityType;
  allow_status_update: boolean;
  allow_expenses: boolean;
  allow_labour: boolean;
  allow_notes: boolean;
  allow_attachments: boolean;
  allow_rescheduling: boolean;
  smart_actions: TemplateSmartAction[];
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
  schedule_type: TemplateScheduleType | "";
  schedule_basis: TemplateScheduleBasis | "";
  activity_type: TemplateActivityType | "";
  priority: TemplatePriority | "";
  status: "" | "0" | "1";
}

export type CropActivityTemplatesResponse =
  PaginatedResponse<CropActivityTemplateListItem>;
