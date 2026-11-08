import type { PaginationMeta, PaginatedResponse } from "@/types/api";
import type { Region } from "@/types/admin/region";

export type RegionScope = "all" | "specific";
export interface StageTimelineListItem {
  id: number;
  crop_id: number | null;
  crop_name: string | null;
  crop_stage_id: number;
  crop_stage_name: string | null;
  crop_variety_id: number | null;
  crop_variety_name: string | null;
  season_id: number | null;
  season_name: string | null;
  days_after_sowing_min: number;
  days_after_sowing_max: number;
  source_id: number;
  source_title: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}
export interface StageTimeline extends StageTimelineListItem {
  region_scope: RegionScope;
  region_ids: number[];
  regions: Pick<Region, "id" | "parent_id" | "name" | "region_type">[];
}
export interface StageTimelinePayload {
  crop_stage_id: number;
  crop_variety_id: number | null;
  season_id: number | null;
  source_id: number;
  days_after_sowing_min: number;
  days_after_sowing_max: number;
  region_scope: RegionScope;
  region_ids: number[];
}
export interface StageTimelineFormValues {
  crop_id: string;
  crop_stage_id: string;
  crop_variety_id: string;
  season_id: string;
  source_id: string;
  days_after_sowing_min: string;
  days_after_sowing_max: string;
  region_scope: RegionScope;
  region_ids: number[];
}
export interface StageTimelineFilters {
  keyword: string;
  crop_id: string;
  crop_stage_id: string;
  crop_variety_id: string;
  season_id: string;
  status: "" | "1" | "0";
}
export type TimelineRelationKind =
  | "crop"
  | "stage"
  | "variety"
  | "season"
  | "source"
  | "category"
  | "district"
  | "seed";
export interface TimelineOption {
  id: number;
  label: string;
  crop_id?: number;
  is_active: boolean;
  verified?: boolean;
  seed?: import("@/types/admin/seedLot").LotSeedProduct &
    Partial<
      Pick<
        import("@/types/admin/seed").SeedListItem,
        | "default_unit_code"
        | "reference_pack_quantity"
        | "reference_pack_unit_code"
      >
    >;
}
export interface TimelineOptionPage {
  options: TimelineOption[];
  pagination: PaginationMeta;
}
export type TimelineChoices = Partial<
  Record<TimelineRelationKind, TimelineOptionPage>
>;
export type TimelineSelections = Partial<
  Record<TimelineRelationKind, TimelineOption>
>;
export interface TimelineDistrict {
  id: number;
  name: string;
  is_active: boolean;
}
export interface TimelineState extends TimelineDistrict {
  districts: TimelineDistrict[];
}
export type StageTimelinesResponse = PaginatedResponse<StageTimelineListItem>;
