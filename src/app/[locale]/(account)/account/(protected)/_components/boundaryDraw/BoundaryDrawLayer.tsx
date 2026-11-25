"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  farmAnchor,
  isNearFirstPoint,
  pointsToBoundary,
  SNAP_TOLERANCE_PX,
} from "../farmGeometry";
import type { MapPosition } from "../dashboardTypes";
import type {
  MapsInstance,
  MapsLatLng,
  MapsListener,
  MapsOverlay,
  MapsPolyline,
  MapsSDK,
} from "../googleMaps";
import type { BoundaryDrawMode } from "./boundaryDrawState";

// Map API colours mirror theme tokens: success-600 (Add Farm step 3 drawing)
// and warning-400 for the unsaved draft, which no saved farm uses.
const DRAW_COLOR = "#039855";
const DRAFT_COLOR = "#fdb022";
const dashed = {
  icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
  offset: "0",
  repeat: "14px",
};

function isTouch(event?: Event) {
  if (event && "pointerType" in event)
    return (event as PointerEvent).pointerType !== "mouse";
  if (event && "touches" in event) return true;
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/** Draws the dashboard boundary draft on the existing map instance. */
export default function BoundaryDrawLayer({
  sdk,
  map,
  mode,
  points,
  label,
  onAdd,
  onComplete,
  onOpen,
}: {
  sdk: MapsSDK;
  map: MapsInstance;
  mode: Exclude<BoundaryDrawMode, "idle">;
  points: readonly MapPosition[];
  label: string;
  onAdd: (point: MapPosition) => void;
  onComplete: () => void;
  onOpen: () => void;
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [snapping, setSnapping] = useState(false);
  const overlay = useRef<MapsOverlay | null>(null);
  const rubber = useRef<MapsPolyline | null>(null);
  const anchor = useRef<MapPosition | null>(null);
  const latest = useRef({ mode, points, onAdd, onComplete, onOpen });
  useEffect(() => {
    latest.current = { mode, points, onAdd, onComplete, onOpen };
  });
  const snap = snapping && mode === "drawing" && points.length >= 3;

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
    const line = new sdk.Polyline({
      map,
      path: [],
      strokeColor: DRAW_COLOR,
      strokeOpacity: 0,
      strokeWeight: 2,
      geodesic: false,
      clickable: false,
      zIndex: 6,
      icons: [dashed],
    });
    rubber.current = line;
    map.setOptions({
      draggableCursor: "crosshair",
      disableDoubleClickZoom: true,
    });
    const project = (point: MapPosition) =>
      view.getProjection()?.fromLatLngToContainerPixel(point) ?? null;
    function locate(latLng: MapsLatLng, event?: Event) {
      const point = { lat: latLng.lat(), lng: latLng.lng() };
      const closing = isNearFirstPoint(
        latest.current.points,
        project(point),
        project,
        SNAP_TOLERANCE_PX[isTouch(event) ? "touch" : "mouse"],
      );
      return { point, closing };
    }
    function hideRubber() {
      line.setPath([]);
      setSnapping(false);
    }
    const listeners: MapsListener[] = [
      map.addListener("click", ({ latLng, domEvent }) => {
        if (!latLng || latest.current.mode !== "drawing") return;
        const { point, closing } = locate(latLng, domEvent);
        if (closing) latest.current.onComplete();
        else latest.current.onAdd(point);
      }),
      map.addListener("mousemove", ({ latLng, domEvent }) => {
        const { mode, points } = latest.current;
        if (!latLng || mode !== "drawing" || !points.length) {
          hideRubber();
          return;
        }
        const { point, closing } = locate(latLng, domEvent);
        setSnapping(closing);
        line.setPath([points[points.length - 1], closing ? points[0] : point]);
      }),
      map.addListener("mouseout", hideRubber),
    ];
    return () => {
      listeners.forEach((listener) => listener.remove());
      line.setMap(null);
      rubber.current = null;
      view.setMap(null);
      sdk.event.clearInstanceListeners(view);
      overlay.current = null;
      map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
    };
  }, [sdk, map]);

  useEffect(() => {
    const shapes: { setMap(map: MapsInstance | null): void }[] = [];
    const listeners: MapsListener[] = [];
    const path = [...points];
    if (mode === "drawn") rubber.current?.setPath([]);
    if (mode === "drawing" && path.length > 1)
      shapes.push(
        new sdk.Polyline({
          map,
          path,
          strokeColor: DRAW_COLOR,
          strokeOpacity: 1,
          strokeWeight: 3,
          geodesic: true,
          clickable: false,
          zIndex: 6,
        }),
      );
    if (mode === "drawn" && path.length >= 3) {
      const polygon = new sdk.Polygon({
        map,
        paths: path,
        fillColor: DRAFT_COLOR,
        fillOpacity: 0.25,
        strokeColor: DRAFT_COLOR,
        strokeOpacity: 0,
        strokeWeight: 0,
        editable: false,
        clickable: true,
        geodesic: true,
        zIndex: 6,
      });
      listeners.push(
        polygon.addListener("click", () => latest.current.onOpen()),
      );
      shapes.push(
        polygon,
        new sdk.Polyline({
          map,
          path: [...path, path[0]],
          strokeColor: DRAFT_COLOR,
          strokeOpacity: 0,
          strokeWeight: 3,
          geodesic: true,
          clickable: false,
          zIndex: 7,
          icons: [dashed],
        }),
      );
    }
    const vertices = new sdk.Data({ map });
    vertices.addGeoJson({
      type: "FeatureCollection",
      features: path.map((point, id) => ({
        type: "Feature",
        id,
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
        properties: {},
      })),
    });
    vertices.setStyle((feature) => {
      const first = feature.getId() === 0 && mode === "drawing";
      return {
        clickable: false,
        zIndex: 8,
        icon: {
          path: sdk.SymbolPath.CIRCLE,
          scale: first && snap ? 9 : first && path.length >= 3 ? 6 : 5,
          fillColor: mode === "drawn" ? DRAFT_COLOR : DRAW_COLOR,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: first && snap ? 4 : 3,
        },
      };
    });
    shapes.push(vertices);
    anchor.current =
      mode === "drawn"
        ? farmAnchor({
            id: 0,
            name: "",
            boundary: pointsToBoundary(path),
            location: null,
          })
        : null;
    overlay.current?.draw();
    return () => {
      listeners.forEach((listener) => listener.remove());
      shapes.forEach((shape) => shape.setMap(null));
    };
  }, [sdk, map, mode, points, snap]);

  return host && mode === "drawn"
    ? createPortal(
        <button
          type="button"
          onClick={onOpen}
          className="shadow-theme-lg ring-warning-400 absolute flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-900 ring-2 sm:min-h-0 dark:bg-gray-900 dark:text-white"
        >
          {label}
        </button>,
        host,
      )
    : null;
}
