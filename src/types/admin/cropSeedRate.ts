import type { PaginatedResponse } from "@/types/api";
import type { MaterialType, SeedListItem } from "@/types/admin/seed";
import type { SeedPriceProduct } from "@/types/admin/seedPrice";
import type {
  RegionScope,
  StageTimeline,
} from "@/types/admin/cropStageTimeline";

export const rateSowingMethods = [
  "broadcasting",
  "line_sowing",
  "drilling",
  "transplanting",
  "dibbling",
] as const;
export const rateIrrigationConditions = ["irrigated", "rainfed"] as const;
export const rateAreaUnits = ["ha", "acre"] as const;
export interface CropSeedRateListItem {
  id: number;
  crop_id: number;
  crop_variety_id: number | null;
  seed_id: number | null;
  season_id: number | null;
  material_type: MaterialType;
  sowing_method: (typeof rateSowingMethods)[number] | null;
  irrigation_condition: (typeof rateIrrigationConditions)[number] | null;
  rate_basis: "per_area";
  rate_min: string | null;
  rate_recommended: string;
  rate_max: string | null;
  rate_unit_code: SeedListItem["default_unit_code"];
  area_unit_code: (typeof rateAreaUnits)[number];
  spacing_row_cm: string | null;
  spacing_plant_cm: string | null;
  region_scope: RegionScope;
  source_id: number;
  notes: string | null;
  is_active: boolean;
  crop_name: string | null;
  crop_variety_name: string | null;
  season_name: string | null;
  crop: { id: number; name: string | null } | null;
  crop_variety: { id: number; name: string | null } | null;
  season: { id: number; name: string | null } | null;
  seed: Omit<SeedPriceProduct, "crop_name" | "crop_variety_name"> | null;
  source_title: string | null;
  knowledge_source: import("@/types/admin/seedPrice").SeedPriceListItem["knowledge_source"];
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}
export interface CropSeedRate extends CropSeedRateListItem {
  region_ids: number[];
  regions: (StageTimeline["regions"][number] & { is_active: boolean })[];
}
export type CropSeedRatePayload = Pick<
  CropSeedRate,
  | "crop_id"
  | "crop_variety_id"
  | "seed_id"
  | "season_id"
  | "material_type"
  | "sowing_method"
  | "irrigation_condition"
  | "rate_basis"
  | "rate_min"
  | "rate_recommended"
  | "rate_max"
  | "rate_unit_code"
  | "area_unit_code"
  | "spacing_row_cm"
  | "spacing_plant_cm"
  | "region_scope"
  | "source_id"
  | "notes"
  | "is_active"
  | "region_ids"
>;
export type CropSeedRateFormValues = {
  [K in keyof CropSeedRatePayload]: K extends "region_ids"
    ? number[]
    : K extends "is_active"
      ? boolean
      : K extends "region_scope"
        ? RegionScope
        : string;
};
export interface CropSeedRateFilters {
  keyword: string;
  crop_id: string;
  crop_variety_id: string;
  season_id: string;
  material_type: MaterialType | "";
  region_scope: RegionScope | "";
  is_active: "" | "0" | "1";
}
export type CropSeedRatesResponse = PaginatedResponse<CropSeedRateListItem>;
