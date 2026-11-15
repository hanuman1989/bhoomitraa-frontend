import type { FarmGeometry } from "@/app/[locale]/(account)/account/(protected)/_components/dashboardTypes";
/** Open unit codes are supplied by the backend metadata, including legacy reads. */
export type AreaUnit = string;
export type OwnershipType = "owned" | "leased" | "shared" | "other";
export type Boundary = Extract<FarmGeometry, { type: "MultiPolygon" }>;
export interface BoundaryDraft {
  boundary: Boundary | null;
  boundary_source: "manual" | "gps" | null;
  gps_accuracy_m: number | null;
}
export interface FarmBasicPayload {
  name: string;
  description: string | null;
  ownership_type: OwnershipType | null;
  area: string;
  area_unit: AreaUnit;
  state_id: number;
  district_id: number;
  tehsil_id: number | null;
  village: string;
  address: string | null;
}
export interface Farm extends FarmBasicPayload {
  id: number;
  description: string | null;
  area_source: "government_record";
  area_sqm: string | null;
  actual_area: string | null;
  actual_area_unit: AreaUnit | "sqm" | null;
  actual_area_sqm: string | null;
  region_id: number | null;
  state?: { id: number; name: string | null } | null;
  district?: { id: number; name: string | null } | null;
  tehsil?: { id: number; name: string | null } | null;
  latitude: string | null;
  longitude: string | null;
  has_boundary: boolean;
  boundary?: Boundary | null;
  boundary_source: "manual" | "gps" | null;
  gps_accuracy_m: string | null;
  is_active: boolean;
  active_crop: null;
  created_at: string | null;
  updated_at: string | null;
  khasra_number?: string | null;
  khata_number?: string | null;
  patwari_halka_number?: string | null;
  soil_type?: string | null;
  land_type?: string | null;
  farmland_type?: string | null;
  water_availability?: string | null;
  irrigation_source?: string | null;
  notes?: string | null;
}
export type FarmDetailsPayload = Pick<
  Farm,
  | "khasra_number"
  | "khata_number"
  | "patwari_halka_number"
  | "soil_type"
  | "land_type"
  | "farmland_type"
  | "water_availability"
  | "irrigation_source"
  | "notes"
>;
export interface FarmFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  per_page?: number;
  include_boundary?: number;
}
export interface FarmSummary {
  total_farms: number;
  active_farms: number;
  inactive_farms: number;
  total_land_area: {
    value: string | null;
    unit: string;
    area_sqm: string | null;
    basis: "government_record";
    conversion_available: boolean;
    unresolved_farms_count: number;
    preference_resolution_required: boolean;
    breakdown: { value: string; unit: string; conversion_available: boolean }[];
  };
  total_land_area_sqm: string | null;
  area_totals: { value: string; unit: string; conversion_available: boolean }[];
  area_conversion_unavailable: boolean;
}
