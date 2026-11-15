export type FarmRegionType = "state" | "district" | "subdistrict";

export interface FarmRegion {
  id: number;
  parent_id: number | null;
  code: string | null;
  region_type: FarmRegionType;
  latitude: string | null;
  longitude: string | null;
  is_active: boolean;
  name: string | null;
}
