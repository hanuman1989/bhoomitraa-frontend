import type { ApiParams, ApiValidationErrors } from "@/types/api";
import type { Boundary, Farm } from "./farm";
import type { SeasonPresentation } from "@/types/season";

export type CropStatus = "draft" | "active" | "completed" | "cancelled";
export type CropStep = "crop_selection" | "boundary" | "review_save";
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
  /** True when the maturity range has an active, verified knowledge source. */
  maturity_verified?: boolean;
  region_notes: string | null;
}
export interface CropCatalog {
  seasons: CropSeason;
  categories: CropCategory;
  crops: CatalogueCrop;
  varieties: CropVariety;
}
export interface CropSelection {
  farm_id: number;
  crop_id: number;
  crop_variety_id: number | null;
  season_id: number;
  /** Date-only ISO value (YYYY-MM-DD). */
  sowing_date: string;
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
  wizard_progress: Record<CropStep, "pending" | "completed" | "needs_review">;
  farm: Farm;
  crop: CatalogueCrop;
  crop_variety: CropVariety | null;
  season: CropSeason;
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
  /** True once the crop timeline has been generated. */
  has_timeline: boolean;
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
/** Informational harvest estimate from verified variety maturity days. */
export interface CropMaturity {
  maturity_status: "available" | "unavailable";
  maturity_days_min: number | null;
  maturity_days_max: number | null;
  expected_harvest_date: string | null;
  expected_harvest_date_min: string | null;
  expected_harvest_date_max: string | null;
}
export interface CropDetail extends CropCycle {
  boundary_details: {
    boundary: Boundary | null;
    farm_boundary: Boundary | null;
    gps_accuracy_m: string | null;
    calculated_area_ha: string | null;
    existing_crop_boundaries: OccupiedCrop[];
  };
  maturity: CropMaturity;
  validation_issues: ApiValidationErrors;
  can_finalize: boolean;
  has_pending_edit: boolean;
  timeline_generated: boolean;
  estimates_are_historical: boolean;
  saved_step_data: {
    crop_selection: Omit<CropSelection, "sowing_date"> & {
      sowing_date: string | null;
    };
  };
}
export interface BoundaryStepPayload {
  boundary_source: "farm_boundary" | "manual" | "gps" | "manual_area";
  boundary?: Boundary | null;
  cultivated_area?: string;
  area_unit: string;
  gps_accuracy_m?: number | null;
}
export type CropSaveResult = import("@/types/api").ActionResult<CropDetail> & {
  conflict?: boolean;
};
export interface CropStepProps {
  crop: CropDetail;
  busy: boolean;
  onSave: (
    step: 1 | 2,
    values: CropSelection | BoundaryStepPayload,
  ) => Promise<CropSaveResult>;
  onDirty: (dirty: boolean) => void;
}
