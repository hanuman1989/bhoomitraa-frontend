import type { PaginatedResponse } from "@/types/api";
import type {
  CropYieldBenchmark,
  CropYieldBenchmarkListItem,
} from "@/types/admin/cropYieldBenchmark";
import type {
  FertilizerNutrientPayload,
  Fertilizer,
} from "@/types/admin/fertilizer";
import type { CropSeedRate } from "@/types/admin/cropSeedRate";

export interface RecommendationOption {
  value: string;
  label: string;
}
export interface FertilizerRecommendationOptions {
  recommendation_types: RecommendationOption[];
  irrigation_conditions: RecommendationOption[];
  soil_conditions: RecommendationOption[];
  application_methods: RecommendationOption[];
  nutrient_codes: RecommendationOption[];
  unit_codes: RecommendationOption[];
  area_unit_codes: RecommendationOption[];
  region_scopes: RecommendationOption[];
  soil_condition_definition: string;
}
export interface RecommendationNutrientPayload {
  nutrient_code: FertilizerNutrientPayload["nutrient_code"];
  recommended_quantity: string;
  unit_code: Fertilizer["default_unit_code"];
  area_unit_code: CropSeedRate["area_unit_code"];
}
export interface RecommendationNutrient extends RecommendationNutrientPayload {
  id: number;
  created_at: string | null;
  updated_at: string | null;
}
export interface FertilizerRecommendationListItem extends Omit<
  CropYieldBenchmarkListItem,
  "yield_min_kg_ha" | "yield_avg_kg_ha" | "yield_max_kg_ha" | "benchmark_type"
> {
  recommendation_type: string;
  irrigation_condition: string | null;
  soil_condition: string | null;
  application_method: string | null;
  reference_code: string | null;
  basal_dose_notes: string | null;
  top_dressing_notes: string | null;
  general_advisory: string | null;
  nutrients: RecommendationNutrient[];
}
export interface FertilizerRecommendation extends FertilizerRecommendationListItem {
  region_ids: number[];
  regions: CropYieldBenchmark["regions"];
}
export type FertilizerRecommendationPayload = Pick<
  FertilizerRecommendation,
  | "crop_id"
  | "crop_variety_id"
  | "season_id"
  | "recommendation_type"
  | "irrigation_condition"
  | "soil_condition"
  | "application_method"
  | "reference_code"
  | "basal_dose_notes"
  | "top_dressing_notes"
  | "general_advisory"
  | "source_id"
  | "reference_year"
  | "notes"
  | "is_active"
  | "region_scope"
  | "region_ids"
> & { nutrients: RecommendationNutrientPayload[] };
export type FertilizerRecommendationFormValues = {
  [K in keyof FertilizerRecommendationPayload]: K extends "region_ids"
    ? number[]
    : K extends "is_active"
      ? boolean
      : K extends "region_scope"
        ? FertilizerRecommendation["region_scope"]
        : K extends "nutrients"
          ? {
              nutrient_code: string;
              recommended_quantity: string;
              unit_code: string;
              area_unit_code: string;
            }[]
          : string;
};
export interface FertilizerRecommendationFilters {
  keyword: string;
  crop_id: string;
  crop_variety_id: string;
  season_id: string;
  recommendation_type: string;
  region_scope: FertilizerRecommendation["region_scope"] | "";
  is_active: "" | "0" | "1";
}
export type FertilizerRecommendationsResponse =
  PaginatedResponse<FertilizerRecommendationListItem>;
