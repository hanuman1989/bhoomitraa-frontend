"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/common/Tooltip";
import { AlertIcon, ReopenIcon } from "@/icons";
import { boundaryConflicts } from "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";
import type {
  FarmGeometry,
  MapPosition,
} from "@/app/[locale]/(account)/account/(protected)/_components/dashboardTypes";
import type {
  MapsInstance,
  MapsOverlay,
  MapsSDK,
} from "@/app/[locale]/(account)/account/(protected)/_components/googleMaps";

/** Where a drawn boundary may go: inside `inside`, clear of every `avoid` area. */
export interface BoundaryLimits {
  inside: FarmGeometry;
  avoid: readonly FarmGeometry[];
  messages: { outside: string; overlap: string };
}

// Map API colours mirror the error-500 and orange-500 theme tokens.
const COLORS = { outside: "#f04438", overlap: "#fb6514" } as const;
const KINDS = ["outside", "overlap"] as const;

/** Paints edges that leave the farm red and edges that enter another crop
 * orange, with an alert (and Undo while drawing) beside the first problem.
 * Display only; save validation is unchanged. */
export default function BoundaryConflictLayer({
  sdk,
  map,
  points,
  closed,
  limits,
  onUndo,
}: {
  sdk: MapsSDK;
  map: MapsInstance;
  points: readonly MapPosition[];
  closed: boolean;
  limits: BoundaryLimits;
  onUndo?: () => void;
}) {
  const t = useTranslations("farmerFarms");
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const overlay = useRef<MapsOverlay | null>(null);
  const anchor = useRef<MapPosition | null>(null);
  const { inside, avoid } = limits;
  const conflicts = useMemo(
    () => boundaryConflicts(points, { inside, avoid }, closed),
    [points, inside, avoid, closed],
  );
  const kinds = KINDS.filter(
    (kind) =>
      conflicts.edges.includes(kind) ||
      conflicts.vertices.includes(kind) ||
      (kind === "overlap" && conflicts.enclosed !== null),
  );
  const alertAt = useMemo<MapPosition | null>(() => {
    const edge = conflicts.edges.findIndex(Boolean);
    if (edge >= 0) {
      const a = points[edge],
        b = points[(edge + 1) % points.length];
      return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
    }
    const vertex = conflicts.vertices.findIndex(Boolean);
    if (vertex >= 0) return points[vertex];
    if (conflicts.enclosed === null) return null;
    const area = avoid[conflicts.enclosed];
    const [lng, lat] =
      area.type === "Polygon"
        ? area.coordinates[0][0]
        : area.coordinates[0][0][0];
    return { lat, lng };
  }, [points, conflicts, avoid]);

  useEffect(() => {
    const view = new sdk.OverlayView();
    overlay.current = view;
    let element: HTMLDivElement | null = null;
    view.onAdd = () => {
      const pane = view.getPanes()?.floatPane;
      if (!pane) return;
      element = document.createElement("div");
      element.dir = "ltr"; // Google canvas coordinates are physical, including in RTL.
      element.className = "absolute";
      element.hidden = true;
      // Taps on the alert (and its Undo button) never add a map point.
      sdk.OverlayView.preventMapHitsAndGesturesFrom(element);
      pane.appendChild(element);
      setHost(element);
    };
    view.draw = () => {
      if (!element) return;
      const position =
        anchor.current &&
        view.getProjection()?.fromLatLngToDivPixel(anchor.current);
      element.hidden = !position;
      if (position) {
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;
      }
    };
    view.onRemove = () => {
      element?.remove();
      const removed = element;
      element = null;
      setHost((current) => (current === removed ? null : current));
    };
    view.setMap(map);
    return () => {
      view.setMap(null);
      sdk.event.clearInstanceListeners(view);
      overlay.current = null;
    };
  }, [sdk, map]);

  useEffect(() => {
    const shapes: { setMap(map: MapsInstance | null): void }[] = [];
    const line = (path: MapPosition[], color: string) =>
      shapes.push(
        new sdk.Polyline({
          map,
          path,
          strokeColor: color,
          strokeOpacity: 1,
          strokeWeight: 4,
          geodesic: true,
          clickable: false,
          zIndex: 9,
        }),
      );
    conflicts.edges.forEach((kind, i) => {
      if (kind)
        line([points[i], points[(i + 1) % points.length]], COLORS[kind]);
    });
    if (conflicts.enclosed !== null) {
      const area = avoid[conflicts.enclosed];
      const polygons =
        area.type === "Polygon" ? [area.coordinates] : area.coordinates;
      for (const [outer] of polygons)
        line(
          outer.map(([lng, lat]) => ({ lat, lng })),
          COLORS.overlap,
        );
    }
    if (conflicts.vertices.some(Boolean)) {
      const corners = new sdk.Data({ map });
      corners.addGeoJson({
        type: "FeatureCollection",
        features: points.flatMap((point, id) =>
          conflicts.vertices[id]
            ? [
                {
                  type: "Feature",
                  id,
                  geometry: {
                    type: "Point",
                    coordinates: [point.lng, point.lat],
                  },
                  properties: { kind: conflicts.vertices[id] },
                },
              ]
            : [],
        ),
      });
      corners.setStyle((feature) => ({
        clickable: false,
        zIndex: 10,
        icon: {
          path: sdk.SymbolPath.CIRCLE,
          scale: 6,
          fillColor:
            feature.getProperty("kind") === "outside"
              ? COLORS.outside
              : COLORS.overlap,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      }));
      shapes.push(corners);
    }
    anchor.current = alertAt;
    overlay.current?.draw();
    return () => shapes.forEach((shape) => shape.setMap(null));
  }, [sdk, map, points, conflicts, avoid, alertAt]);

  if (!host || !alertAt) return null;
  const undo = t("wizard.undoPoint");
  return createPortal(
    <div
      role="alert"
      className={`shadow-theme-lg absolute -mt-3 flex w-max max-w-64 -translate-x-1/2 -translate-y-full items-center gap-2 rounded-xl py-2 ps-3 pe-2 text-xs font-semibold text-white sm:max-w-xs ${kinds.includes("outside") ? "bg-error-600" : "bg-orange-600"}`}
    >
      <AlertIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 space-y-0.5">
        {kinds.map((kind) => (
          <span key={kind} className="block">
            {limits.messages[kind]}
          </span>
        ))}
      </span>
      {onUndo && (
        <Tooltip content={undo} className="shrink-0">
          <button
            type="button"
            onClick={onUndo}
            aria-label={undo}
            className="shadow-theme-sm flex size-11 items-center justify-center rounded-full bg-white text-gray-800 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-8"
          >
            <ReopenIcon aria-hidden="true" className="size-4" />
          </button>
        </Tooltip>
      )}
    </div>,
    host,
  );
}
