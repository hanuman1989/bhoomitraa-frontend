"use client";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import FarmBoundaryMap from "./FarmBoundaryMap";
import BoundaryConfirmDialog from "./BoundaryConfirmDialog";
import BoundaryDrawingActions, {
  type BoundaryDrawingAction,
} from "./BoundaryDrawingActions";
import BoundaryDrawHelp from "./BoundaryDrawHelp";
import type { FarmBoundarySession } from "@/hooks/useFarmBoundary";
import type { AreaUnit } from "@/types/account/farm";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea, fromSquareMeters } from "@/lib/areaUnits";
import {
  PencilIcon,
  FitMapIcon,
  LocationPinIcon,
  FarmFieldIcon,
  UserIcon,
} from "@/icons";

export default function FarmBoundaryEditor({
  session: s,
  areaUnit,
  location,
  referenceLayers,
  displayGeometry,
  boundaryStatus,
  extraActions,
  limits,
  helpFor = "farm",
}: {
  session: FarmBoundarySession;
  areaUnit: AreaUnit;
  location: string;
  referenceLayers?: ComponentProps<typeof FarmBoundaryMap>["referenceLayers"];
  displayGeometry?: ComponentProps<typeof FarmBoundaryMap>["displayGeometry"];
  boundaryStatus?: string;
  /** Feature-specific floating map actions, shown before the drawing actions. */
  extraActions?: readonly BoundaryDrawingAction[];
  limits?: ComponentProps<typeof FarmBoundaryMap>["limits"];
  /** Which "How to Draw" instructions the popover shows. */
  helpFor?: ComponentProps<typeof BoundaryDrawHelp>["kind"];
}) {
  const t = useTranslations("farmerFarms");
  const tb = useTranslations("farmerDashboard.boundaryDraw");
  const locale = useLocale();
  const ta = useTranslations("areaUnits");
  const metadata = useAreaUnits();
  const [fullscreen, setFullscreen] = useState(false);
  const [confirm, setConfirm] = useState<null | (() => void)>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const wasFullscreen = useRef(false);
  useEffect(() => {
    if (fullscreen) exitButton.current?.focus();
    else if (wasFullscreen.current) expandButton.current?.focus();
    wasFullscreen.current = fullscreen;
  }, [fullscreen]);
  useEffect(() => {
    if (!fullscreen || confirm) return;
    function escape(event: KeyboardEvent) {
      // An open "How to Draw" popover closes first; the next Escape exits.
      const target = event.target as Element | null;
      if (event.key === "Escape" && !target?.closest?.("[data-open]")) {
        event.preventDefault();
        event.stopPropagation();
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [fullscreen, confirm]);
  const converted = fromSquareMeters(s.area, areaUnit, metadata.config);
  const measured = converted ?? s.area;
  const areaLabel =
    measured !== null
      ? `${formatArea(measured, locale)} ${metadata.label(converted === null ? "sqm" : areaUnit)}`
      : t("wizard.notCalculated");
  const drawing = s.mode === "manual" && s.phase === "drawing";
  function discard(action: () => void) {
    if (s.points.length)
      setConfirm(() => () => {
        action();
        setConfirm(null);
      });
    else action();
  }
  const button =
    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-medium hover:bg-success-50 disabled:opacity-40 dark:hover:bg-gray-700";
  return (
    <section
      className={
        fullscreen
          ? "fixed inset-0 z-99999 flex min-h-0 flex-col gap-3 overflow-hidden bg-white p-3 sm:p-4 dark:bg-gray-900"
          : "space-y-3"
      }
      aria-label={t("wizard.boundaryTitle")}
    >
      <div className="flex shrink-0 items-center gap-3">
        <div
          className={`grid min-w-0 flex-1 gap-3 ${fullscreen ? "grid-cols-2" : "sm:grid-cols-2"}`}
        >
          {(["manual", "gps"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={s.mode === mode}
              onClick={() => {
                if (s.mode !== mode) discard(() => s.changeMode(mode));
              }}
              className={`flex min-w-0 items-center justify-center rounded-xl border text-start ${fullscreen ? "gap-2 px-3 py-2" : "gap-4 px-5 py-3"} ${s.mode === mode ? "border-success-600 bg-success-50 text-success-700 dark:bg-success-950" : "border-gray-300 dark:border-gray-700"}`}
            >
              {mode === "manual" ? (
                <PencilIcon
                  className={
                    fullscreen
                      ? "hidden size-5 shrink-0 sm:block"
                      : "size-7 shrink-0"
                  }
                />
              ) : (
                <UserIcon
                  className={
                    fullscreen
                      ? "hidden size-5 shrink-0 sm:block"
                      : "size-7 shrink-0"
                  }
                />
              )}
              <span className="min-w-0">
                <span
                  className={`block font-bold ${fullscreen ? "text-sm" : "text-lg"}`}
                >
                  {t(
                    mode === "manual"
                      ? "wizard.manualDrawing"
                      : "wizard.gpsBoundary",
                  )}
                </span>
                <span
                  className={
                    fullscreen
                      ? "sr-only"
                      : "mt-0.5 block text-sm text-gray-600 dark:text-gray-300"
                  }
                >
                  {t(
                    mode === "manual"
                      ? "wizard.manualDescription"
                      : "wizard.gpsDescription",
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
        {fullscreen && (
          <button
            ref={exitButton}
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label={t("exitFullscreen")}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <span className="hidden sm:inline">{t("exitFullscreen")}</span>
            <FitMapIcon className="text-success-700 dark:text-success-300 size-5" />
          </button>
        )}
      </div>
      <div
        className={
          fullscreen
            ? `grid min-h-0 flex-1 gap-3 overflow-hidden ${s.mode === "gps" ? "grid-rows-2 lg:grid-cols-4 lg:grid-rows-1" : "grid-rows-1"}`
            : `mt-3 grid gap-3 ${s.mode === "gps" ? "lg:grid-cols-4" : ""}`
        }
      >
        {s.mode === "gps" && (
          <aside
            className={`min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 ${fullscreen ? "custom-scrollbar min-h-0 overflow-y-auto overscroll-contain" : ""}`}
          >
            <div className="space-y-3 p-4">
              <h3 className="text-lg font-bold">{t("wizard.gpsBoundary")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("wizard.gpsInstructions")}
              </p>
              <ol className="space-y-2 text-sm">
                {[
                  "gpsInstruction1",
                  "gpsInstruction2",
                  "gpsInstruction3",
                  "gpsInstruction4",
                ].map((key, i) => (
                  <li key={key} className="flex gap-2">
                    <span className="bg-success-100 text-success-800 flex size-6 shrink-0 items-center justify-center rounded-full font-bold">
                      {i + 1}
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ol>
              <div
                role="status"
                className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800"
              >
                <strong>{t("gpsStatus")}</strong>
                <span className="text-success-700 dark:text-success-300 ms-2">
                  {t(`gpsStates.${s.gpsState}`)}
                </span>
                <p className="mt-1">
                  {s.accuracy === null
                    ? t("waitingGps")
                    : t("wizard.gpsAccuracy", { accuracy: s.accuracy })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <p className="w-full text-sm">
                  {t("gpsDuration", { seconds: s.duration ?? 0 })}
                </p>
                {!s.active ? (
                  <button
                    type="button"
                    onClick={s.start}
                    disabled={s.phase === "confirmed" || s.phase === "editing"}
                    className="bg-success-700 w-full rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-40"
                  >
                    {t(
                      s.gpsState === "paused" || s.gpsState === "error"
                        ? "resumeTracking"
                        : "wizard.startTracking",
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={s.pause}
                    className="border-success-600 text-success-700 w-full rounded-xl border px-4 py-3 font-semibold"
                  >
                    {t("wizard.pauseTracking")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={s.points.length < 3 || s.phase === "confirmed"}
                  onClick={s.confirm}
                  className="border-success-600 text-success-700 dark:text-success-300 w-full rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {t("finishGps")}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("gpsDisclaimer")}
              </p>
            </div>
          </aside>
        )}
        <div
          className={`relative min-w-0 ${s.mode === "gps" ? "lg:col-span-3" : ""} ${fullscreen ? "h-full min-h-0 overflow-hidden" : "h-96 min-h-96 lg:h-full"}`}
        >
          <FarmBoundaryMap
            points={s.points}
            drawing={s.phase === "drawing" && s.mode === "manual"}
            editable={s.phase === "editing"}
            gps={s.mode === "gps" && s.phase === "drawing"}
            accuracy={s.accuracy}
            referenceLayers={referenceLayers}
            displayGeometry={displayGeometry}
            location={location}
            onAdd={s.add}
            onEdit={s.update}
            onComplete={s.confirm}
            onUndo={s.undo}
            limits={limits}
            className={fullscreen ? "min-h-0" : undefined}
          >
            {!fullscreen && (
              <button
                ref={expandButton}
                type="button"
                onClick={() => setFullscreen((value) => !value)}
                aria-label={t("fullscreen")}
                className="shadow-theme-sm absolute end-3 top-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-800"
              >
                <span className="hidden sm:inline">
                  {t(fullscreen ? "exitFullscreen" : "fullscreen")}
                </span>
                <FitMapIcon className="text-success-700 size-4" />
              </button>
            )}
            {s.mode === "manual" && (
              <BoundaryDrawingActions
                phase={s.phase}
                count={s.points.length}
                help={<BoundaryDrawHelp kind={helpFor} />}
                onDraw={() =>
                  discard(() => {
                    s.clear();
                    s.draw();
                  })
                }
                onEdit={s.edit}
                onUndo={s.undo}
                onClear={() => discard(s.clear)}
                onConfirm={s.confirm}
                extraActions={extraActions}
              />
            )}
            {s.mode === "gps" && (
              <div className="shadow-theme-sm absolute end-16 top-16 max-w-64 rounded-xl bg-white/95 p-3 text-xs break-words text-gray-800">
                <strong>{t(`gpsStates.${s.gpsState}`)}</strong>
                <p className="mt-1">
                  {t("distance", { distance: Math.round(s.distance) })}
                </p>
                <p>{t("wizard.areaPreview", { area: areaLabel })}</p>
              </div>
            )}
            {s.phase === "confirmed" && measured !== null && (
              <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
                <span className="shadow-theme-sm rounded-xl bg-white/95 px-5 py-2 text-center text-sm text-gray-800">
                  {t("mapActualArea")}
                  <strong className="text-success-700 block text-xl">
                    {areaLabel}
                  </strong>
                </span>
              </div>
            )}
          </FarmBoundaryMap>
        </div>
      </div>
      <div
        className={
          fullscreen
            ? "custom-scrollbar max-h-40 shrink-0 space-y-2 overflow-y-auto overscroll-contain"
            : "space-y-3"
        }
      >
        {s.mode === "gps" &&
          (s.phase === "confirmed" || s.phase === "editing") && (
            <div className="flex gap-3">
              <button type="button" onClick={s.edit} className={button}>
                {t("editBoundary")}
              </button>
              <button
                type="button"
                onClick={() => discard(s.clear)}
                className={button}
              >
                {t("wizard.clearBoundary")}
              </button>
              {s.phase === "editing" && (
                <button type="button" onClick={s.confirm} className={button}>
                  {t("confirmBoundary")}
                </button>
              )}
            </div>
          )}
        {drawing && (
          <p
            role="status"
            className="bg-success-50/70 text-success-800 dark:bg-success-950/40 dark:text-success-200 rounded-xl p-3 text-sm"
          >
            {tb("hint")}{" "}
            <span className="font-semibold">
              {s.area !== null
                ? tb("progressWithArea", {
                    count: s.points.length,
                    area: areaLabel,
                  })
                : tb("progress", { count: s.points.length })}
            </span>
          </p>
        )}
        {s.notice && (
          <p
            role="alert"
            className="bg-warning-50 text-warning-800 dark:bg-warning-950 dark:text-warning-200 mt-3 rounded-xl p-3 text-sm"
          >
            {t(s.notice)}
          </p>
        )}
        <div className="bg-success-50/70 dark:bg-success-950/40 grid gap-3 rounded-xl p-3 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <LocationPinIcon className="text-success-700 size-8 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">
                {t("wizard.locationTitle")}
              </h4>
              <p className="text-sm break-words text-gray-600 dark:text-gray-300">
                {location || t("locationUnavailable")}
              </p>
            </div>
          </div>
          <div className="sm:border-success-100 flex items-center gap-3 sm:border-s sm:ps-5">
            <FarmFieldIcon className="text-success-700 size-8 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">{t("mapActualArea")}</h4>
              <strong className="text-success-700 dark:text-success-300 text-xl">
                {areaLabel}
              </strong>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {boundaryStatus ??
                  t(
                    s.phase === "confirmed" ? "boundaryReady" : "boundaryDraft",
                  )}
              </p>
            </div>
          </div>
        </div>
        {s.area !== null && converted === null && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            {ta("previewUnavailable")}
          </p>
        )}
        {metadata.status === "error" && (
          <p
            role="alert"
            className="text-warning-700 dark:text-warning-300 text-xs"
          >
            {ta("loadFailed")}{" "}
            <button
              type="button"
              onClick={metadata.retry}
              className="underline"
            >
              {ta("retry")}
            </button>
          </p>
        )}
      </div>
      {confirm && (
        <BoundaryConfirmDialog
          title={t("discardBoundaryTitle")}
          description={t("discardBoundaryDescription")}
          onConfirm={confirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
