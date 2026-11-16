"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import FarmInfoWindow, {
  type FarmInfoWindowProps,
  type FarmInfoAction,
} from "./FarmInfoWindow";
import type { MapPosition } from "@/app/[locale]/(account)/account/(protected)/_components/dashboardTypes";
import type {
  MapsInstance,
  MapsOverlay,
  MapsSDK,
} from "@/app/[locale]/(account)/account/(protected)/_components/googleMaps";
import {
  farmPopupLayout,
  type MapViewport,
} from "@/app/[locale]/(account)/account/(protected)/_components/mapViewport";

interface Props {
  sdk: MapsSDK;
  map: MapsInstance;
  farm: FarmInfoWindowProps["farm"] | null;
  areaLabel?: string | null;
  anchor: MapPosition | null;
  open: boolean;
  blocked: boolean;
  request: number;
  viewport: MapViewport;
  panelHeight: number;
  onClose: () => void;
  onAction?: (action: FarmInfoAction, id: number) => void;
  children?: ReactNode;
}

/** One supported OverlayView host. React stays in the dashboard's provider tree. */
export default function FarmInfoOverlay({
  sdk,
  map,
  farm,
  areaLabel,
  anchor,
  open,
  blocked,
  request,
  viewport,
  panelHeight,
  onClose,
  onAction,
  children,
}: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const overlayRef = useRef<MapsOverlay | null>(null);
  const settings = useRef({ anchor, open, blocked, viewport, panelHeight });
  const reveal = useRef(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const enabled = Boolean(farm && anchor);
  const latitude = anchor?.lat ?? null,
    longitude = anchor?.lng ?? null;
  const { width, height, sidebarWidth, rtl } = viewport;
  const farmId = farm?.id ?? null;

  useEffect(() => {
    settings.current = {
      anchor:
        latitude === null || longitude === null
          ? null
          : { lat: latitude, lng: longitude },
      open,
      blocked,
      viewport: {
        width,
        height,
        sidebarWidth,
        rtl: rtl ?? document.documentElement.dir === "rtl",
      },
      panelHeight,
    };
    // Explicit selection/focus permits one minimal reveal pan. A locale snapshot
    // starts with request=0 and preserves its restored viewport.
    reveal.current = request > 0;
    overlayRef.current?.draw();
  }, [
    latitude,
    longitude,
    open,
    blocked,
    request,
    width,
    height,
    sidebarWidth,
    rtl,
    panelHeight,
  ]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let host: HTMLDivElement | null = null;
    const overlay = new sdk.OverlayView();
    overlayRef.current = overlay;
    const pointer = document.createElement("span");
    pointer.className = "absolute size-4 rotate-45 bg-white dark:bg-gray-900";
    pointer.setAttribute("aria-hidden", "true");
    const dot = document.createElement("span");
    dot.className =
      "bg-success-500 shadow-theme-sm pointer-events-none absolute z-1 size-4 rounded-full border-3 border-white";
    dot.style.left = "-8px";
    dot.style.top = "-8px";
    dot.setAttribute("aria-hidden", "true");
    overlay.onAdd = () => {
      if (!live || !settings.current.open || settings.current.blocked) return;
      const pane = overlay.getPanes()?.floatPane;
      if (!pane) return;
      host = document.createElement("div");
      host.dir = "ltr"; // Google canvas coordinates are physical, including in RTL.
      host.className = "pointer-events-auto absolute";
      host.style.width = "320px";
      host.style.height = "0px";
      host.hidden = true;
      host.append(pointer, dot);
      sdk.OverlayView.preventMapHitsAndGesturesFrom(host);
      pane.appendChild(host);
      setContainer(host);
    };
    overlay.draw = () => {
      const current = settings.current;
      const card = host?.querySelector<HTMLElement>("[data-farm-info-card]");
      if (!host || !card) return;
      if (!current.open || current.blocked || !current.anchor) {
        host.hidden = true;
        return;
      }
      const projection = overlay.getProjection();
      const pixel = projection?.fromLatLngToContainerPixel(current.anchor);
      const divPixel = projection?.fromLatLngToDivPixel(current.anchor);
      if (!pixel || !divPixel) {
        host.hidden = true;
        return;
      }
      host.hidden = false;
      const header = card.querySelector<HTMLElement>("[data-farm-info-header]");
      const menu = card.querySelector<HTMLElement>("[data-farm-info-menu]");
      const headerHeight = header?.offsetHeight ?? 88;
      const height = headerHeight + (menu?.scrollHeight ?? 256);
      const layout = farmPopupLayout(
        pixel,
        current.viewport,
        current.panelHeight,
        height,
        reveal.current,
        headerHeight + 48,
      );
      if (!layout) {
        host.hidden = true;
        return;
      }
      if (reveal.current) {
        reveal.current = false;
        if (layout.pan.x || layout.pan.y) {
          host.hidden = true;
          map.panBy(layout.pan.x, layout.pan.y);
          return;
        }
      }
      const x = layout.x - pixel.x,
        y = layout.y - pixel.y;
      host.style.left = `${divPixel.x}px`;
      host.style.top = `${divPixel.y}px`;
      host.style.width = `${layout.width}px`;
      card.style.maxHeight = `${layout.height}px`;
      card.style.transform = `translate(${x}px, ${y}px)`;
      pointer.style.left = `${layout.side === "right" ? x - 8 : layout.side === "left" ? x + layout.width - 8 : -8}px`;
      pointer.style.top = `${layout.side === "above" ? y + layout.height - 8 : layout.side === "below" ? y - 8 : -8}px`;
    };
    overlay.onRemove = () => {
      host?.remove();
      const removed = host;
      host = null;
      setContainer((current) => (current === removed ? null : current));
    };
    return () => {
      live = false;
      overlay.setMap(null);
      sdk.event.clearInstanceListeners(overlay);
      if (overlayRef.current === overlay) overlayRef.current = null;
    };
  }, [sdk, map, enabled]);

  useEffect(() => {
    overlayRef.current?.setMap(open && !blocked ? map : null);
  }, [sdk, map, enabled, open, blocked]);

  useEffect(() => {
    if (!container || farmId === null) return;
    const card = container.querySelector<HTMLElement>("[data-farm-info-card]");
    overlayRef.current?.draw();
    if (!card || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => overlayRef.current?.draw());
    observer.observe(card);
    return () => observer.disconnect();
  }, [container, farmId]);

  useEffect(() => {
    if (open && !blocked && !container?.contains(document.activeElement))
      previousFocus.current = document.activeElement as HTMLElement | null;
  }, [open, blocked, farmId, container]);
  function close() {
    if (
      container?.contains(document.activeElement) &&
      previousFocus.current?.isConnected
    )
      previousFocus.current.focus({ preventScroll: true });
    onClose();
  }
  useEffect(() => {
    if (!open || blocked || !container) return;
    function escape(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        container?.hidden ||
        document.querySelector('[role="dialog"][aria-modal="true"]') ||
        (!container?.contains(target) &&
          target?.closest("input, textarea, select, [contenteditable=true]"))
      )
        return;
      event.preventDefault();
      onClose();
      if (
        container?.contains(document.activeElement) &&
        previousFocus.current?.isConnected
      )
        previousFocus.current.focus({ preventScroll: true });
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, blocked, container, onClose]);

  return container && farm
    ? createPortal(
        children ?? (
          <FarmInfoWindow
            farm={farm}
            areaLabel={areaLabel}
            onClose={close}
            onAction={onAction}
          />
        ),
        container,
      )
    : null;
}
