"use client";
import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/common/Tooltip";
import { CheckLineIcon, PencilIcon } from "@/icons";
import { cn } from "@/utils";
import type { FabGroupId, MapType } from "./dashboardTypes";
import type { BoundaryDrawMode } from "./boundaryDraw/boundaryDrawState";
import type { IrrigationLayers } from "../irrigation/_components/irrigationMap";
import FabButton from "./fab/FabButton";
import FabGroup from "./fab/FabGroup";
import { fabGroups, fabLayout, fabRowHeight } from "./fab/fabGroups";

/**
 * The map's actions at the bottom right, above the panel button: Draw Farm
 * Boundary, then the Farm Actions, Locate & Fit and Map Layers speed dials.
 * One group opens at a time; a tap on the map, Esc or a route change closes
 * it. Every button calls the handler the shell passes in. Nothing scrolls:
 * when an open group needs more room, the buttons above it and then the zoom
 * buttons step aside until it closes.
 */
export default function AccountFloatingActions({
  group,
  mapType,
  mapReady,
  availableHeight,
  maxHeight,
  zoomRoom = 0,
  onZoomHidden,
  compact = false,
  bottom,
  onGroup,
  onAddFarm,
  onDrawFarm,
  onMapType,
  onLocate,
  onFit,
  onReset,
  drawMode = "idle",
  canCompleteDraw = false,
  drawToolbar,
  irrigation,
}: {
  group: FabGroupId | null;
  mapType: MapType;
  mapReady: boolean;
  availableHeight: number;
  /** Room for the stack below the top-right controls. */
  maxHeight?: number;
  /** Extra room when the zoom buttons step aside; 0 when they aren't shown. */
  zoomRoom?: number;
  /** Whether the stack needs the zoom buttons' room right now. */
  onZoomHidden?: (hidden: boolean) => void;
  /** Below the `sm` breakpoint rows are 44 px tall. */
  compact?: boolean;
  bottom: number;
  onGroup: (group: FabGroupId | null) => void;
  onAddFarm: () => void;
  onDrawFarm: () => void;
  onMapType: (type: MapType) => void;
  onLocate: () => void;
  onFit: () => void;
  onReset: () => void;
  /** Outside idle, the Draw button completes the boundary and always stays visible. */
  drawMode?: BoundaryDrawMode;
  canCompleteDraw?: boolean;
  drawToolbar?: ReactNode;
  /** Irrigation assets on the map: their layer toggles and Fit Irrigation Assets. */
  irrigation?: {
    layers: IrrigationLayers;
    onToggleLayer: (layer: keyof IrrigationLayers) => void;
    onFit: () => void;
  };
}) {
  const t = useTranslations("farmerDashboard.actions");
  const tb = useTranslations("farmerDashboard.boundaryDraw");
  const id = useId();
  const stack = useRef<HTMLDivElement>(null);
  const catcher = useRef<HTMLDivElement>(null);
  const mains = useRef<Partial<Record<FabGroupId, HTMLButtonElement | null>>>(
    {},
  );
  const drawing = drawMode !== "idle";
  const groups = fabGroups({
    mapType,
    mapReady,
    drawing,
    onAddFarm,
    onDrawFarm,
    onMapType,
    onLocate,
    onFit,
    onReset,
    irrigation,
  });
  // A group this page lacks, or one blocked while drawing, can't be open.
  const open = groups.some((item) => item.id === group && !item.blocked)
    ? group
    : null;

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target;
      // A tap on the map lands on the click-catcher, which closes the group itself.
      if (
        target instanceof Node &&
        !stack.current?.contains(target) &&
        !catcher.current?.contains(target)
      )
        onGroup(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active = document.activeElement as HTMLElement | null;
      if (
        document.querySelector('[role="dialog"][aria-modal="true"]') ||
        active?.closest?.("input, textarea, select, [contenteditable='true']")
      )
        return;
      event.preventDefault();
      const focusInside = Boolean(active && stack.current?.contains(active));
      onGroup(null);
      // Focus would otherwise vanish with the closed items.
      if (focusInside && open) mains.current[open]?.focus();
    }
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onGroup]);

  // Draw stays on top of the stack; it only steps aside for an open group,
  // never while a boundary or an unsaved draft is on the map.
  const showDraw = drawing || !open;
  const layout =
    maxHeight === undefined
      ? { hideAbove: false, hideZoom: false, scrolls: false }
      : fabLayout({
          groups,
          open,
          draw: showDraw,
          row: fabRowHeight(compact),
          space: maxHeight,
          zoomSpace: zoomRoom,
        });
  const shown = availableHeight >= 160;
  const hideZoom = shown && layout.hideZoom;
  useLayoutEffect(() => {
    // Before paint, so the open items never overlap the zoom buttons.
    onZoomHidden?.(hideZoom);
    return () => onZoomHidden?.(false);
  }, [hideZoom, onZoomHidden]);
  useEffect(() => {
    // Keep the group buttons, next to the panel button, in view.
    if (layout.scrolls && stack.current)
      stack.current.scrollTop = stack.current.scrollHeight;
  }, [layout.scrolls, open]);

  if (!shown) return null;
  const openIndex = groups.findIndex((item) => item.id === open);
  const visibleGroups = layout.hideAbove ? groups.slice(openIndex) : groups;
  const drawLabel = tb(drawMode === "drawn" ? "saveAsFarm" : "confirm");
  const minPointsId = `${id}-min-points`;
  return (
    <>
      {open && (
        // Closes the group on a tap anywhere on the map, without the map
        // seeing it: no farm popup, no draw point, no deselection.
        <div
          ref={catcher}
          aria-hidden="true"
          data-fab-catcher=""
          className="absolute inset-0 z-10"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onGroup(null);
          }}
        />
      )}
      <div
        ref={stack}
        role="group"
        aria-label={t("label")}
        style={{
          bottom: `max(${bottom}px, env(safe-area-inset-bottom))`,
          maxHeight:
            layout.scrolls && maxHeight !== undefined
              ? maxHeight + (hideZoom ? zoomRoom : 0)
              : undefined,
        }}
        className={cn(
          // In line with the panel and zoom buttons, growing upward from a fixed bottom.
          "absolute end-5 z-20 flex flex-col items-end gap-2 transition-[bottom] duration-300 ease-out motion-reduce:transition-none sm:end-7",
          // A tiny map only: no scrollbar to show, nothing to scroll sideways,
          // and room for focus rings without moving the buttons.
          layout.scrolls
            ? "no-scrollbar -me-1 justify-start overflow-x-hidden overflow-y-auto overscroll-contain p-1"
            : "justify-end",
        )}
      >
        {showDraw &&
          (drawing ? (
            <div className="flex shrink-0 items-center gap-2">
              {drawToolbar}
              {/* The label is visible, so the tooltip only explains why it is blocked. */}
              <Tooltip
                content={canCompleteDraw ? null : tb("minPoints")}
                id={minPointsId}
                className="shrink-0"
              >
                <FabButton
                  main
                  icon={CheckLineIcon}
                  color="bg-success-700"
                  label={drawLabel}
                  labelClassName="max-xsm:sr-only"
                  aria-label={drawLabel}
                  aria-disabled={!canCompleteDraw}
                  aria-describedby={canCompleteDraw ? undefined : minPointsId}
                  onClick={() => {
                    if (canCompleteDraw) onDrawFarm();
                  }}
                />
              </Tooltip>
            </div>
          ) : (
            <FabButton
              main
              icon={PencilIcon}
              color="bg-success-700"
              label={t("drawFarm")}
              disabled={!mapReady}
              onClick={onDrawFarm}
            />
          ))}
        {visibleGroups.map((item) => {
          const isOpen = open === item.id;
          return (
            <FabGroup
              key={item.id}
              group={item}
              label={t(item.label)}
              reason={item.blocked ? t(item.blocked) : null}
              open={isOpen}
              menuId={`${id}-${item.id}-menu`}
              reasonId={`${id}-${item.id}-reason`}
              buttonRef={(node) => {
                mains.current[item.id] = node;
              }}
              onToggle={() => onGroup(isOpen ? null : item.id)}
            >
              {item.id === "layers" && (
                <p className="sr-only">
                  {t("currentMapType", { type: t(mapType) })}
                </p>
              )}
              {item.items.map((action) => (
                <Fragment key={action.id}>
                  {action.divider && (
                    <span
                      aria-hidden="true"
                      className="my-0.5 h-px w-40 shrink-0 bg-gray-300 dark:bg-gray-600"
                    />
                  )}
                  <FabButton
                    icon={action.icon}
                    color={action.color}
                    pressed={action.pressed}
                    disabled={action.disabled}
                    label={
                      action.pressed === undefined ? (
                        t(action.label)
                      ) : (
                        <>
                          <CheckLineIcon
                            aria-hidden="true"
                            className={cn(
                              "size-3.5 shrink-0",
                              !action.pressed && "invisible",
                            )}
                          />
                          {t(action.label)}
                        </>
                      )
                    }
                    onClick={() => {
                      // Actions close their group; toggles keep it open.
                      if (action.kind === "action") onGroup(null);
                      action.run();
                    }}
                  />
                </Fragment>
              ))}
            </FabGroup>
          );
        })}
      </div>
    </>
  );
}
