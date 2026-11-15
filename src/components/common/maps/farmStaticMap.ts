import {
  boundaryArea,
  boundaryError,
  boundaryPoints,
  isFarmGeometry,
  isMapPosition,
} from "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";
import type {
  FarmGeometry,
  MapPosition,
} from "@/app/[locale]/(account)/account/(protected)/_components/dashboardTypes";
import { DEFAULT_FARM_COLOR } from "./farmMapStyle";

export interface FarmStaticMapOptions {
  boundary?: FarmGeometry | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  strokeColor?: string;
}
export type FarmSatelliteSources = Record<
  number,
  { normal: string | null; selected: string | null }
>;
export const STATIC_MAP_WIDTH = 240;
export const STATIC_MAP_HEIGHT = 168; // Preserve the existing 80 × 56 thumbnail.
export const STATIC_MAP_SCALE = 2;
export const STATIC_MAP_URL_LIMIT = 16384;
const unsignedUrlLimit = STATIC_MAP_URL_LIMIT - 64; // Allow a server signature.
type PreviewReason =
  | "missing-key"
  | "invalid-boundary"
  | "missing-location"
  | "url-too-long"
  | "unsafe-encoding";
export interface FarmStaticMapPreview {
  url: string | null;
  reason: PreviewReason | null;
}

function coordinate(value: number | string | null | undefined): number {
  return value == null || (typeof value === "string" && !value.trim())
    ? NaN
    : Number(value);
}

/** Google's E5 encoded polyline format; input/output includes the closing vertex. */
function encodedPath(points: readonly MapPosition[]): string {
  let previousLat = 0,
    previousLng = 0,
    result = "";
  const encode = (delta: number) => {
    let value = delta < 0 ? ~(delta << 1) : delta << 1;
    let part = "";
    while (value >= 0x20) {
      part += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>>= 5;
    }
    return part + String.fromCharCode(value + 63);
  };
  for (const point of points) {
    const lat = Math.round(point.lat * 1e5),
      lng = Math.round(point.lng * 1e5);
    result += encode(lat - previousLat) + encode(lng - previousLng);
    previousLat = lat;
    previousLng = lng;
  }
  return result;
}

/** URL only: never fetch, cache, or alter the saved geometry or its area. */
export function farmStaticMapPreview(
  { boundary, latitude, longitude, strokeColor }: FarmStaticMapOptions,
  apiKey: string | undefined,
): FarmStaticMapPreview {
  if (!apiKey?.trim()) return { url: null, reason: "missing-key" };
  const params = new URLSearchParams({
    maptype: "satellite",
    size: `${STATIC_MAP_WIDTH}x${STATIC_MAP_HEIGHT}`,
    scale: String(STATIC_MAP_SCALE),
    format: "png",
    key: apiKey.trim(),
  });
  const url = () =>
    `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  if (boundary != null) {
    // Match the dashboard's supported GeoJSON types, preserving one exterior.
    // Never silently omit components or fill holes in unsupported geometry.
    if (
      !isFarmGeometry(boundary) ||
      boundary.coordinates.length !== 1 ||
      (boundary.type === "MultiPolygon" && boundary.coordinates[0].length !== 1)
    )
      return { url: null, reason: "invalid-boundary" };
    const points = boundaryPoints(boundary);
    if (boundaryError(points)) return { url: null, reason: "invalid-boundary" };
    const color = (
      strokeColor && /^#[\da-f]{6}$/i.test(strokeColor)
        ? strokeColor
        : DEFAULT_FARM_COLOR
    ).slice(1);
    const style = `weight:3|color:0x${color}ff|fillcolor:0x${color}40|`;
    const closed = [...points, points[0]];
    params.set(
      "path",
      style + closed.map((p) => `${p.lat},${p.lng}`).join("|"),
    );
    // Omitting center/zoom lets Google fit the complete path automatically.
    if (url().length <= unsignedUrlLimit) return { url: url(), reason: null };

    const rounded = points.map(({ lat, lng }) => ({
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
    }));
    // E5 compression must not invalidate or significantly change a small farm.
    if (
      boundaryError(rounded) ||
      Math.abs(boundaryArea(rounded) / boundaryArea(points) - 1) > 0.01
    )
      return { url: null, reason: "unsafe-encoding" };
    params.set("path", style + "enc:" + encodedPath([...rounded, rounded[0]]));
  } else {
    const location = { lat: coordinate(latitude), lng: coordinate(longitude) };
    if (!isMapPosition(location))
      return { url: null, reason: "missing-location" };
    params.set("center", `${location.lat},${location.lng}`);
    params.set("zoom", "17");
  }
  return url().length <= unsignedUrlLimit
    ? { url: url(), reason: null }
    : { url: null, reason: "url-too-long" };
}

export function farmStaticMapUrl(
  options: FarmStaticMapOptions,
  apiKey: string | undefined,
): string | null {
  return farmStaticMapPreview(options, apiKey).url;
}
