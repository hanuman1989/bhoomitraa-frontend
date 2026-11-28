import type { Farm } from "@/types/account/farm";

export type DashboardModule =
  | "farm-manager"
  | "crop-manager"
  | "irrigation"
  | "machinery"
  | "employees"
  | "profile";
export type MapType = "roadmap" | "satellite";
/** The map's speed-dial groups: Farm Actions, Locate & Fit and Map Layers. */
export type FabGroupId = "farm" | "view" | "layers";
export interface MapPosition {
  lat: number;
  lng: number;
}
export type Ring = [number, number][];
export type FarmGeometry =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };

/** UI integration contract only, not a Laravel response. Connect after its farm contract is verified. */
export interface DashboardFarm extends Partial<
  Pick<Farm, "area" | "area_unit">
> {
  id: number;
  name: string;
  boundary: FarmGeometry | null;
  location: MapPosition | null;
  locationLabel?: string | null;
  areaLabel?: string | null;
  activeCropLabel?: string | null;
  statusLabel?: string | null;
}
export type FarmDataState =
  | { status: "unavailable" | "loading" }
  | { status: "error"; onRetry?: () => void }
  | { status: "ready"; farms: readonly DashboardFarm[] };
export interface MapView {
  center: MapPosition;
  zoom: number;
}
export interface DashboardMapHandle {
  zoom: (delta: number) => void;
  locate: () => void;
  fitAll: () => void;
  focus: (farm: DashboardFarm) => void;
  /** Frames these positions; false when there are none or the map can't move. */
  fit: (positions: readonly MapPosition[]) => boolean;
  resetLayers: () => void;
  getView: () => MapView | null;
}
