import type { FabGroupId, MapType, MapView } from "./dashboardTypes";

export const PANEL_MIN_HEIGHT = 200;
export const PANEL_INITIAL_DESKTOP = 0.35;
export const PANEL_INITIAL_MOBILE = 0.4;
export const DEFAULT_MAP_VIEW: MapView = {
  center: { lat: 22.5, lng: 79 },
  zoom: 5,
};
export interface DashboardState {
  sidebarOpen: boolean;
  panelHeight: number | null;
  /** The map action group that is open, if any. One at a time. */
  fabGroup: FabGroupId | null;
  selectedFarmId: number | null;
  mapType: MapType;
}
export const initialDashboardState: DashboardState = {
  sidebarOpen: false,
  panelHeight: null,
  fabGroup: null,
  selectedFarmId: null,
  mapType: "satellite",
};
export type DashboardAction =
  | { type: "restore"; state: DashboardState }
  | { type: "sidebar"; open: boolean }
  | { type: "navigate" }
  /** null returns to the default height for the viewport. */
  | { type: "resize"; height: number | null }
  | { type: "fab"; group: FabGroupId | null }
  | { type: "select-farm"; id: number | null }
  | { type: "map-type"; mapType: MapType };
export function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "sidebar":
      return { ...state, sidebarOpen: action.open, fabGroup: null };
    case "navigate":
      return {
        ...state,
        sidebarOpen: false,
        fabGroup: null,
      };
    case "resize":
      return { ...state, panelHeight: action.height };
    case "fab":
      return action.group === state.fabGroup
        ? state
        : { ...state, fabGroup: action.group };
    case "select-farm":
      return {
        ...state,
        selectedFarmId: action.id,
        fabGroup: null,
      };
    case "map-type":
      // A toggle: the Map Layers group stays open for the next change.
      return { ...state, mapType: action.mapType };
  }
}
export function clampPanelHeight(
  height: number,
  viewportHeight: number,
): number {
  const maximum = Math.max(0, viewportHeight);
  return Math.min(
    maximum,
    Math.max(Math.min(PANEL_MIN_HEIGHT, maximum), height),
  );
}
export function panelHeightForViewport(
  state: DashboardState,
  height: number,
  width: number,
): number {
  return clampPanelHeight(
    state.panelHeight ??
      height * (width < 768 ? PANEL_INITIAL_MOBILE : PANEL_INITIAL_DESKTOP),
    height,
  );
}
