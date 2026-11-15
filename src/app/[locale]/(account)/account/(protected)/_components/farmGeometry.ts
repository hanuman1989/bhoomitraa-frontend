import type {
  DashboardFarm,
  FarmGeometry,
  MapPosition,
  Ring,
} from "./dashboardTypes";

export function isMapPosition(value: unknown): value is MapPosition {
  if (!value || typeof value !== "object") return false;
  const point = value as MapPosition;
  return (
    Number.isFinite(point.lat) &&
    Math.abs(point.lat) <= 90 &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lng) <= 180
  );
}
/** Decimal API fields may be strings; absent/blank fields are never (0, 0). */
export function farmLocation(
  latitude: unknown,
  longitude: unknown,
): MapPosition | null {
  const number = (value: unknown) =>
    typeof value === "number" || (typeof value === "string" && value.trim())
      ? Number(value)
      : NaN;
  const point = { lat: number(latitude), lng: number(longitude) };
  return isMapPosition(point) ? point : null;
}
function isRing(value: unknown): value is Ring {
  if (!Array.isArray(value) || value.length < 4) return false;
  if (
    !value.every(
      (point: unknown) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number" &&
        isMapPosition({ lng: point[0], lat: point[1] }),
    )
  )
    return false;
  const first = value[0];
  const last = value[value.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}
function isPolygon(value: unknown): value is Ring[] {
  return Array.isArray(value) && value.length > 0 && value.every(isRing);
}
export function isFarmGeometry(value: unknown): value is FarmGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as FarmGeometry;
  if (geometry.type === "Polygon") return isPolygon(geometry.coordinates);
  return (
    geometry.type === "MultiPolygon" &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length > 0 &&
    geometry.coordinates.every(isPolygon)
  );
}
/** Rendering only: preserve every component and hole, converting [longitude, latitude] for map bounds. */
export function farmPositions(farm: DashboardFarm): MapPosition[] {
  if (isFarmGeometry(farm.boundary)) {
    const rings =
      farm.boundary.type === "Polygon"
        ? farm.boundary.coordinates
        : farm.boundary.coordinates.flat();
    return rings.flatMap((ring) => ring.map(([lng, lat]) => ({ lat, lng })));
  }
  return isMapPosition(farm.location) ? [farm.location] : [];
}

/** Keep the existing extent center when it belongs to the farm. Concave,
 * disjoint or holed parcels fall back to a real exterior boundary point. */
export function farmAnchor(farm: DashboardFarm): MapPosition | null {
  if (!isFarmGeometry(farm.boundary))
    return isMapPosition(farm.location) ? farm.location : null;
  const polygons =
    farm.boundary.type === "Polygon"
      ? [farm.boundary.coordinates]
      : farm.boundary.coordinates;
  function inRing(point: MapPosition, ring: Ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i],
        b = ring[j];
      if (
        a[1] > point.lat !== b[1] > point.lat &&
        point.lng < ((b[0] - a[0]) * (point.lat - a[1])) / (b[1] - a[1]) + a[0]
      )
        inside = !inside;
    }
    return inside;
  }
  const inside = (point: MapPosition) =>
    polygons.some(
      ([outer, ...holes]) =>
        inRing(point, outer) && !holes.some((hole) => inRing(point, hole)),
    );
  if (isMapPosition(farm.location) && inside(farm.location))
    return farm.location;
  const positions = farmPositions(farm);
  const extent = positions.reduce(
    (bounds, point) => ({
      south: Math.min(bounds.south, point.lat),
      north: Math.max(bounds.north, point.lat),
      west: Math.min(bounds.west, point.lng),
      east: Math.max(bounds.east, point.lng),
    }),
    { south: 90, north: -90, west: 180, east: -180 },
  );
  const center = {
    lat: (extent.south + extent.north) / 2,
    lng: (extent.west + extent.east) / 2,
  };
  if (inside(center)) return center;
  const [lng, lat] = polygons[0][0][0];
  return { lat, lng };
}
export function farmFeature(farm: DashboardFarm): object | null {
  const geometry = isFarmGeometry(farm.boundary)
    ? farm.boundary
    : isMapPosition(farm.location)
      ? { type: "Point", coordinates: [farm.location.lng, farm.location.lat] }
      : null;
  return geometry
    ? {
        type: "Feature",
        id: farm.id,
        properties: { name: farm.name },
        geometry,
      }
    : null;
}

export const MAX_BOUNDARY_VERTICES = 499; // Laravel's 500-point limit includes closure.
const EARTH_RADIUS = 6371008.8;
const radians = (value: number) => (value * Math.PI) / 180;

export function boundaryPoints(
  boundary: FarmGeometry | null | undefined,
): MapPosition[] {
  if (!isFarmGeometry(boundary)) return [];
  const ring =
    boundary.type === "Polygon"
      ? boundary.coordinates[0]
      : boundary.coordinates[0][0];
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
}

/** Spherical preview in m², matching Laravel's documented spherical fallback. */
export function boundaryArea(points: readonly MapPosition[]): number {
  if (points.length < 3 || !points.every(isMapPosition)) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    sum +=
      radians(b.lng - a.lng) *
      (2 + Math.sin(radians(a.lat)) + Math.sin(radians(b.lat)));
  }
  return (Math.abs(sum) * EARTH_RADIUS ** 2) / 2;
}

export function pointDistance(a: MapPosition, b: MapPosition): number {
  const h =
    Math.sin(radians(b.lat - a.lat) / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function boundaryError(
  points: readonly MapPosition[],
): "vertices" | "coordinates" | "intersection" | "area" | null {
  if (points.length < 3 || points.length > MAX_BOUNDARY_VERTICES)
    return "vertices";
  if (!points.every(isMapPosition)) return "coordinates";
  if (new Set(points.map((p) => `${p.lng},${p.lat}`)).size !== points.length)
    return "vertices";
  const cross = (a: MapPosition, b: MapPosition, c: MapPosition) =>
    (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (Math.abs(a.lng - b.lng) > 180) return "coordinates";
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j],
        d = points[(j + 1) % points.length];
      if (
        Math.max(a.lng, b.lng) < Math.min(c.lng, d.lng) ||
        Math.max(c.lng, d.lng) < Math.min(a.lng, b.lng) ||
        Math.max(a.lat, b.lat) < Math.min(c.lat, d.lat) ||
        Math.max(c.lat, d.lat) < Math.min(a.lat, b.lat)
      )
        continue;
      if (
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0
      )
        return "intersection";
    }
  }
  const area = boundaryArea(points);
  return !Number.isFinite(area) || area < 0.000001 || area > 999999999999.999999
    ? "area"
    : null;
}

export function pointsToBoundary(
  points: readonly MapPosition[],
): Extract<FarmGeometry, { type: "MultiPolygon" }> | null {
  if (boundaryError(points)) return null;
  const ring: Ring = points.map(({ lng, lat }) => [lng, lat]);
  const origin = ring[0];
  const signed = ring.reduce((sum, p, i) => {
    const q = ring[(i + 1) % ring.length];
    return (
      sum +
      (p[0] - origin[0]) * (q[1] - origin[1]) -
      (q[0] - origin[0]) * (p[1] - origin[1])
    );
  }, 0);
  if (signed < 0) ring.reverse();
  ring.push([...ring[0]]);
  return { type: "MultiPolygon", coordinates: [[ring]] };
}
