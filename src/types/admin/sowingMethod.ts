import type { ApiValidationErrors, PaginatedResponse } from "@/types/api";

export const establishmentTypes = [
  "direct_sowing",
  "transplanting",
  "vegetative_planting",
  "other",
] as const;
export const cropScopes = ["all", "specific"] as const;
export const machineryRequirements = [
  "required",
  "optional",
  "not_required",
  "varies",
] as const;
export const methodLevels = ["low", "medium", "high", "varies"] as const;
interface MethodSettings {
  code: string;
  slug: string;
  establishment_type: (typeof establishmentTypes)[number];
  crop_scope: (typeof cropScopes)[number];
  supports_row_spacing: boolean | null;
  supports_plant_spacing: boolean | null;
  supports_field_layout: boolean | null;
  machinery_requirement: (typeof machineryRequirements)[number];
  labour_requirement: (typeof methodLevels)[number];
  cost_level: (typeof methodLevels)[number];
  sort_order: number;
}

export interface SowingMethodTranslation {
  title: string;
  short_description: string | null;
  description: string | null;
  advantages: string | null;
  disadvantages: string | null;
  suitable_conditions: string | null;
  resource_requirements: string | null;
  economic_considerations: string | null;
  important_considerations: string | null;
}

// The basic endpoint writes its title and summary to Laravel's default locale.
export const sowingMethodPrimaryLocale = "en";

export const sowingMethodTranslationLimits = {
  title: 200,
  short_description: 500,
  description: 16000,
  advantages: 16000,
  disadvantages: 16000,
  suitable_conditions: 16000,
  resource_requirements: 16000,
  economic_considerations: 16000,
  important_considerations: 16000,
} satisfies Record<keyof SowingMethodTranslation, number>;

export const requiredSowingMethodTranslationFields: readonly (keyof SowingMethodTranslation)[] =
  ["title", "short_description", "description"];

export interface SowingMethodImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export interface SowingMethodListItem extends MethodSettings {
  id: number;
  title: string | null;
  crops: { id: number; name: string | null }[];
  is_active: boolean;
  cover_image: SowingMethodImage | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SowingMethod extends SowingMethodListItem {
  translations: Record<string, SowingMethodTranslation>;
  images: SowingMethodImage[];
  is_complete: boolean;
  readiness_errors: ApiValidationErrors;
}

export type SowingMethodsResponse = PaginatedResponse<SowingMethodListItem>;
export type MethodOption = { value: string; label: string };
export interface SowingMethodOptions {
  establishment_types: MethodOption[];
  crop_scopes: MethodOption[];
  machinery_requirements: MethodOption[];
  labour_requirements: MethodOption[];
  cost_levels: MethodOption[];
  supported_locales: MethodOption[];
}

export interface SowingMethodBasicInput extends MethodSettings {
  crop_ids: number[];
  title: string;
  short_description: string | null;
}

export interface SowingMethodFormValues extends MethodSettings {
  crop_ids: number[];
  is_active: boolean;
  translations: Record<
    string,
    { [K in keyof SowingMethodTranslation]: string }
  >;
}

export type MethodGalleryItem =
  | { token: `id:${number}`; image: SowingMethodImage }
  | { token: `new:${string}`; file: File };

export interface SowingMethodImageChanges {
  remove_image_ids: number[];
  image_order: string[];
}
