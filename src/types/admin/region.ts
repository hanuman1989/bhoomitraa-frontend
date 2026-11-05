import type { PaginatedResponse } from "@/types/api";

export type RegionType =
  "country" | "state" | "district" | "subdistrict" | "village";

export interface Region {
  id: number;
  parent_id: number | null;
  code: string | null;
  region_type: RegionType;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
  name: string | null;
  translations?: Record<string, { locale: string; name: string }>;
  parent?: { id: number; region_type: RegionType; name: string | null } | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
}

export interface RegionFilterValues {
  keyword: string;
  region_type: RegionType | "";
  parent_id: string;
  is_active: "" | "1" | "0";
}

export type RegionsListResponse = PaginatedResponse<Region>;

export interface RegionPayload {
  region_type: RegionType;
  parent_id: number | null;
  code: string | null;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
  translations: Record<string, { name: string }>;
}

export interface RegionFormValues {
  region_type: RegionType | "";
  parent_id: string;
  code: string;
  latitude: string;
  longitude: string;
  is_active: "1" | "0";
  translations: Record<string, { name: string }>;
}
