import type { ApiParams, ApiValidationErrors } from "@/types/api";
import type { Boundary, Farm } from "./farm";
import type { SeasonPresentation } from "@/types/season";

export type CropStatus = "draft" | "active" | "completed" | "cancelled";
export type CropStep =
  | "crop_selection"
  | "boundary"
  | "seed_sowing"
  | "soil_assessment"
  | "fertilizer_planning";
export type SowingMethod =
  "broadcasting" | "line_sowing" | "drilling" | "transplanting" | "dibbling";
export interface CatalogueRecord {
  id: number;
  name: string | null;
  description?: string | null;
  image?: string | null;
}
export interface CropSeason extends CatalogueRecord, SeasonPresentation {
  slug: string;
}
export interface CropCategory extends CatalogueRecord {
  crops_count?: number;
}
export interface CatalogueCrop extends CatalogueRecord {
  slug: string;
  crop_code: string | null;
  category_id: number;
  crop_color: string | null;
  is_recommendate: boolean;
}
export interface CropVariety extends CatalogueRecord {
  crop_id: number;
  maturity_days_min: number | null;
  maturity_days_max: number | null;
  region_notes: string | null;
}
export interface CropSeed extends CatalogueRecord {
  crop_id: number;
  crop_variety_id: number | null;
  brand_name: string | null;
  default_unit_code: string;
  material_type: string;
  seed_class: string | null;
  verification_status: string;
}
export interface CropFertilizer extends CatalogueRecord {
  brand_name: string | null;
  grade: string | null;
  fertilizer_type: string;
  default_unit_code: string;
  usage_instructions: string | null;
  nutrients: {
    nutrient_code: string;
    content_value: string;
    content_unit_code: string;
  }[];
}
export interface RegionalRecord {
  id: number;
  region_scope: string;
  match_type?: "exact_region" | "parent_region" | "general";
  source?: {
    id: number;
    title: string | null;
    source_url: string | null;
  } | null;
  notes?: string | null;
  matched_region?: { id: number; name: string | null } | null;
}
export interface CropPrice extends RegionalRecord {
  package_quantity: string;
  package_unit_code: string;
  package_price: string;
  currency_code: string;
  seller_name: string | null;
  price_type: string;
}
export interface CropCatalog {
  seasons: CropSeason;
  categories: CropCategory;
  crops: CatalogueCrop;
  varieties: CropVariety;
  seeds: CropSeed;
  fertilizers: CropFertilizer;
  seedPrices: CropPrice;
  fertilizerPrices: CropPrice;
}
export interface CropSelection {
  farm_id: number;
  crop_id: number;
  crop_variety_id: number | null;
  season_id: number;
  sowing_method: SowingMethod | null;
}
export interface CropMapRecord {
  id: number;
  farm_id: number;
  crop_id: number;
  crop_name: string | null;
  crop_variety_name: string | null;
  crop_color: string | null;
  status: CropStatus;
  boundary: Boundary | null;
  latitude: string | null;
  longitude: string | null;
  cultivated_area: string | null;
  area_unit: string | null;
}
export interface CropCycle {
  id: number;
  status: CropStatus;
  revision: number;
  completed_step: number;
  next_step: number | null;
  wizard_progress: Record<
    CropStep,
    "pending" | "completed" | "skipped" | "needs_review"
  >;
  farm: Farm;
  crop: CatalogueCrop;
  crop_variety: CropVariety | null;
  season: CropSeason;
  sowing_method: SowingMethod | null;
  sowing_date: string | null;
  expected_harvest_date: string | null;
  expected_harvest_date_min: string | null;
  expected_harvest_date_max: string | null;
  cultivated_area: string | null;
  area_unit: string | null;
  calculated_area_sqm: string | null;
  boundary_source: "farm_boundary" | "manual" | "gps" | "manual_area" | null;
  latitude: string | null;
  longitude: string | null;
}
export interface CropSummary {
  total_crops: number;
  active_crops: number;
  draft_crops: number;
  completed_crops: number;
  cancelled_crops: number;
  total_cultivated_area: string | null;
  total_cultivated_area_unit: string;
  measurement_complete: boolean;
}
export interface CropFilters extends ApiParams {
  search?: string;
  farm_id?: number;
  season_id?: number;
  status?: CropStatus;
  page?: number;
  per_page?: number;
}
export interface AreaStatistic {
  value: string | null;
  unit: string | null;
  square_metres: string | null;
}
export type OccupiedCrop = Pick<
  CropMapRecord,
  | "id"
  | "crop_id"
  | "crop_name"
  | "crop_color"
  | "boundary"
  | "cultivated_area"
  | "area_unit"
>;
export interface CropOccupancy {
  farm: Farm;
  farm_boundary: Boundary | null;
  existing_active_crops: OccupiedCrop[];
  recorded_farm_area: AreaStatistic;
  measured_farm_area: AreaStatistic;
  existing_crop_area: AreaStatistic;
  remaining_area: AreaStatistic;
  can_use_full_farm_boundary: boolean;
}
export interface SeedRecommendation {
  availability_status: string;
  recommended_quantity: string | null;
  recommended_min_quantity: string | null;
  recommended_max_quantity: string | null;
  quantity_unit: string | null;
  seed_rate: RegionalRecord | null;
}
export interface PurchaseEstimate {
  availability_status: string;
  package_quantity: string | null;
  package_unit_code: string | null;
  package_count: number | null;
  estimated_cost: string | null;
  manual_estimated_cost: string | null;
  currency_code: string;
  price_id: number | null;
}
export interface SeedSowingDetails extends Partial<SeedRecommendation> {
  seed: CropSeed | null;
  seed_source:
    "catalogue" | "farm_saved" | "local" | "other" | "unknown" | null;
  seed_quantity: string | null;
  seed_quantity_unit: string | null;
  seed_notes: string | null;
  quantity_mode?: "suggested" | "custom" | "unknown";
  purchase?: PurchaseEstimate;
  maturity?: {
    maturity_status: string;
    maturity_days_min: number | null;
    maturity_days_max: number | null;
  };
  calculations_current: boolean;
}
export interface BasicSoilAssessment {
  fertile_capacity?: string | null;
  soil_moisture?: string | null;
  drainage_condition?: string | null;
  water_availability?: string | null;
  notes?: string | null;
}
export interface SoilMeasurements {
  soil_ph?: string | null;
  electrical_conductivity?: string | null;
  organic_carbon?: string | null;
  nitrogen?: string | null;
  phosphorus?: string | null;
  potassium?: string | null;
  sulphur?: string | null;
  zinc?: string | null;
  iron?: string | null;
  copper?: string | null;
  manganese?: string | null;
  boron?: string | null;
}
export interface CropSoilTest extends SoilMeasurements {
  test_date?: string;
  sample_collected_at?: string | null;
  laboratory_name?: string | null;
  report_number?: string | null;
  sample_depth_cm?: string | null;
  notes?: string | null;
  measurement_units?: Record<keyof SoilMeasurements, string>;
  report_available?: boolean;
}
export interface CropSoil {
  assessment_mode: "basic" | "soil_test" | "skipped" | null;
  basic_assessment: BasicSoilAssessment | null;
  soil_test: CropSoilTest | null;
  estimated_soil_test_cost: string | null;
}
export interface FertilizerRecommendation {
  availability_status: string;
  recommendation:
    | (RegionalRecord & {
        basal_dose_notes?: string | null;
        top_dressing_notes?: string | null;
        general_advisory?: string | null;
      })
    | null;
  nutrient_requirements: {
    nutrient_code: string;
    total_quantity: string | null;
    unit_code: string;
    availability_status: string;
  }[];
  compatible_products: CropFertilizer[];
  suggested_product_quantities: null;
  recommendation_status: string;
  soil_interpretation_status: string;
}
export interface FertilizerPlanRow {
  id?: number;
  fertilizer_id: number | null;
  custom_name?: string | null;
  fertilizer_recommendation_id?: number | null;
  quantity_mode: "custom";
  planned_quantity: string;
  quantity_unit_code: string;
  fertilizer_price_id: number | null;
  manual_estimated_cost?: string | null;
  currency_code?: string;
  notes?: string | null;
}
export interface SavedFertilizer extends FertilizerPlanRow {
  fertilizer: CropFertilizer | null;
  estimated_cost: string | null;
}
export interface CropExpenses {
  estimated_seed_cost: string | null;
  estimated_soil_test_cost: string | null;
  estimated_fertilizer_cost: string | null;
  known_subtotal: string;
  total_estimated_cost: string | null;
  currency_code: string;
  is_complete: boolean;
  component_states: Record<string, string>;
}
export interface CropYield {
  availability_status: string;
  benchmark:
    | (RegionalRecord & {
        yield_min_kg_ha: string | null;
        yield_avg_kg_ha: string | null;
        yield_max_kg_ha: string | null;
      })
    | null;
  estimated_min_yield: string | null;
  estimated_avg_yield: string | null;
  estimated_max_yield: string | null;
  yield_unit: string;
  display_unit: string;
  display_estimates: {
    estimated_min_yield: string | null;
    estimated_avg_yield: string | null;
    estimated_max_yield: string | null;
  } | null;
}
export interface CropDetail extends CropCycle {
  boundary_details: {
    boundary: Boundary | null;
    farm_boundary: Boundary | null;
    gps_accuracy_m: string | null;
    calculated_area_ha: string | null;
    existing_crop_boundaries: OccupiedCrop[];
  };
  seed_sowing_details: SeedSowingDetails;
  soil_assessment: CropSoil;
  fertilizer_plan: {
    selected_fertilizers: SavedFertilizer[];
    skipped: boolean;
    recommendation_details: FertilizerRecommendation | null;
  };
  expenses: CropExpenses;
  expected_yield: CropYield | null;
  validation_issues: ApiValidationErrors;
  can_finalize: boolean;
  has_pending_edit: boolean;
  timeline_generated: false;
  estimates_are_historical: boolean;
  saved_step_data: { crop_selection: CropSelection };
}
export interface BoundaryStepPayload {
  boundary_source: "farm_boundary" | "manual" | "gps" | "manual_area";
  boundary?: Boundary | null;
  cultivated_area?: string;
  area_unit: string;
  gps_accuracy_m?: number | null;
}
export interface SeedStepPayload {
  seed_source: NonNullable<SeedSowingDetails["seed_source"]>;
  seed_id: number | null;
  sowing_date: string;
  quantity_mode: "suggested" | "custom" | "unknown";
  seed_quantity: string | null;
  seed_quantity_unit: string | null;
  seed_price_id: number | null;
  manual_estimated_cost: string | null;
  seed_notes: string | null;
}
export interface FertilizerStepPayload {
  skipped: boolean;
  fertilizers: FertilizerPlanRow[];
}
export type CropSaveResult = import("@/types/api").ActionResult<CropDetail> & {
  conflict?: boolean;
};
export interface CropStepProps {
  crop: CropDetail;
  busy: boolean;
  onSave: (
    step: 1 | 2 | 3 | 4 | 5,
    values:
      | CropSelection
      | BoundaryStepPayload
      | SeedStepPayload
      | FormData
      | FertilizerStepPayload,
  ) => Promise<CropSaveResult>;
  onDirty: (dirty: boolean) => void;
}
