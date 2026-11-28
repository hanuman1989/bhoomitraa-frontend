"use client";
import { useEffect, useId, useReducer, useRef } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  CheckLineIcon,
  CrosshairIcon,
  LocationPinIcon,
  RouteIcon,
  TrashBinIcon,
  UndoIcon,
} from "@/icons";
import { isMapPosition } from "../../_components/farmGeometry";
import type { MapPosition } from "../../_components/dashboardTypes";
import type {
  MapsInstance,
  MapsPolyMouseEvent,
  MapsPolyline,
  MapsSDK,
} from "../../_components/googleMaps";
import {
  IRRIGATION_COLORS,
  draftGeometry,
  draftMarkerIcon,
  geometryPositions,
  irrigationDraft,
  irrigationDraftReducer,
  irrigationRouteError,
  routeLengthMeters,
  samePoints,
  toCoordinates,
  toPosition,
  type IrrigationEditorRequest,
} from "./irrigationMap";
import {
  irrigationButton,
  irrigationPrimary,
  useIrrigationFormat,
} from "./IrrigationUi";

const coordinatesOf = (polyline: MapsPolyline) =>
  polyline
    .getPath()
    .getArray()
    .map((point) => toCoordinates({ lat: point.lat(), lng: point.lng() }));

/**
 * Edits one location on the dashboard map: a marker for a water source or a
 * route for a pipeline. Uses map clicks and an editable polyline (no Drawing
 * Library). Confirm hands the result to the form; Cancel leaves it unchanged.
 */
export default function IrrigationLocationEditor({
  sdk,
  map,
  request,
  onFit,
}: {
  sdk: MapsSDK;
  map: MapsInstance;
  request: IrrigationEditorRequest;
  onFit: (positions: MapPosition[]) => void;
}) {
  const t = useTranslations("farmerIrrigation.editor");
  const format = useIrrigationFormat();
  const titleId = useId();
  const [draft, dispatch] = useReducer(irrigationDraftReducer, request, (r) =>
    irrigationDraft(r.kind, r.geometry),
  );
  const point = draft.kind === "point";
  const latest = useRef({ request, onFit, point });
  useEffect(() => {
    latest.current = { request, onFit, point };
  });
  const bar = useRef<HTMLDivElement>(null);
  const line = useRef<MapsPolyline | null>(null);
  const alive = useRef(true);
  const locating = useRef(false);

  // Taps add points (or place the marker); double-click zoom would add two.
  useEffect(() => {
    alive.current = true;
    map.setOptions({
      draggableCursor: "crosshair",
      disableDoubleClickZoom: true,
    });
    const listener = map.addListener("click", ({ latLng }) => {
      if (latLng)
        dispatch({
          type: "add",
          point: toCoordinates({ lat: latLng.lat(), lng: latLng.lng() }),
        });
    });
    return () => {
      alive.current = false;
      listener.remove();
      map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
    };
  }, [map]);

  // Show the current location once and move focus into the editor. The fit
  // waits a frame, until the map knows the panel has made room.
  useEffect(() => {
    const positions = geometryPositions(latest.current.request.geometry);
    const frame = requestAnimationFrame(() => {
      if (positions.length) latest.current.onFit(positions);
    });
    bar.current?.querySelector<HTMLButtonElement>("button:enabled")?.focus();
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        event.preventDefault();
        latest.current.request.onCancel();
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  // Water source: one draggable marker.
  const marker = point ? (draft.points[0] ?? null) : null;
  const markerKey = marker ? marker.join(",") : "";
  useEffect(() => {
    if (!latest.current.point || !markerKey) return;
    const data = new sdk.Data({ map });
    data.addGeoJson({
      type: "Feature",
      id: "draft",
      geometry: {
        type: "Point",
        coordinates: markerKey.split(",").map(Number),
      },
      properties: {},
    });
    const icon = draftMarkerIcon();
    data.setStyle({
      draggable: true,
      clickable: true,
      zIndex: 80,
      icon: {
        url: icon.url,
        scaledSize: new sdk.Size(icon.width, icon.height),
        anchor: new sdk.Point(icon.anchorX, icon.anchorY),
      },
    });
    const listener = data.addListener("setgeometry", ({ newGeometry }) => {
      const position = newGeometry.get();
      dispatch({
        type: "add",
        point: toCoordinates({ lat: position.lat(), lng: position.lng() }),
      });
    });
    return () => {
      listener.remove();
      data.setMap(null);
      sdk.event.clearInstanceListeners(data);
    };
  }, [sdk, map, markerKey]);

  // Pipeline: an editable line. Dragging a point moves it, dragging a midpoint
  // handle inserts one, and double-click or right-click on a point removes it.
  useEffect(() => {
    if (!latest.current.point) {
      const polyline = new sdk.Polyline({
        map,
        path: [],
        strokeColor: IRRIGATION_COLORS.draft,
        strokeOpacity: 1,
        strokeWeight: 4,
        geodesic: false,
        clickable: true,
        editable: true,
        zIndex: 80,
      });
      line.current = polyline;
      const remove = ({ vertex }: MapsPolyMouseEvent) => {
        if (typeof vertex === "number")
          dispatch({ type: "remove", index: vertex });
      };
      const listeners = [
        polyline.addListener("dblclick", remove),
        polyline.addListener("contextmenu", remove),
      ];
      return () => {
        listeners.forEach((listener) => listener.remove());
        polyline.setMap(null);
        line.current = null;
      };
    }
  }, [sdk, map]);
  useEffect(() => {
    const polyline = line.current;
    if (!polyline) return;
    if (!samePoints(coordinatesOf(polyline), draft.points))
      polyline.setPath(draft.points.map(toPosition));
    const path = polyline.getPath();
    const sync = () =>
      dispatch({ type: "replace", points: coordinatesOf(polyline) });
    const listeners = (["set_at", "insert_at", "remove_at"] as const).map(
      (event) => path.addListener(event, sync),
    );
    return () => listeners.forEach((listener) => listener.remove());
  }, [draft.points]);
  // The route's first point, which also shows a one-point route.
  const start = !point && draft.points.length ? draft.points[0].join(",") : "";
  useEffect(() => {
    if (!start) return;
    const data = new sdk.Data({ map });
    data.addGeoJson({
      type: "Feature",
      geometry: { type: "Point", coordinates: start.split(",").map(Number) },
      properties: {},
    });
    data.setStyle({
      clickable: false,
      zIndex: 81,
      icon: {
        path: sdk.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: IRRIGATION_COLORS.draft,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });
    return () => data.setMap(null);
  }, [sdk, map, start]);

  function myLocation() {
    if (!navigator.geolocation) {
      toast.error(t("locationUnsupported"));
      return;
    }
    if (locating.current) return;
    locating.current = true;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        locating.current = false;
        const position = { lat: coords.latitude, lng: coords.longitude };
        if (!alive.current || !isMapPosition(position)) return;
        map.panTo(position);
        map.setZoom(Math.max(map.getZoom() ?? 0, 17));
        if (latest.current.point)
          dispatch({ type: "add", point: toCoordinates(position) });
      },
      (error) => {
        locating.current = false;
        // Refusal never blocks picking the place by hand.
        if (alive.current)
          toast.error(
            t(error.code === 1 ? "locationDenied" : "locationUnavailable"),
          );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const count = draft.points.length;
  const routeError =
    !point && count ? irrigationRouteError(draft.points) : null;
  const canConfirm = point || count === 0 || !routeError;
  const hadLocation = Boolean(request.geometry);
  const message =
    routeError && count > 1
      ? { error: true, text: t(`errors.${routeError}`) }
      : draft.notice
        ? { error: true, text: t(`errors.${draft.notice}`) }
        : !count && hadLocation
          ? {
              error: false,
              text: t(point ? "removesLocation" : "removesRoute"),
            }
          : null;
  const Icon = point ? LocationPinIcon : RouteIcon;
  return (
    <div
      ref={bar}
      role="region"
      aria-labelledby={titleId}
      className="shadow-theme-xl absolute inset-x-3 top-16 z-30 mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
    >
      <h2
        id={titleId}
        className="flex items-center gap-2 text-base font-semibold"
      >
        <Icon
          aria-hidden="true"
          className="text-blue-light-600 dark:text-blue-light-400 size-5 shrink-0"
        />
        {t(point ? "pointTitle" : "lineTitle")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t(point ? "pointHint" : "lineHint")}
      </p>
      <p
        aria-live="polite"
        className="mt-3 flex flex-wrap justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm tabular-nums dark:bg-gray-800"
      >
        {point ? (
          <span>
            {marker
              ? t("coordinates", {
                  lat: format.coordinate(marker[1]),
                  lng: format.coordinate(marker[0]),
                })
              : t("noMarker")}
          </span>
        ) : count ? (
          <>
            <span>{t("points", { count })}</span>
            <strong>
              {count > 1
                ? t("approximate", {
                    length: format.fixed(routeLengthMeters(draft.points)),
                  })
                : t("errors.needTwo")}
            </strong>
          </>
        ) : (
          <span>{t("noPoints")}</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={myLocation} className={irrigationButton}>
          <CrosshairIcon aria-hidden="true" className="size-4" />
          {t("myLocation")}
        </button>
        <button
          type="button"
          disabled={!draft.history.length}
          onClick={() => dispatch({ type: "undo" })}
          className={irrigationButton}
        >
          <UndoIcon aria-hidden="true" className="size-4" />
          {t("undo")}
        </button>
        <button
          type="button"
          disabled={!count}
          onClick={() => dispatch({ type: "clear" })}
          className={irrigationButton}
        >
          <TrashBinIcon aria-hidden="true" className="size-4" />
          {t("clear")}
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => request.onCancel()}
          className={irrigationButton}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => request.onConfirm(draftGeometry(draft))}
          className={irrigationPrimary}
        >
          <CheckLineIcon aria-hidden="true" className="size-4" />
          {t("confirm")}
        </button>
      </div>
      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`mt-2 text-sm ${message.error ? "text-error-600 dark:text-error-400" : "text-gray-500 dark:text-gray-400"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
