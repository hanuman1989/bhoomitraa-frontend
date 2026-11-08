import type { PaginatedResponse } from "@/types/api";
import type {
  CropSeedRate,
  CropSeedRateListItem,
} from "@/types/admin/cropSeedRate";
import type { RegionScope } from "@/types/admin/cropStageTimeline";

export const yieldBenchmarkTypes = [
  "research_trial",
  "demonstration",
  "district_average",
  "state_average",
  "variety_potential",
] as const;
export type YieldBenchmarkType = (typeof yieldBenchmarkTypes)[number];
export interface CropYieldBenchmarkListItem extends Pick<
  CropSeedRateListItem,
  | "id"
  | "crop_id"
  | "crop_variety_id"
  | "season_id"
  | "region_scope"
  | "source_id"
  | "notes"
  | "is_active"
  | "crop_name"
  | "crop_variety_name"
  | "season_name"
  | "crop"
  | "crop_variety"
  | "season"
  | "source_title"
  | "knowledge_source"
  | "created_at"
  | "updated_at"
  | "added_at"
> {
  yield_min_kg_ha: string | null;
  yield_avg_kg_ha: string;
  yield_max_kg_ha: string | null;
  benchmark_type: YieldBenchmarkType;
  reference_year: number | null;
}
export interface CropYieldBenchmark extends CropYieldBenchmarkListItem {
  region_ids: number[];
  regions: CropSeedRate["regions"];
}
export type CropYieldBenchmarkPayload = Pick<
  CropYieldBenchmark,
  | "crop_id"
  | "crop_variety_id"
  | "season_id"
  | "region_scope"
  | "region_ids"
  | "yield_min_kg_ha"
  | "yield_avg_kg_ha"
  | "yield_max_kg_ha"
  | "benchmark_type"
  | "source_id"
  | "reference_year"
  | "notes"
  | "is_active"
>;
export type CropYieldBenchmarkFormValues = {
  [K in keyof CropYieldBenchmarkPayload]: K extends "region_ids"
    ? number[]
    : K extends "is_active"
      ? boolean
      : K extends "region_scope"
        ? RegionScope
        : string;
};
export interface CropYieldBenchmarkFilters {
  keyword: string;
  crop_id: string;
  crop_variety_id: string;
  season_id: string;
  benchmark_type: YieldBenchmarkType | "";
  region_scope: RegionScope | "";
  is_active: "" | "0" | "1";
}
export type CropYieldBenchmarksResponse =
  PaginatedResponse<CropYieldBenchmarkListItem>;
