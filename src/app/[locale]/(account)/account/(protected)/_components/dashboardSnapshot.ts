import { initialDashboardState, type DashboardState } from "./dashboardState";
import { isMapPosition } from "./farmGeometry";
import type { MapView } from "./dashboardTypes";

export const snapshotKey = (userId?: number) =>
  `krishi-dashboard-locale:${userId ?? "guest"}`;
export function readDashboardSnapshot(
  userId?: number,
): { state: DashboardState; view: MapView | null } | null {
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem(snapshotKey(userId)) ?? "null",
    );
    if (
      !raw ||
      typeof raw !== "object" ||
      !("state" in raw) ||
      !raw.state ||
      typeof raw.state !== "object"
    )
      return null;
    const saved = raw.state as Partial<DashboardState>;
    const view = "view" in raw ? (raw.view as MapView | null) : null;
    return {
      state: {
        ...initialDashboardState,
        sidebarOpen: saved.sidebarOpen === true,
        fabOpen: false,
        panelHeight:
          typeof saved.panelHeight === "number" &&
          Number.isFinite(saved.panelHeight) &&
          saved.panelHeight > 0
            ? saved.panelHeight
            : null,
        selectedFarmId:
          typeof saved.selectedFarmId === "number" &&
          Number.isSafeInteger(saved.selectedFarmId) &&
          saved.selectedFarmId > 0
            ? saved.selectedFarmId
            : null,
        mapType:
          saved.mapType === "satellite" || saved.mapType === "roadmap"
            ? saved.mapType
            : initialDashboardState.mapType,
      },
      view:
        view &&
        isMapPosition(view.center) &&
        Number.isFinite(view.zoom) &&
        view.zoom >= 2 &&
        view.zoom <= 21
          ? view
          : null,
    };
  } catch {
    return null;
  }
}
/** Only a locale transition writes this one-shot UI snapshot. No credentials, profile fields or farm records. */
export function saveDashboardSnapshot(
  userId: number | undefined,
  state: DashboardState,
  view: MapView | null,
): void {
  try {
    sessionStorage.setItem(
      snapshotKey(userId),
      JSON.stringify({ state, view }),
    );
  } catch {
    /* Storage is optional. */
  }
}
