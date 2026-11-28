import type { MapPosition, MapType } from "./dashboardTypes";

/** Narrow declarations for the official SDK surface used here; no extra Maps package is needed. */
export interface MapsListener {
  remove(): void;
}
export interface MapsGeocoderResult {
  geometry: { location: MapsLatLng; viewport?: MapsBounds };
  address_components?: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  types?: string[];
  partial_match?: boolean;
}
export interface MapsLatLng {
  lat(): number;
  lng(): number;
}
export interface MapsBounds {
  extend(point: MapPosition): MapsBounds;
  getCenter(): MapsLatLng;
}
export interface MapsFeature {
  getId(): number | string | undefined;
  getProperty(name: string): unknown;
}
export interface MapsStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  clickable?: boolean;
  editable?: boolean;
  draggable?: boolean;
  visible?: boolean;
  zIndex?: number;
  label?: string;
  title?: string;
  icon?:
    | {
        path: number;
        scale: number;
        fillColor: string;
        fillOpacity: number;
        strokeColor: string;
        strokeWeight: number;
      }
    | { url: string; scaledSize?: MapsSize; anchor?: MapsPoint };
}
export interface MapsSize {
  width: number;
  height: number;
}
export interface MapsPoint {
  x: number;
  y: number;
}
export interface MapsData {
  addGeoJson(value: object): MapsFeature[];
  setStyle(value: MapsStyle | ((feature: MapsFeature) => MapsStyle)): void;
  forEach(callback: (feature: MapsFeature) => void): void;
  remove(feature: MapsFeature): void;
  setMap(map: MapsInstance | null): void;
  addListener(
    event: "click",
    callback: (event: { feature: MapsFeature }) => void,
  ): MapsListener;
  /** A draggable feature was moved; a point's new geometry returns its position. */
  addListener(
    event: "setgeometry",
    callback: (event: {
      feature: MapsFeature;
      newGeometry: { get(): MapsLatLng };
    }) => void,
  ): MapsListener;
}
/** Pointer event on a polyline; `vertex` is set when it hit an editable point. */
export interface MapsPolyMouseEvent {
  latLng: MapsLatLng | null;
  vertex?: number;
  domEvent?: Event;
}
export interface MapsSymbol {
  path: string | number;
  scale: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
}
export interface MapsInstance {
  setMapTypeId(type: MapType | "terrain"): void;
  addListener(
    event: "click" | "mousemove",
    callback: (event: { latLng: MapsLatLng | null; domEvent?: Event }) => void,
  ): MapsListener;
  addListener(event: "idle" | "mouseout", callback: () => void): MapsListener;
  setOptions(options: {
    draggableCursor?: string | null;
    disableDoubleClickZoom?: boolean;
  }): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
  getCenter(): MapsLatLng | undefined;
  panTo(point: MapPosition): void;
  panBy(x: number, y: number): void;
  fitBounds(
    bounds: MapsBounds,
    padding: { top: number; bottom: number; left: number; right: number },
  ): void;
}
export interface MapsInfoWindow {
  setContent(content: HTMLElement): void;
  setPosition(position: MapsLatLng | MapPosition): void;
  open(options: { map: MapsInstance; shouldFocus: boolean }): void;
  close(): void;
}
export interface MapsOverlay {
  onAdd(): void;
  draw(): void;
  onRemove(): void;
  setMap(map: MapsInstance | null): void;
  getPanes(): { floatPane: HTMLElement } | null;
  getProjection():
    | {
        fromLatLngToDivPixel(
          position: MapPosition,
        ): { x: number; y: number } | null;
        fromLatLngToContainerPixel(
          position: MapPosition,
        ): { x: number; y: number } | null;
      }
    | undefined;
}
export interface MapsSDK {
  Map: new (
    element: HTMLElement,
    options: {
      center: MapPosition;
      zoom: number;
      mapTypeId: MapType | "terrain";
      disableDefaultUI: boolean;
      gestureHandling: string;
      clickableIcons: boolean;
      keyboardShortcuts: boolean;
    },
  ) => MapsInstance;
  Data: new (options: { map: MapsInstance }) => MapsData;
  LatLngBounds: new () => MapsBounds;
  Size: new (width: number, height: number) => MapsSize;
  Point: new (x: number, y: number) => MapsPoint;
  OverlayView: {
    new (): MapsOverlay;
    preventMapHitsAndGesturesFrom(element: HTMLElement): void;
  };
  InfoWindow: new (options: { disableAutoPan: boolean }) => MapsInfoWindow;
  SymbolPath: { CIRCLE: number };
  Polygon: new (options: {
    map: MapsInstance;
    paths: MapPosition[] | MapPosition[][];
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeOpacity?: number;
    strokeWeight: number;
    editable: boolean;
    clickable: boolean;
    geodesic: boolean;
    zIndex?: number;
  }) => MapsPolygon;
  Polyline: new (options: {
    map: MapsInstance;
    path: MapPosition[];
    strokeColor: string;
    strokeOpacity: number;
    strokeWeight: number;
    geodesic: boolean;
    clickable?: boolean;
    /** Vertex and midpoint handles; dragging a midpoint inserts a point. */
    editable?: boolean;
    zIndex?: number;
    icons?: { icon: MapsSymbol; offset: string; repeat: string }[];
  }) => MapsPolyline;
  Circle: new (options: {
    map: MapsInstance;
    center: MapPosition;
    radius: number;
    fillColor: string;
    fillOpacity: number;
    strokeColor: string;
    strokeWeight: number;
  }) => { setMap(map: MapsInstance | null): void };
  importLibrary(name: "geocoding"): Promise<{
    Geocoder: new () => {
      geocode(request: {
        address: string;
        region: string;
        componentRestrictions?: {
          country: string;
          administrativeArea?: string;
        };
        fulfillOnZeroResults?: boolean;
      }): Promise<{ results: MapsGeocoderResult[] }>;
    };
  }>;
  event: {
    clearInstanceListeners(instance: object): void;
    trigger(instance: object, event: string): void;
  };
}
export interface MapsPath {
  getArray(): MapsLatLng[];
  addListener(
    event: "set_at" | "insert_at" | "remove_at",
    callback: () => void,
  ): MapsListener;
}
export interface MapsPolygon {
  setPath(points: MapPosition[]): void;
  getPath(): MapsPath;
  setMap(map: MapsInstance | null): void;
  setEditable(editable: boolean): void;
  setOptions(options: { fillOpacity: number; strokeColor: string }): void;
  addListener(event: "click", callback: () => void): MapsListener;
}
export interface MapsPolyline {
  setMap(map: MapsInstance | null): void;
  setPath(path: MapPosition[]): void;
  getPath(): MapsPath;
  addListener(
    event: "click" | "dblclick" | "contextmenu",
    callback: (event: MapsPolyMouseEvent) => void,
  ): MapsListener;
}
declare global {
  interface Window {
    google?: { maps: MapsSDK };
    krishiMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}
let sdkPromise: Promise<MapsSDK> | null = null;
let authenticationFailed = false;

// Session-memory only. Share in-flight/resolved address lookups across editor
// and dashboard effects; never persist geocoding results or profile data.
const geocoding = new WeakMap<
  MapsSDK,
  Map<string, Promise<{ results: MapsGeocoderResult[] }>>
>();
export function geocodeMapAddress(
  sdk: MapsSDK,
  address: string,
  restrictToIndia = false,
  administrativeArea?: string,
) {
  let requests = geocoding.get(sdk);
  if (!requests) {
    requests = new Map();
    geocoding.set(sdk, requests);
  }
  const key = JSON.stringify([restrictToIndia, administrativeArea, address]);
  const existing = requests.get(key);
  if (existing) return existing;
  const request = sdk
    .importLibrary("geocoding")
    .then(({ Geocoder }) =>
      new Geocoder().geocode({
        address,
        region: "IN",
        ...(restrictToIndia
          ? {
              componentRestrictions: {
                country: "IN",
                ...(administrativeArea ? { administrativeArea } : {}),
              },
              fulfillOnZeroResults: true,
            }
          : {}),
      }),
    )
    .catch((error: unknown) => {
      requests.delete(key);
      throw error;
    });
  if (requests.size >= 50) requests.delete(requests.keys().next().value!);
  requests.set(key, request);
  return request;
}

export function loadGoogleMaps(
  apiKey: string,
  language: string,
): Promise<MapsSDK> {
  if (authenticationFailed)
    return Promise.reject(new Error("Maps authentication unavailable"));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<MapsSDK>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "krishi-google-maps";
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.search = new URLSearchParams({
      key: apiKey,
      v: "quarterly",
      loading: "async",
      callback: "krishiMapsReady",
      language,
      region: "IN",
    }).toString();
    script.src = url.toString();
    script.async = true;
    const previousAuthFailure = window.gm_authFailure;
    const timer = window.setTimeout(() => fail(), 20000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      sdkPromise = null;
      reject(new Error("Maps unavailable"));
    }
    window.krishiMapsReady = () => {
      window.clearTimeout(timer);
      if (window.google?.maps?.Map) resolve(window.google.maps);
      else fail();
    };
    window.gm_authFailure = () => {
      authenticationFailed = true;
      window.dispatchEvent(new Event("krishi-maps-auth-error"));
      fail();
      previousAuthFailure?.();
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return sdkPromise;
}
