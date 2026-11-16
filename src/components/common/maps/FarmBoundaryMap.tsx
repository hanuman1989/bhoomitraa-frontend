"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  loadGoogleMaps,
  geocodeMapAddress,
  type MapsSDK,
  type MapsInstance,
  type MapsPolygon,
  type MapsPolyline,
  type MapsPath,
  type MapsListener,
} from "@/app/[locale]/(account)/account/(protected)/_components/googleMaps";
import { DEFAULT_MAP_VIEW } from "@/app/[locale]/(account)/account/(protected)/_components/dashboardState";
import { fitMapPositions } from "@/app/[locale]/(account)/account/(protected)/_components/mapViewport";
import type {
  MapPosition,
  FarmGeometry,
} from "@/app/[locale]/(account)/account/(protected)/_components/dashboardTypes";
import { farmPositions } from "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";
import { PlusIcon, MinusIcon, LocationPinIcon } from "@/icons";
import { cn } from "@/utils";

interface PolygonResources {
  polygon: MapsPolygon;
  path?: MapsPath;
  listeners: MapsListener[];
}

export default function FarmBoundaryMap({
  points,
  editable = false,
  drawing = false,
  gps = false,
  accuracy,
  location,
  onAdd,
  onEdit,
  children,
  className,
  referenceLayers = [],
  displayGeometry,
}: {
  points: MapPosition[];
  editable?: boolean;
  drawing?: boolean;
  gps?: boolean;
  accuracy?: number | null;
  location?: string;
  onAdd?: (point: MapPosition) => void;
  onEdit?: (points: MapPosition[]) => void;
  children?: ReactNode;
  className?: string;
  referenceLayers?: {
    id: string;
    name: string;
    boundary: FarmGeometry;
    color: string;
    fillOpacity?: number;
  }[];
  displayGeometry?: FarmGeometry | null;
}) {
  const t = useTranslations("farmerFarms");
  const locale = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const resources = useRef<{ sdk: MapsSDK; map: MapsInstance } | null>(null);
  const callbacks = useRef({ onAdd, onEdit, drawing });
  const initial = useRef({ points, location, locale, referenceLayers });
  const polygonRef = useRef<PolygonResources | null>(null);
  const showPolygon = !drawing && !gps && points.length >= 3;
  const hasDisplayGeometry = Boolean(displayGeometry);
  const [attempt, setAttempt] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [type, setType] = useState<"satellite" | "roadmap" | "terrain">(
    "satellite",
  );
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    callbacks.current = { onAdd, onEdit, drawing };
  }, [onAdd, onEdit, drawing]);
  const observePath = useCallback((resource: PolygonResources) => {
    resource.listeners.forEach((listener) => listener.remove());
    const path = resource.polygon.getPath();
    resource.path = path;
    resource.listeners = path
      ? (["set_at", "insert_at", "remove_at"] as const).map((event) =>
          path.addListener(event, () => {
            if (polygonRef.current !== resource || resource.path !== path)
              return;
            callbacks.current.onEdit?.(
              path
                .getArray()
                .map((point) => ({ lat: point.lat(), lng: point.lng() })),
            );
          }),
        )
      : [];
  }, []);
  useEffect(() => {
    let active = true;
    let resize: ResizeObserver | undefined;
    async function initialize() {
      try {
        if (!key) throw new Error("Missing map key");
        const sdk = await loadGoogleMaps(key, initial.current.locale);
        if (!active || !host.current) return;
        const map = new sdk.Map(host.current, {
          center: initial.current.points[0] ?? DEFAULT_MAP_VIEW.center,
          zoom: initial.current.points.length ? 17 : DEFAULT_MAP_VIEW.zoom,
          mapTypeId: "satellite",
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          keyboardShortcuts: true,
        });
        resources.current = { sdk, map };
        map.addListener("click", ({ latLng }) => {
          if (latLng && callbacks.current.drawing)
            callbacks.current.onAdd?.({ lat: latLng.lat(), lng: latLng.lng() });
        });
        if (initial.current.referenceLayers.length)
          fitMapPositions(
            sdk,
            map,
            initial.current.referenceLayers.flatMap((layer) =>
              farmPositions({
                id: 0,
                name: layer.name,
                boundary: layer.boundary,
                location: null,
              }),
            ),
            16,
          );
        else if (initial.current.points.length)
          fitMapPositions(sdk, map, initial.current.points, 16);
        else if (initial.current.location) {
          try {
            const result = await geocodeMapAddress(
              sdk,
              initial.current.location,
            );
            if (active && result.results[0]) {
              map.panTo({
                lat: result.results[0].geometry.location.lat(),
                lng: result.results[0].geometry.location.lng(),
              });
              map.setZoom(16);
            } else if (active) setNotice("geocodeFailed");
          } catch {
            if (active) setNotice("geocodeFailed");
          }
        }
        if (!active) return;
        resize = new ResizeObserver(() => sdk.event.trigger(map, "resize"));
        resize.observe(host.current);
        setGeneration((value) => value + 1);
        setState("ready");
      } catch {
        if (active) setState("error");
      }
    }
    function failed() {
      if (active) setState("error");
    }
    window.addEventListener("krishi-maps-auth-error", failed);
    void initialize();
    return () => {
      active = false;
      resize?.disconnect();
      window.removeEventListener("krishi-maps-auth-error", failed);
      if (resources.current)
        resources.current.sdk.event.clearInstanceListeners(
          resources.current.map,
        );
      resources.current = null;
    };
  }, [key, attempt]);
  useEffect(() => {
    const current = resources.current;
    if (!current || !referenceLayers.length) return;
    const layers = new current.sdk.Data({ map: current.map });
    layers.addGeoJson({
      type: "FeatureCollection",
      features: referenceLayers.map((layer) => ({
        type: "Feature",
        id: layer.id,
        properties: {
          name: layer.name,
          color: layer.color,
          opacity: layer.fillOpacity ?? 0.15,
        },
        geometry: layer.boundary,
      })),
    });
    layers.setStyle((feature) => ({
      clickable: false,
      editable: false,
      draggable: false,
      fillColor: String(feature.getProperty("color")),
      fillOpacity: Number(feature.getProperty("opacity")),
      strokeColor: String(feature.getProperty("color")),
      strokeWeight: 3,
      zIndex: 1,
      title: String(feature.getProperty("name")),
    }));
    return () => {
      layers.setMap(null);
      current.sdk.event.clearInstanceListeners(layers);
    };
  }, [referenceLayers, generation]);
  useEffect(() => {
    const current = resources.current;
    if (!current || !displayGeometry) return;
    const layer = new current.sdk.Data({ map: current.map });
    layer.addGeoJson({
      type: "Feature",
      geometry: displayGeometry,
      properties: {},
    });
    layer.setStyle({
      clickable: false,
      editable: false,
      fillColor: "#12b76a",
      fillOpacity: 0.32,
      strokeColor: "#039855",
      strokeWeight: 3,
      zIndex: 3,
    });
    return () => layer.setMap(null);
  }, [displayGeometry, generation]);
  useEffect(() => {
    const current = resources.current;
    if (!current || !showPolygon) return;
    const { sdk, map } = current;
    const polygon = new sdk.Polygon({
      map,
      paths: [points],
      fillColor: "#12b76a",
      fillOpacity: displayGeometry ? 0 : 0.32,
      strokeColor: "#039855",
      strokeWeight: 3,
      editable,
      clickable: editable,
      geodesic: true,
    });
    const resource: PolygonResources = { polygon, listeners: [] };
    polygonRef.current = resource;
    observePath(resource);
    return () => {
      resource.listeners.forEach((listener) => listener.remove());
      polygon.setMap(null);
      if (polygonRef.current === resource) polygonRef.current = null;
    };
    // Points update independently so a vertex drag never replaces the active polygon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPolygon, editable, generation, observePath, hasDisplayGeometry]);
  useEffect(() => {
    const current = resources.current;
    if (!current) return;
    const { sdk, map } = current;
    let line: MapsPolyline | undefined;
    let circle: { setMap(map: MapsInstance | null): void } | undefined;
    const resource = polygonRef.current;
    if (resource) {
      const previous = resource.path?.getArray() ?? [];
      if (
        previous.length !== points.length ||
        previous.some(
          (p, i) => p.lat() !== points[i].lat || p.lng() !== points[i].lng,
        )
      ) {
        resource.polygon.setPath(points);
        observePath(resource);
      }
    }
    if ((drawing || gps) && points.length) {
      line = new sdk.Polyline({
        map,
        path: points,
        strokeColor: gps ? "#465fff" : "#039855",
        strokeWeight: 3,
        strokeOpacity: gps ? 0 : 1,
        geodesic: true,
        ...(gps
          ? {
              icons: [
                {
                  icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                  offset: "0",
                  repeat: "16px",
                },
              ],
            }
          : {}),
      });
    }
    if (gps && points.length) {
      circle = new sdk.Circle({
        map,
        center: points[points.length - 1],
        radius: accuracy ?? 0,
        fillColor: "#465fff",
        fillOpacity: 0.2,
        strokeColor: "#465fff",
        strokeWeight: 2,
      });
      map.panTo(points[points.length - 1]);
      if ((map.getZoom() ?? 0) < 16) map.setZoom(18);
    }
    const vertices = new sdk.Data({ map });
    vertices.addGeoJson({
      type: "FeatureCollection",
      features: points.map((point, id) => ({
        type: "Feature",
        id,
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
        properties: {},
      })),
    });
    vertices.setStyle({
      clickable: false,
      icon: {
        path: sdk.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: gps ? "#465fff" : "#039855",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });
    return () => {
      line?.setMap(null);
      circle?.setMap(null);
      vertices.setMap(null);
    };
  }, [points, drawing, editable, gps, accuracy, generation, observePath]);
  useEffect(() => {
    resources.current?.map.setMapTypeId(type);
  }, [type, generation]);
  async function locate() {
    if (!navigator.geolocation) {
      setNotice("gpsUnsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resources.current?.map.panTo({
          lat: coords.latitude,
          lng: coords.longitude,
        });
        resources.current?.map.setZoom(18);
      },
      () => setNotice("gpsUnavailable"),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }
  return (
    <div
      className={cn(
        "relative h-full min-h-80 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800",
        className,
      )}
    >
      <div ref={host} aria-label={t("mapLabel")} className="absolute inset-0" />
      {state !== "ready" && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 px-5 text-center dark:bg-gray-800"
        >
          <p>{t(state === "error" ? "mapFailed" : "mapLoading")}</p>
          {state === "error" && (
            <button
              type="button"
              onClick={() => {
                setState("loading");
                setAttempt((value) => value + 1);
              }}
              className="text-success-700 underline"
            >
              {t("retry")}
            </button>
          )}
        </div>
      )}
      {state === "ready" && (
        <>
          <div
            role="group"
            aria-label={t("mapType")}
            className="shadow-theme-sm absolute start-3 top-3 flex overflow-hidden rounded-lg bg-white text-xs text-gray-800"
          >
            {(["satellite", "roadmap", "terrain"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                aria-pressed={type === item}
                className={`px-3 py-2 ${type === item ? "bg-success-700 text-white" : "hover:bg-success-50"}`}
              >
                {t(item)}
              </button>
            ))}
          </div>
          <div className="text-success-700 absolute end-3 top-14 flex flex-col gap-2">
            <div className="shadow-theme-sm overflow-hidden rounded-xl bg-white">
              <button
                type="button"
                aria-label={t("zoomIn")}
                onClick={() => {
                  const map = resources.current?.map;
                  if (map) map.setZoom((map.getZoom() ?? 16) + 1);
                }}
                className="flex size-9 items-center justify-center"
              >
                <PlusIcon className="size-4" />
              </button>
              <button
                type="button"
                aria-label={t("zoomOut")}
                onClick={() => {
                  const map = resources.current?.map;
                  if (map) map.setZoom((map.getZoom() ?? 16) - 1);
                }}
                className="flex size-9 items-center justify-center"
              >
                <MinusIcon className="size-4" />
              </button>
            </div>
            <button
              type="button"
              aria-label={t("locate")}
              onClick={locate}
              className="shadow-theme-sm flex size-9 items-center justify-center rounded-full bg-white"
            >
              <LocationPinIcon
                viewBox="0 0 24 24"
                className="size-5 [&_path]:stroke-current"
              />
            </button>
          </div>
        </>
      )}
      {notice && (
        <p
          role="status"
          className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 p-2 text-xs text-gray-700"
        >
          {t(notice)}
        </p>
      )}
      {children}
    </div>
  );
}
