import type {
  Coordinates,
  IrrigationGeometry,
  IrrigationMapFeature,
  IrrigationPipelineType,
  IrrigationSourceType,
  IrrigationStatus,
} from "@/types/account/irrigation";
import type { MapPosition } from "../../_components/dashboardTypes";

/* ------------------------------------------------------------------ *
 * How the Irrigation Manager plugs into the shared dashboard map.      *
 * ------------------------------------------------------------------ */
export type IrrigationView = "list" | "map" | "combined";
export interface IrrigationLayers {
  farms: boolean;
  sources: boolean;
  pipelines: boolean;
}
export type IrrigationMapAction = "details" | "edit";
/** Published by the Irrigation Manager while it is open; the shell draws it on the dashboard map. */
export interface IrrigationMapModel {
  /** Mapped assets matching the current filters, independent of list pagination. */
  features: readonly IrrigationMapFeature[];
  selectedId: string | null;
  view: IrrigationView;
  onSelect: (id: string | null) => void;
  onAction: (action: IrrigationMapAction, id: string) => void;
}
/** A location edit on the dashboard map. Confirm only updates the form; nothing is saved. */
export interface IrrigationEditorRequest {
  kind: "point" | "line";
  /** The asset being edited, hidden from the saved layer while editing. */
  assetId: string | null;
  geometry: IrrigationGeometry | null;
  onConfirm: (geometry: IrrigationGeometry | null) => void;
  onCancel: () => void;
}

/** Bottom panel height for each view: List leaves the top bar, Map a short panel. */
export function irrigationPanelHeight(
  view: IrrigationView,
  viewport: { width: number; height: number },
): number {
  const mobile = viewport.width < 768;
  if (view === "list") return Math.max(0, viewport.height - 88);
  if (view === "map")
    return mobile ? Math.min(380, Math.round(viewport.height * 0.5)) : 300;
  return Math.round(viewport.height * (mobile ? 0.6 : 0.56));
}

export const defaultIrrigationLayers: IrrigationLayers = {
  farms: true,
  sources: true,
  pipelines: true,
};
// Per-farmer UI preference in this browser only (no records or locations).
const layersKey = (userId: number) => `krishi-irrigation-layers:${userId}`;
export function readIrrigationLayers(userId?: number | null): IrrigationLayers {
  if (!userId) return defaultIrrigationLayers;
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(layersKey(userId)) ?? "null",
    );
    if (saved && typeof saved === "object") {
      const layers = saved as Partial<Record<keyof IrrigationLayers, unknown>>;
      return {
        farms: layers.farms !== false,
        sources: layers.sources !== false,
        pipelines: layers.pipelines !== false,
      };
    }
  } catch {
    /* Storage is optional. */
  }
  return defaultIrrigationLayers;
}
export function saveIrrigationLayers(
  userId: number | null | undefined,
  layers: IrrigationLayers,
): void {
  if (!userId) return;
  try {
    localStorage.setItem(layersKey(userId), JSON.stringify(layers));
  } catch {
    /* Storage is optional. */
  }
}

/* ------------------------------------------------------------------ *
 * Geometry previews. Laravel validates and calculates the final values.*
 * ------------------------------------------------------------------ */
export const EARTH_RADIUS_M = 6371008.8;
export const MAX_ROUTE_POINTS = 1000;
const MAX_LENGTH_M = 9999999999.99;
const radians = (value: number) => (value * Math.PI) / 180;

/** Haversine distance in metres between two [lng, lat] positions. */
export function segmentMeters(a: Coordinates, b: Coordinates): number {
  const h =
    Math.sin(radians(b[1] - a[1]) / 2) ** 2 +
    Math.cos(radians(a[1])) *
      Math.cos(radians(b[1])) *
      Math.sin(radians(b[0] - a[0]) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
/** Approximate route length: unrounded segments summed, the total rounded to 2 decimals. */
export function routeLengthMeters(points: readonly Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++)
    total += segmentMeters(points[i - 1], points[i]);
  return Math.round(total * 100) / 100;
}
export type IrrigationRouteError =
  "needTwo" | "consecutive" | "maxPoints" | "tooLong";
/** The route rules Laravel applies, so Confirm can't produce a route it rejects. */
export function irrigationRouteError(
  points: readonly Coordinates[],
): IrrigationRouteError | null {
  if (points.length > MAX_ROUTE_POINTS) return "maxPoints";
  const distinct = new Set(points.map(([lng, lat]) => `${lng},${lat}`));
  if (points.length < 2 || distinct.size < 2) return "needTwo";
  for (let i = 1; i < points.length; i++)
    if (points[i][0] === points[i - 1][0] && points[i][1] === points[i - 1][1])
      return "consecutive";
  const length = routeLengthMeters(points);
  if (!(length > 0)) return "needTwo";
  return length > MAX_LENGTH_M ? "tooLong" : null;
}
/** About 1 cm: enough for a hand-placed point, and keeps requests small. */
export const roundCoordinate = (value: number) => Math.round(value * 1e7) / 1e7;
export const toCoordinates = ({ lat, lng }: MapPosition): Coordinates => [
  roundCoordinate(lng),
  roundCoordinate(lat),
];
export const toPosition = ([lng, lat]: Coordinates): MapPosition => ({
  lat,
  lng,
});
export function geometryPositions(
  geometry: IrrigationGeometry | null | undefined,
): MapPosition[] {
  if (!geometry) return [];
  return geometry.type === "Point"
    ? [toPosition(geometry.coordinates)]
    : geometry.coordinates.map(toPosition);
}
/** Where a popup points: the source itself, or the middle of a route. */
export function geometryAnchor(
  geometry: IrrigationGeometry | null | undefined,
): MapPosition | null {
  if (!geometry) return null;
  if (geometry.type === "Point") return toPosition(geometry.coordinates);
  const points = geometry.coordinates;
  if (!points.length) return null;
  const middle = Math.floor((points.length - 1) / 2);
  const a = points[middle],
    b = points[Math.min(points.length - 1, middle + 1)];
  return toPosition([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
}

/* ------------------------------------------------------------------ *
 * Location editor draft: one marker, or the points of a route.         *
 * ------------------------------------------------------------------ */
export interface IrrigationDraft {
  kind: "point" | "line";
  points: Coordinates[];
  history: Coordinates[][];
  /** Why the last tap added nothing. */
  notice: "duplicate" | "maxPoints" | null;
}
export type IrrigationDraftAction =
  | { type: "add"; point: Coordinates }
  | { type: "replace"; points: Coordinates[] }
  | { type: "remove"; index: number }
  | { type: "undo" }
  | { type: "clear" };
const HISTORY_LIMIT = 200;
export function irrigationDraft(
  kind: IrrigationDraft["kind"],
  geometry: IrrigationGeometry | null,
): IrrigationDraft {
  const points: Coordinates[] = !geometry
    ? []
    : geometry.type === "Point"
      ? [[...geometry.coordinates]]
      : geometry.coordinates.map(([lng, lat]): Coordinates => [lng, lat]);
  return { kind, points, history: [], notice: null };
}
export const samePoints = (
  a: readonly Coordinates[],
  b: readonly Coordinates[],
) =>
  a.length === b.length &&
  a.every((point, i) => point[0] === b[i][0] && point[1] === b[i][1]);
export function irrigationDraftReducer(
  state: IrrigationDraft,
  action: IrrigationDraftAction,
): IrrigationDraft {
  const commit = (points: Coordinates[]): IrrigationDraft => ({
    ...state,
    points,
    history: [...state.history, state.points].slice(-HISTORY_LIMIT),
    notice: null,
  });
  switch (action.type) {
    case "add": {
      if (state.kind === "point") return commit([action.point]);
      const last = state.points.at(-1);
      if (last && last[0] === action.point[0] && last[1] === action.point[1])
        return { ...state, notice: "duplicate" };
      if (state.points.length >= MAX_ROUTE_POINTS)
        return { ...state, notice: "maxPoints" };
      return commit([...state.points, action.point]);
    }
    case "replace": {
      const points = action.points.slice(0, MAX_ROUTE_POINTS);
      return samePoints(points, state.points) ? state : commit(points);
    }
    case "remove":
      return action.index >= 0 && action.index < state.points.length
        ? commit(state.points.filter((_, i) => i !== action.index))
        : state;
    case "undo":
      return state.history.length
        ? {
            ...state,
            points: state.history[state.history.length - 1],
            history: state.history.slice(0, -1),
            notice: null,
          }
        : state;
    case "clear":
      return state.points.length ? commit([]) : state;
  }
}
export function draftGeometry(
  draft: IrrigationDraft,
): IrrigationGeometry | null {
  if (!draft.points.length) return null;
  return draft.kind === "point"
    ? { type: "Point", coordinates: draft.points[0] }
    : { type: "LineString", coordinates: draft.points };
}

/* ------------------------------------------------------------------ *
 * Map styling. Google Maps takes plain colour strings, so these hex    *
 * values are copied from the admin theme tokens named beside them.     *
 * ------------------------------------------------------------------ */
export const IRRIGATION_COLORS = {
  water: "#0086c9", // blue-light-600
  waterSelected: "#065986", // blue-light-800
  glow: "#7cd4fd", // blue-light-300
  draft: "#fb6514", // orange-500
  casing: "#ffffff",
} as const;
export const IRRIGATION_STATUS_COLORS: Record<IrrigationStatus, string> = {
  operational: "#039855", // success-600
  needs_maintenance: "#f79009", // warning-500
  out_of_service: "#d92d20", // error-600
  inactive: "#667085", // gray-500
};
export type PipelinePattern = "solid" | "dashed" | "dotted" | "dashDot";
export const pipelinePatterns: Record<IrrigationPipelineType, PipelinePattern> =
  {
    underground: "dashed",
    surface: "solid",
    portable: "dotted",
    other: "dashDot",
  };
/** Marker glyphs; the same drawings as the src/icons irrigation icons (24×24, stroked). */
const sourceGlyphs: Record<IrrigationSourceType, string> = {
  borewell: "M12 3v12M8 3h8M9 7h6M8.5 18a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
  open_well: "M5 8a7 3 0 1 0 14 0a7 3 0 1 0-14 0M5 8v9a7 3 0 0 0 14 0V8",
  canal: "M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
  pond: "M3 15a9 4 0 1 0 18 0a9 4 0 1 0-18 0M12 3c-2 3-3 5-3 6.5a3 3 0 0 0 6 0C15 8 14 6 12 3z",
  tank: "M6 4h12v9H6zM8 13l-2 7M16 13l2 7M6 8h12",
  river: "M3 5c5 1 3 6 8 7s3 6 9 7M8 4c4 1 3 5 7 6s3 5 6 6",
  reservoir: "M3 20h18M5 20V9l14-4v15M8 13h8M8 16h8",
  rainwater_collection:
    "M7 13a4 4 0 0 1 .6-8 5 5 0 0 1 9.4 1.5A3.3 3.3 0 0 1 17 13zM9 16v3M13 16v4M17 16v3",
  other: "M12 3c-3 4-6 7.5-6 11a6 6 0 0 0 12 0c0-3.5-3-7-6-11z",
};
const PIN = "M0 0C-3-8-14-13-14-24a14 14 0 1 1 28 0C14-13 3-8 0 0z";
const svgIcon = (svg: string, scale = 1) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  width: Math.round(48 * scale),
  height: Math.round(50 * scale),
  anchorX: Math.round(24 * scale),
  anchorY: Math.round(48 * scale),
});
/**
 * A blue pin with the source type's glyph and a status dot. Inactive pins are
 * faded, and every pin fades while another location is being edited.
 */
export function sourceMarkerIcon(
  type: IrrigationSourceType,
  status: IrrigationStatus,
  selected: boolean,
  faded = false,
) {
  const fill = selected
    ? IRRIGATION_COLORS.waterSelected
    : IRRIGATION_COLORS.water;
  const opacity = faded ? 0.35 : status === "inactive" ? 0.5 : 1;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="50" viewBox="-24 -48 48 50">` +
    `<g opacity="${opacity}">` +
    (selected
      ? `<circle cy="-24" r="22" fill="${IRRIGATION_COLORS.water}" fill-opacity=".22"/>`
      : "") +
    `<path d="${PIN}" fill="${fill}" stroke="#fff" stroke-width="2"/>` +
    `<circle cy="-24" r="10.5" fill="#fff"/>` +
    `<g transform="translate(-7 -31) scale(.583)" fill="none" stroke="${fill}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${sourceGlyphs[type] ?? sourceGlyphs.other}"/></g>` +
    `<circle cx="11" cy="-36" r="4.5" fill="${IRRIGATION_STATUS_COLORS[status]}" stroke="#fff" stroke-width="1.5"/>` +
    `</g></svg>`;
  return svgIcon(svg, selected ? 1.2 : 1);
}
/** The unsaved marker while picking a location: an orange pin that can be dragged. */
export function draftMarkerIcon() {
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="50" viewBox="-24 -48 48 50">` +
      `<ellipse rx="9" ry="3.5" fill="#000" fill-opacity=".3"/>` +
      `<path d="${PIN}" fill="${IRRIGATION_COLORS.draft}" stroke="#fff" stroke-width="2.5"/>` +
      `<circle cy="-24" r="6" fill="#fff"/></svg>`,
    1.1,
  );
}
