import {
  geocodeMapAddress,
  type MapsBounds,
  type MapsGeocoderResult,
  type MapsInstance,
  type MapsListener,
  type MapsSDK,
} from "./googleMaps";
import type { MapPosition } from "./dashboardTypes";
import type { FarmerProfile } from "@/lib/userAuth/types";
import { isMapPosition } from "./farmGeometry";

export interface MapViewport {
  width: number;
  height: number;
  sidebarWidth: number;
  rtl?: boolean;
}
export function viewportPadding(panelHeight: number, viewport: MapViewport) {
  const height = viewport.height - panelHeight;
  const width = viewport.width - viewport.sidebarWidth;
  if (height < 120 || width < 160) return null;
  const side = Math.min(64, width / 4);
  return {
    top: Math.min(96, height / 4),
    bottom: panelHeight + Math.min(32, height / 8),
    left: side + (viewport.rtl ? 0 : viewport.sidebarWidth),
    right: side + (viewport.rtl ? viewport.sidebarWidth : 0),
  };
}

/** Popup layout uses the measured dashboard overlays and leaves the end-side
 * control column free. Coordinates are physical Google canvas pixels. */
export function farmPopupLayout(
  point: { x: number; y: number },
  viewport: MapViewport,
  panelHeight: number,
  naturalHeight: number,
  reveal = false,
  minimumHeight = 136,
) {
  if (
    !viewportPadding(panelHeight, viewport) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  )
    return null;
  const visibleHeight = viewport.height - panelHeight;
  const left = viewport.rtl ? 72 : viewport.sidebarWidth + 16;
  const right =
    viewport.width - (viewport.rtl ? viewport.sidebarWidth + 16 : 72);
  const top = Math.min(80, visibleHeight / 4),
    bottom = visibleHeight - 16;
  if (right - left < 220 || bottom - top < minimumHeight + 12) return null;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const width = Math.min(320, right - left),
    gap = 12;
  const anchor = reveal
    ? {
        x: clamp(point.x, left + 16, right - 16),
        y: clamp(point.y, top + 16, bottom - 16),
      }
    : point;
  if (
    anchor.x < left ||
    anchor.x > right ||
    anchor.y < top ||
    anchor.y > bottom
  )
    return null;
  let side: "right" | "left" | "above" | "below";
  let height = Math.min(naturalHeight, bottom - top - gap);
  if (anchor.x + gap + width <= right) side = "right";
  else if (anchor.x - gap - width >= left) side = "left";
  else {
    if (
      reveal &&
      anchor.y - top - gap < height &&
      bottom - anchor.y - gap < height
    )
      anchor.y = bottom - 16;
    const above = anchor.y - top - gap,
      below = bottom - anchor.y - gap;
    side = above >= below ? "above" : "below";
    height = Math.min(height, side === "above" ? above : below);
    if (height < minimumHeight) return null;
  }
  const x =
    side === "right"
      ? anchor.x + gap
      : side === "left"
        ? anchor.x - width - gap
        : clamp(anchor.x - width / 2, left, right - width);
  const y =
    side === "above"
      ? anchor.y - height - gap
      : side === "below"
        ? anchor.y + gap
        : clamp(anchor.y - height * 0.65, top, bottom - height);
  return {
    x,
    y,
    width,
    height,
    side,
    anchor,
    pan: { x: point.x - anchor.x, y: point.y - anchor.y },
  };
}
const zoomLimits = new WeakMap<MapsInstance, MapsListener>();
export function cancelViewportAdjustment(map: MapsInstance) {
  zoomLimits.get(map)?.remove();
  zoomLimits.delete(map);
}
export function fitViewportBounds(
  map: MapsInstance,
  bounds: MapsBounds,
  padding: NonNullable<ReturnType<typeof viewportPadding>>,
  maxZoom = 18,
) {
  cancelViewportAdjustment(map);
  map.fitBounds(bounds, padding);
  const listener = map.addListener("idle", () => {
    listener.remove();
    zoomLimits.delete(map);
    if ((map.getZoom() ?? 0) > maxZoom) map.setZoom(maxZoom);
  });
  zoomLimits.set(map, listener);
}
export function centerMapPosition(
  map: MapsInstance,
  point: MapPosition,
  zoom: number,
  panelHeight: number,
  viewport: MapViewport,
) {
  const padding = viewportPadding(panelHeight, viewport);
  if (!padding || !isMapPosition(point)) return false;
  cancelViewportAdjustment(map);
  map.panTo(point);
  map.setZoom(zoom);
  map.panBy(
    (padding.right - padding.left) / 2,
    (padding.bottom - padding.top) / 2,
  );
  return true;
}

export function fitMapPositions(
  sdk: MapsSDK,
  map: MapsInstance,
  positions: readonly MapPosition[],
  panelHeight = 0,
  viewport?: MapViewport,
): boolean {
  if (!positions.length) return false;
  if (viewport && !viewportPadding(panelHeight, viewport)) return false;
  if (
    positions.every(
      (point) =>
        point.lat === positions[0].lat && point.lng === positions[0].lng,
    )
  ) {
    if (viewport)
      return centerMapPosition(map, positions[0], 16, panelHeight, viewport);
    map.panTo(positions[0]);
    map.setZoom(16);
    if (panelHeight) map.panBy(0, panelHeight / 2);
  } else {
    const bounds = new sdk.LatLngBounds();
    positions.forEach((point) => bounds.extend(point));
    const padding = {
      top: 96,
      bottom: Math.max(96, panelHeight + 32),
      left: 64,
      right: 64,
    };
    if (viewport)
      fitViewportBounds(map, bounds, viewportPadding(panelHeight, viewport)!);
    else map.fitBounds(bounds, padding);
  }
  return true;
}

export interface ProfileLocationQuery {
  address: string;
  level: "village" | "district" | "state";
  name: string;
  state: string;
  district: string;
  pincode?: string;
  zoom: number;
}
const clean = (value?: string | null) =>
  value?.trim().replace(/\s+/gu, " ") ?? "";
const normalized = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\b(district|division)\b/gu, "")
    .replace(/[\p{P}\p{Z}]+/gu, " ")
    .trim();
export function profileLocationQueries(
  profile?:
    | (Pick<FarmerProfile, "village" | "pincode"> & {
        state?: Pick<NonNullable<FarmerProfile["state"]>, "name"> | null;
        district?: Pick<NonNullable<FarmerProfile["district"]>, "name"> | null;
      })
    | null,
): ProfileLocationQuery[] {
  const village = clean(profile?.village),
    district = clean(profile?.district?.name),
    state = clean(profile?.state?.name),
    pincode = clean(profile?.pincode);
  const address = (parts: string[]) => {
    const seen = new Set<string>();
    return [...parts, "India"]
      .filter((part) => {
        const key = normalized(part);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(", ");
  };
  const queries: ProfileLocationQuery[] = [];
  if (village && normalized(village) !== "india") {
    queries.push({
      address: address([village, district, state]),
      level: "village",
      name: village,
      state,
      district,
      zoom: 15,
    });
    // Postal context is sent only if the unqualified village lookup fails.
    if (pincode)
      queries.push({
        ...queries[0],
        address: address([village, district, state, pincode]),
        pincode,
      });
  }
  if (district && normalized(district) !== "india")
    queries.push({
      address: address([district, state]),
      level: "district",
      name: district,
      state,
      district,
      zoom: 10,
    });
  if (state && normalized(state) !== "india")
    queries.push({
      address: address([state]),
      level: "state",
      name: state,
      state,
      district: "",
      zoom: 7,
    });
  return queries;
}
function matchesName(expected: string, names: string[]) {
  if (!expected || !names.length) return true;
  const value = normalized(expected);
  if (
    names.some((name) => {
      const candidate = normalized(name);
      return (
        candidate === value ||
        candidate.startsWith(value + " ") ||
        value.startsWith(candidate + " ")
      );
    })
  )
    return true;
  // Structured type/country checks still apply when Google transliterates a
  // name into another script. Do not reject Hindi solely for an English label.
  return names.every(
    (name) =>
      /\p{Script=Latin}/u.test(name) !== /\p{Script=Latin}/u.test(expected),
  );
}
export function matchingProfileResult(
  result: MapsGeocoderResult,
  query: ProfileLocationQuery,
) {
  if (result.partial_match) return false;
  const components = result.address_components ?? [];
  const country = components.find((part) => part.types.includes("country"));
  if (country?.short_name.toUpperCase() !== "IN") return false;
  const names = (types: string[]) =>
    components
      .filter((part) => part.types.some((type) => types.includes(type)))
      .flatMap((part) => [part.long_name, part.short_name]);
  const levels =
    query.level === "village"
      ? ["locality", "sublocality", "sublocality_level_1", "postal_town"]
      : query.level === "district"
        ? ["administrative_area_level_2", "administrative_area_level_3"]
        : ["administrative_area_level_1"];
  return (
    Boolean(result.types?.some((type) => levels.includes(type))) &&
    matchesName(query.name, names(levels)) &&
    matchesName(query.state, names(["administrative_area_level_1"])) &&
    (query.level !== "village" ||
      matchesName(
        query.district,
        names(["administrative_area_level_2", "administrative_area_level_3"]),
      )) &&
    (!query.pincode || matchesName(query.pincode, names(["postal_code"])))
  );
}
export async function resolveProfileViewport(
  sdk: MapsSDK,
  queries: readonly ProfileLocationQuery[],
  current: () => boolean,
) {
  for (const query of queries) {
    if (!current()) return null;
    let results: MapsGeocoderResult[];
    try {
      results = (
        await geocodeMapAddress(
          sdk,
          query.address,
          true,
          query.state || undefined,
        )
      ).results;
    } catch {
      return null;
    }
    if (!current()) return null;
    const matches = results.filter((result) => {
      try {
        return (
          matchingProfileResult(result, query) &&
          isMapPosition({
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          })
        );
      } catch {
        return false;
      }
    });
    if (matches.length !== 1) continue;
    const match = matches[0];
    return {
      position: {
        lat: match.geometry.location.lat(),
        lng: match.geometry.location.lng(),
      },
      zoom: query.zoom,
      bounds: match.geometry.viewport,
    };
  }
  return null;
}
