"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { areaNumber } from "@/lib/areaUnits";
import type { BoundaryDraft } from "@/types/account/farm";
import type { MapPosition } from "@/app/[locale]/(account)/account/(protected)/_components/dashboardTypes";
import {
  boundaryArea,
  boundaryError,
  boundaryPoints,
  isMapPosition,
  MAX_BOUNDARY_VERTICES,
  pointDistance,
  pointsToBoundary,
} from "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";

export type GpsState =
  | "idle"
  | "requesting_permission"
  | "ready"
  | "tracking"
  | "paused"
  | "review"
  | "error";
export default function useFarmBoundary(
  initial?: BoundaryDraft,
  savedAreaSqm?: string | number | null,
) {
  const [points, setPoints] = useState<MapPosition[]>(() =>
    boundaryPoints(initial?.boundary),
  );
  const [source, setSource] = useState<"manual" | "gps">(
    initial?.boundary_source ?? "manual",
  );
  const [originalMeasurement] = useState(() => ({
    points,
    area: areaNumber(savedAreaSqm),
  }));
  const [mode, setMode] = useState<"manual" | "gps">("manual");
  const [phase, setPhase] = useState<
    "idle" | "drawing" | "editing" | "confirmed"
  >(initial?.boundary ? "confirmed" : "idle");
  const [gpsState, setGpsState] = useState<GpsState>("idle");
  const [accuracy, setAccuracy] = useState<number | null>(
    initial?.gps_accuracy_m ?? null,
  );
  const [notice, setNotice] = useState("");
  const watcher = useRef<number | null>(null);
  const pointsRef = useRef(points);
  const watchGeneration = useRef(0);
  const last = useRef<{ point: MapPosition; time: number } | null>(null);
  const alive = useRef(true);
  const stop = useCallback(() => {
    watchGeneration.current++;
    if (watcher.current !== null)
      navigator.geolocation.clearWatch(watcher.current);
    watcher.current = null;
  }, []);
  const pause = useCallback(() => {
    stop();
    setGpsState((current) =>
      current === "tracking" || current === "requesting_permission"
        ? "paused"
        : current,
    );
  }, [stop]);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    alive.current = true;
    function visibility() {
      if (document.visibilityState === "hidden" && watcher.current !== null) {
        pause();
        setNotice("gpsInterrupted");
      }
    }
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive.current = false;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pause, stop]);
  function start() {
    if (watcher.current !== null) return;
    if (!navigator.geolocation || !window.isSecureContext) {
      setNotice("gpsUnsupported");
      setGpsState("error");
      return;
    }
    setNotice("");
    setSource("gps");
    setPhase("drawing");
    setGpsState("requesting_permission");
    const generation = ++watchGeneration.current;
    // GPS policy: <=50m accuracy, >=2m spacing, <=15m/s jump, <=499 vertices.
    watcher.current = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !alive.current ||
          watcher.current === null ||
          generation !== watchGeneration.current
        )
          return;
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const reported = position.coords.accuracy;
        if (
          !isMapPosition(point) ||
          !Number.isFinite(reported) ||
          reported < 0 ||
          !Number.isFinite(position.timestamp) ||
          Date.now() - position.timestamp > 30000
        ) {
          setNotice("gpsInvalid");
          return;
        }
        setAccuracy(Math.round(reported * 100) / 100);
        setGpsState("tracking");
        if (reported > 50) {
          setNotice("gpsLowAccuracy");
          return;
        }
        if (last.current) {
          const distance = pointDistance(last.current.point, point);
          const seconds = (position.timestamp - last.current.time) / 1000;
          if (seconds <= 0 || distance < 2) return;
          if (distance > Math.max(30, 15 * seconds)) {
            setNotice("gpsJump");
            return;
          }
          if (seconds > 30 && distance > 30) setNotice("gpsResumeGap");
          else setNotice("");
        }
        last.current = { point, time: position.timestamp };
        if (pointsRef.current.length >= MAX_BOUNDARY_VERTICES) {
          stop();
          setGpsState("paused");
          setNotice("pointLimit");
          return;
        }
        const next = [...pointsRef.current, point];
        pointsRef.current = next;
        setPoints(next);
      },
      (error) => {
        if (!alive.current || generation !== watchGeneration.current) return;
        stop();
        setGpsState("error");
        setNotice(
          error.code === 1
            ? "gpsDenied"
            : error.code === 3
              ? "gpsTimeout"
              : "gpsUnavailable",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }
  function clear() {
    stop();
    pointsRef.current = [];
    setPoints([]);
    setPhase("idle");
    setGpsState("idle");
    setAccuracy(null);
    setNotice("");
    last.current = null;
  }
  function changeMode(next: "manual" | "gps") {
    clear();
    setMode(next);
    setSource(next);
  }
  function add(point: MapPosition) {
    if (!isMapPosition(point) || points.length >= MAX_BOUNDARY_VERTICES) {
      setNotice("pointLimit");
      return;
    }
    if (points.some((p) => pointDistance(p, point) < 0.05)) return;
    setPoints((current) => [...current, point]);
    setPhase("drawing");
  }
  function confirm() {
    stop();
    const error = boundaryError(points);
    if (error) {
      setNotice(`boundaryErrors.${error}`);
      if (mode === "gps") setGpsState("paused");
      return false;
    }
    setPhase("confirmed");
    setGpsState(mode === "gps" ? "review" : "idle");
    setNotice("");
    return true;
  }
  const valid = points.length >= 3 && !boundaryError(points);
  const area = useMemo(
    () =>
      valid
        ? points === originalMeasurement.points &&
          originalMeasurement.area !== null
          ? originalMeasurement.area
          : boundaryArea(points)
        : null,
    [points, valid, originalMeasurement],
  );
  const boundary =
    phase === "confirmed" && valid ? pointsToBoundary(points) : null;
  const distance = points.reduce(
    (sum, p, i) => sum + (i ? pointDistance(points[i - 1], p) : 0),
    0,
  );
  return {
    points,
    mode,
    source,
    phase,
    gpsState,
    accuracy,
    notice,
    valid,
    distance,
    area,
    boundary,
    draft: {
      boundary,
      boundary_source: boundary ? source : null,
      gps_accuracy_m: boundary && source === "gps" ? accuracy : null,
    } satisfies BoundaryDraft,
    active: gpsState === "tracking" || gpsState === "requesting_permission",
    setNotice,
    changeMode,
    clear,
    start,
    pause,
    confirm,
    add,
    draw: () => {
      setSource("manual");
      setPhase("drawing");
    },
    edit: () => {
      stop();
      setGpsState(mode === "gps" ? "review" : "idle");
      setPhase("editing");
    },
    update: (next: MapPosition[]) => {
      setPoints(next);
      setPhase("editing");
    },
    undo: () => {
      if (phase === "drawing" && mode === "manual")
        setPoints((current) => current.slice(0, -1));
    },
  };
}
export type FarmBoundarySession = ReturnType<typeof useFarmBoundary>;
