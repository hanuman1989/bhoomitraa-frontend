"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/common/Tooltip";
import {
  CheckLineIcon,
  PencilIcon,
  PlusIcon,
  MapLayersIcon,
  LocationPinIcon,
  FitMapIcon,
} from "@/icons";
import type { MapType } from "./dashboardTypes";
import type { BoundaryDrawMode } from "./boundaryDraw/boundaryDrawState";

export default function AccountFloatingActions({
  open,
  mapType,
  mapReady,
  availableHeight,
  bottom,
  onToggle,
  onAddFarm,
  onDrawFarm,
  onMapType,
  onLocate,
  onFit,
  onReset,
  drawMode = "idle",
  canCompleteDraw = false,
  drawToolbar,
}: {
  open: boolean;
  mapType: MapType;
  mapReady: boolean;
  availableHeight: number;
  bottom: number;
  onToggle: (open: boolean) => void;
  onAddFarm: () => void;
  onDrawFarm: () => void;
  onMapType: (type: MapType) => void;
  onLocate: () => void;
  onFit: () => void;
  onReset: () => void;
  /** Outside idle, the Draw FAB is pinned and completes the boundary. */
  drawMode?: BoundaryDrawMode;
  canCompleteDraw?: boolean;
  drawToolbar?: ReactNode;
}) {
  const t = useTranslations("farmerDashboard.actions");
  const tb = useTranslations("farmerDashboard.boundaryDraw");
  const container = useRef<HTMLDivElement>(null);
  const minPointsId = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        onToggle(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onToggle(false);
    }
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onToggle]);
  if (availableHeight < 160) return null;
  const drawing = drawMode !== "idle";
  const drawLabel = tb(drawMode === "drawn" ? "saveAsFarm" : "confirm");
  const actions = [
    {
      id: "drawFarm",
      icon: PencilIcon,
      color: "bg-success-700",
      run: onDrawFarm,
      disabled: !mapReady,
    },
    {
      id: "addFarm",
      icon: PlusIcon,
      color: "bg-error-600",
      run: onAddFarm,
      disabled: false,
    },
    {
      id: mapType === "roadmap" ? "satellite" : "roadmap",
      icon: MapLayersIcon,
      color: "bg-success-600",
      run: () => onMapType(mapType === "roadmap" ? "satellite" : "roadmap"),
      disabled: !mapReady,
    },
    {
      id: "myLocation",
      icon: LocationPinIcon,
      color: "bg-orange-500",
      run: onLocate,
      disabled: !mapReady,
    },
    {
      id: "fitAll",
      icon: FitMapIcon,
      color: "bg-theme-purple-500",
      run: onFit,
      disabled: !mapReady,
    },
    {
      id: "resetLayers",
      icon: MapLayersIcon,
      color: "bg-gray-600",
      run: onReset,
      disabled: !mapReady,
    },
  ].filter((action) => !drawing || action.id !== "drawFarm");
  return (
    <div
      ref={container}
      className="absolute end-5 z-20 flex flex-col items-end gap-2 sm:end-7"
      style={{ bottom: `max(${bottom}px, env(safe-area-inset-bottom))` }}
    >
      {open && (
        <div
          id="account-map-actions"
          role="group"
          aria-label={t("label")}
          className="custom-scrollbar flex flex-col items-end gap-1.5 overflow-y-auto overscroll-contain p-1"
          style={{ maxHeight: Math.max(80, availableHeight - 160) }}
        >
          <p className="sr-only">{t("currentMapType", { type: t(mapType) })}</p>
          {actions.map(({ id, icon: Icon, color, run, disabled }) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => {
                onToggle(false);
                run();
              }}
              className="group focus-visible:outline-success-700 flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="shadow-theme-md group-hover:bg-success-50 rounded-xl bg-white/95 px-2.5 py-1.5 text-xs font-medium text-gray-950 dark:bg-gray-900 dark:text-gray-100">
                {t(id)}
              </span>
              <span
                className={`shadow-theme-lg flex size-8 shrink-0 items-center justify-center rounded-full text-white ${color}`}
              >
                <Icon aria-hidden="true" className="block size-4 shrink-0" />
              </span>
            </button>
          ))}
        </div>
      )}
      {drawing && (
        <div className="flex items-center gap-2">
          {drawToolbar}
          {/* The label is visible, so the tooltip only explains why it is blocked. */}
          <Tooltip
            content={canCompleteDraw ? null : tb("minPoints")}
            id={minPointsId}
            className="shrink-0"
          >
            <button
              type="button"
              aria-disabled={!canCompleteDraw}
              aria-label={drawLabel}
              aria-describedby={canCompleteDraw ? undefined : minPointsId}
              onClick={() => {
                if (canCompleteDraw) onDrawFarm();
              }}
              className="group focus-visible:outline-success-700 flex min-h-11 items-center gap-2 rounded-full focus-visible:outline-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:min-h-0"
            >
              <span className="shadow-theme-md group-hover:bg-success-50 max-xsm:sr-only rounded-xl bg-white/95 px-2.5 py-1.5 text-xs font-medium text-gray-950 dark:bg-gray-900 dark:text-gray-100">
                {drawLabel}
              </span>
              <span className="bg-success-700 shadow-theme-lg flex size-8 shrink-0 items-center justify-center rounded-full text-white">
                <CheckLineIcon
                  aria-hidden="true"
                  className="block size-4 shrink-0"
                />
              </span>
            </button>
          </Tooltip>
        </div>
      )}
      <Tooltip
        content={open ? t("close") : t("open")}
        side="start"
        className="shrink-0"
      >
        <button
          type="button"
          onClick={() => onToggle(!open)}
          aria-expanded={open}
          aria-controls="account-map-actions"
          aria-label={open ? t("close") : t("open")}
          className="bg-success-800 shadow-theme-xl hover:bg-success-700 focus-visible:outline-success-700 flex size-8 items-center justify-center rounded-full p-0 leading-none text-white transition focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <PencilIcon
            aria-hidden="true"
            className={`block size-4 shrink-0 transition-transform ${open ? "rotate-45" : ""}`}
          />
        </button>
      </Tooltip>
    </div>
  );
}
