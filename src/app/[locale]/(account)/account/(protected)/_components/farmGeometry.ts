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

/** Shared per-click guard for every manual boundary editor. */
export const MIN_VERTEX_SPACING_M = 0.05;
export function boundaryPointRejection(
  points: readonly MapPosition[],
  point: MapPosition,
): "pointLimit" | "duplicate" | null {
  if (!isMapPosition(point) || points.length >= MAX_BOUNDARY_VERTICES)
    return "pointLimit";
  return points.some((p) => pointDistance(p, point) < MIN_VERTEX_SPACING_M)
    ? "duplicate"
    : null;
}

/** Snap distance in screen pixels, so closing works the same at every zoom. */
export const SNAP_TOLERANCE_PX = { mouse: 12, touch: 20 } as const;
export interface PixelPoint {
  x: number;
  y: number;
}
export function isNearFirstPoint(
  points: readonly MapPosition[],
  cursor: PixelPoint | null | undefined,
  project: (point: MapPosition) => PixelPoint | null | undefined,
  tolerance: number,
): boolean {
  if (points.length < 3 || !cursor) return false;
  const first = project(points[0]);
  return Boolean(
    first && Math.hypot(first.x - cursor.x, first.y - cursor.y) <= tolerance,
  );
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

type Coordinate = readonly number[];
const geometryPolygons = (geometry: FarmGeometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const turn = (a: Coordinate, b: Coordinate, c: Coordinate) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onEdge = (point: Coordinate, a: Coordinate, b: Coordinate) =>
  Math.abs(turn(a, b, point)) < 1e-12 &&
  point[0] >= Math.min(a[0], b[0]) - 1e-10 &&
  point[0] <= Math.max(a[0], b[0]) + 1e-10 &&
  point[1] >= Math.min(a[1], b[1]) - 1e-10 &&
  point[1] <= Math.max(a[1], b[1]) + 1e-10;
function ringContains(point: Coordinate, ring: Ring, edges: boolean): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (onEdge(point, a, b)) return edges;
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
const geometryContains = (
  geometry: FarmGeometry,
  point: Coordinate,
  edges: boolean,
) =>
  geometryPolygons(geometry).some(
    ([outer, ...holes]) =>
      ringContains(point, outer, edges) &&
      !holes.some((hole) => ringContains(point, hole, !edges)),
  );
const geometrySegments = (geometry: FarmGeometry) =>
  geometryPolygons(geometry).flatMap((p) =>
    p.flatMap((r) => r.slice(1).map((b, i) => [r[i], b] as const)),
  );
const segmentsCross = (
  p: Coordinate,
  q: Coordinate,
  r: Coordinate,
  s: Coordinate,
) =>
  turn(p, q, r) * turn(p, q, s) < -1e-24 &&
  turn(r, s, p) * turn(r, s, q) < -1e-24;
/** One edge leaves the container: an end or its midpoint lies outside, or it
 * crosses a container edge. Touching or following an edge stays inside. */
function edgeLeavesContainer(
  container: FarmGeometry,
  a: Coordinate,
  b: Coordinate,
): boolean {
  return (
    !geometryContains(container, a, true) ||
    !geometryContains(
      container,
      [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      true,
    ) ||
    geometrySegments(container).some(([r, s]) => segmentsCross(a, b, r, s))
  );
}

/** One edge enters an area another record already uses: an end or its
 * midpoint lies strictly inside, or it crosses that area's edge. Sharing or
 * touching an edge is allowed. */
function edgeEntersArea(
  area: FarmGeometry,
  a: Coordinate,
  b: Coordinate,
): boolean {
  return (
    geometryContains(area, a, false) ||
    geometryContains(area, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], false) ||
    geometrySegments(area).some(([r, s]) => segmentsCross(a, b, r, s))
  );
}

export type BoundaryConflict = "outside" | "overlap" | null;
/** Live drawing preview with cropAllocationError's rules: corners and edges
 * that leave `inside` ("outside", reported first) or enter an `avoid` area
 * ("overlap"). Edge i joins point i to i + 1; a closed shape adds the edge
 * from the last point back to the first. `enclosed` is an avoid area a closed
 * shape surrounds without any edge touching it. */
export function boundaryConflicts(
  points: readonly MapPosition[],
  limits: { inside: FarmGeometry; avoid: readonly FarmGeometry[] },
  closed: boolean,
): {
  vertices: BoundaryConflict[];
  edges: BoundaryConflict[];
  enclosed: number | null;
} {
  const coordinates = points.map(({ lng, lat }) => [lng, lat] as const);
  const count =
    closed && points.length >= 3 ? points.length : points.length - 1;
  const pairs = Array.from({ length: Math.max(0, count) }, (_, i) => [
    coordinates[i],
    coordinates[(i + 1) % coordinates.length],
  ]);
  const edges = pairs.map(([a, b]): BoundaryConflict =>
    edgeLeavesContainer(limits.inside, a, b)
      ? "outside"
      : limits.avoid.some((area) => edgeEntersArea(area, a, b))
        ? "overlap"
        : null,
  );
  const drawn = closed ? pointsToBoundary(points) : null;
  const enclosed = drawn
    ? limits.avoid.findIndex(
        (area) =>
          !pairs.some(([a, b]) => edgeEntersArea(area, a, b)) &&
          geometryPolygons(area).some(([outer]) =>
            outer.some((point) => geometryContains(drawn, point, false)),
          ),
      )
    : -1;
  return {
    vertices: coordinates.map((point) =>
      !geometryContains(limits.inside, point, true)
        ? "outside"
        : limits.avoid.some((area) => geometryContains(area, point, false))
          ? "overlap"
          : null,
    ),
    edges,
    enclosed: enclosed >= 0 ? enclosed : null,
  };
}

/** Crop allocation preview. Topology and shared edges are rechecked by Laravel. */
export function cropAllocationError(
  boundary: FarmGeometry,
  farm: FarmGeometry,
  occupied: readonly FarmGeometry[],
): "outsideFarm" | "overlap" | null {
  const crossing = (a: FarmGeometry, b: FarmGeometry) =>
    geometrySegments(a).some(([p, q]) =>
      geometrySegments(b).some(([r, s]) => segmentsCross(p, q, r, s)),
    );
  if (
    geometrySegments(boundary).some(([a, b]) => edgeLeavesContainer(farm, a, b))
  )
    return "outsideFarm";
  if (
    geometryPolygons(farm).some(([, ...holes]) =>
      holes.some((hole) => geometryContains(boundary, hole[0], false)),
    )
  )
    return "outsideFarm";
  function interiorSamples(geometry: FarmGeometry) {
    return geometrySegments(geometry).flatMap(([a, b]) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = Math.hypot(dx, dy);
      if (!length) return [];
      const epsilon = Math.min(length / 100, 1e-7),
        x = (a[0] + b[0]) / 2,
        y = (a[1] + b[1]) / 2;
      return [
        [x - (dy / length) * epsilon, y + (dx / length) * epsilon],
        [x + (dy / length) * epsilon, y - (dx / length) * epsilon],
      ].filter((point) => geometryContains(geometry, point, false));
    });
  }
  for (const other of occupied) {
    if (
      crossing(boundary, other) ||
      interiorSamples(boundary).some((p) =>
        geometryContains(other, p, false),
      ) ||
      interiorSamples(other).some((p) => geometryContains(boundary, p, false))
    )
      return "overlap";
  }
  return null;
}
