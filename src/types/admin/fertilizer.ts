import type { ApiValidationErrors, PaginatedResponse } from "@/types/api";
import type {
  SeedImage,
  SeedListItem,
  SeedMediaPayload,
} from "@/types/admin/seed";
export { seedVerificationStatuses as fertilizerVerificationStatuses } from "@/types/admin/seed";

export const fertilizerTypes = [
  "straight",
  "complex",
  "mixed",
  "water_soluble",
  "organic",
  "biofertilizer",
  "micronutrient",
  "soil_amendment",
  "other",
] as const;
export const fertilizerForms = [
  "granular",
  "prilled",
  "powder",
  "crystalline",
  "liquid",
  "suspension",
  "other",
] as const;
export const fertilizerApplicationMethods = [
  "soil_application",
  "foliar_spray",
  "fertigation",
  "drip_application",
  "other",
] as const;
export const fertilizerUnitCodes = ["g", "kg", "l", "ml"] as const;
export const nutrientCodes = [
  "N",
  "P2O5",
  "K2O",
  "S",
  "Zn",
  "Fe",
  "Mn",
  "Cu",
  "B",
  "Ca",
  "Mg",
  "OC",
] as const;
export const nutrientContentUnits = [
  "percent_ww",
  "percent_wv",
  "g_per_l",
] as const;
export const optionalCompositionTypes: readonly string[] = [
  "organic",
  "biofertilizer",
  "soil_amendment",
  "other",
];
export type FertilizerStep = 1 | 2 | 3 | 4 | 5;
export interface FertilizerNutrientPayload {
  nutrient_code: (typeof nutrientCodes)[number];
  content_value: string;
  content_unit_code: (typeof nutrientContentUnits)[number];
}
export interface FertilizerNutrient extends FertilizerNutrientPayload {
  id: number;
}
export interface FertilizerTranslation {
  name: string;
  description: string | null;
  usage_instructions: string | null;
}
export interface FertilizerListItem extends Pick<
  SeedListItem,
  | "id"
  | "name"
  | "slug"
  | "brand_name"
  | "source_id"
  | "verification_status"
  | "is_active"
  | "requested_is_active"
  | "setup_status"
  | "primary_image"
  | "created_at"
  | "updated_at"
  | "added_at"
> {
  fertilizer_id: number;
  fertilizer_code: string | null;
  fertilizer_type: (typeof fertilizerTypes)[number];
  form: (typeof fertilizerForms)[number];
  grade: string | null;
  manufacturer_name: string | null;
  default_unit_code: (typeof fertilizerUnitCodes)[number];
  reference_pack_quantity: string | null;
  reference_pack_unit_code: (typeof fertilizerUnitCodes)[number] | null;
  application_method: (typeof fertilizerApplicationMethods)[number] | null;
  nutrients: FertilizerNutrient[];
  completed_step: FertilizerStep;
  next_step: FertilizerStep | null;
}
export interface Fertilizer extends FertilizerListItem {
  description: string | null;
  usage_instructions: string | null;
  composition_notes: string | null;
  translations: Record<string, FertilizerTranslation>;
  images: SeedImage[];
  source: SeedListItem["source"];
  ready_to_finalize?: boolean;
  readiness_errors?: ApiValidationErrors;
}
export type FertilizerBasicPayload = Pick<
  FertilizerListItem,
  | "slug"
  | "fertilizer_code"
  | "fertilizer_type"
  | "form"
  | "grade"
  | "brand_name"
  | "manufacturer_name"
  | "default_unit_code"
  | "reference_pack_quantity"
  | "reference_pack_unit_code"
  | "application_method"
> & { name: string };
export type FertilizerBasicValues = {
  [K in keyof FertilizerBasicPayload]: string;
};
export interface FertilizerNutrientValues {
  nutrients: {
    nutrient_code: string;
    content_value: string;
    content_unit_code: string;
  }[];
  composition_notes: string;
}
export interface FertilizerNutrientsPayload {
  nutrients: FertilizerNutrientPayload[];
  composition_notes: string | null;
}
export type FertilizerMediaPayload = SeedMediaPayload;
export interface FertilizerFilters {
  keyword: string;
  fertilizer_type: FertilizerListItem["fertilizer_type"] | "";
  form: FertilizerListItem["form"] | "";
  verification_status: FertilizerListItem["verification_status"] | "";
  is_active: "" | "0" | "1";
}
export type FertilizersResponse = PaginatedResponse<FertilizerListItem>;
