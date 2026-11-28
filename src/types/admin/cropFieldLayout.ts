import type { ApiValidationErrors, PaginatedResponse } from "@/types/api";

export interface FieldLayoutOption {
  value: string;
  label: string;
}

export interface FieldLayoutConfigurationField {
  key: string;
  label: string;
  type: "number" | "integer" | "select";
  required: boolean;
  display_unit: "cm" | "m" | "count" | null;
  storage_unit: "m" | "count" | null;
  min?: number;
  max?: number;
  default?: string;
  options?: string[];
  required_when?: Record<string, string>;
}

export interface FieldLayoutDefinition extends FieldLayoutOption {
  configuration_version: number;
  preview_key: string;
  fields: FieldLayoutConfigurationField[];
}

export interface CropFieldLayoutOptions {
  crop_scopes: FieldLayoutOption[];
  farming_types: FieldLayoutOption[];
  growing_systems: FieldLayoutOption[];
  layout_types: FieldLayoutDefinition[];
  deferred_layout_types: string[];
  supported_locales: (FieldLayoutOption & { required: boolean })[];
  default_locale: string;
  master_data_endpoints: {
    crops: string;
    crop_varieties: string;
    sowing_methods: string;
  };
}

export type FieldLayoutConfiguration = Record<string, number | string>;
export type FieldLayoutStep = 1 | 2 | 3 | 4;

export interface CropFieldLayoutWizard {
  completed_step: 0 | FieldLayoutStep;
  completed_steps: FieldLayoutStep[];
  is_finalized: boolean;
  has_pending_edit: boolean;
  requested_is_active: boolean;
  revision: number;
}

interface LayoutReadiness extends CropFieldLayoutWizard {
  can_finalize: boolean;
  readiness_errors: ApiValidationErrors;
}

interface BasicFields {
  crop_scope: "all" | "specific";
  crop_variety_id: number | null;
  sowing_method_id: number | null;
  farming_type: string | null;
  growing_system: string | null;
  layout_type: string;
  sort_order: number;
  is_active: boolean;
}

interface DisplayRelations {
  crops: { id: number; name: string | null }[];
  crop_variety: { id: number; name: string | null } | null;
  sowing_method: { id: number; title: string | null } | null;
  layout_type_label: string | null;
  farming_type_label: string | null;
  growing_system_label: string | null;
}

export interface CropFieldLayoutBasicInput extends BasicFields {
  crop_ids: number[];
}

export interface CropFieldLayoutBasicDetails
  extends CropFieldLayoutBasicInput, DisplayRelations {
  requested_is_active: boolean;
}

export const fieldLayoutTranslationLimits = {
  title: 200,
  description: 16000,
  important_considerations: 16000,
} as const;

export interface FieldLayoutTranslation {
  title: string;
  description: string | null;
  important_considerations: string | null;
}

export interface SavedFieldLayoutTranslation extends FieldLayoutTranslation {
  locale: string;
  language_name: string;
}

export interface FieldLayoutConfigurationInput {
  configuration: FieldLayoutConfiguration;
  reference_note: string | null;
}

type ConfigurationDefinition = FieldLayoutDefinition | [];

export interface CropFieldLayoutSections {
  basic_details: CropFieldLayoutBasicDetails;
  layout_configuration: FieldLayoutConfigurationInput & {
    layout_type: string;
    configuration_version: number;
    definition: ConfigurationDefinition;
  };
  translations: Record<string, SavedFieldLayoutTranslation>;
}

export interface CropFieldLayoutReview extends CropFieldLayoutSections {
  id: number;
  wizard: LayoutReadiness;
}

export interface CropFieldLayoutListItem
  extends BasicFields, DisplayRelations, FieldLayoutConfigurationInput {
  id: number;
  title: string;
  configuration_version: number;
  created_at: string | null;
  updated_at: string | null;
  wizard: CropFieldLayoutWizard;
}

export interface CropFieldLayout extends CropFieldLayoutListItem {
  wizard: LayoutReadiness;
  configuration_definition: ConfigurationDefinition;
  draft: CropFieldLayoutSections | null;
  translations: Record<string, SavedFieldLayoutTranslation>;
}

export type CropFieldLayoutsResponse =
  PaginatedResponse<CropFieldLayoutListItem>;

export interface CropFieldLayoutFilters {
  crop_id: string;
  sowing_method_id: string;
  layout_type: string;
  farming_type: string;
  keyword: string;
}

export interface CropFieldLayoutFormValues extends CropFieldLayoutBasicInput {
  configuration: Record<string, string>;
  reference_note: string;
  translations: Record<string, { [K in keyof FieldLayoutTranslation]: string }>;
}
