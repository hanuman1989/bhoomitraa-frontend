"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { useTranslations } from "next-intl";
import { ResizeGripIcon } from "@/icons";
import { clampPanelHeight, PANEL_MIN_HEIGHT } from "./dashboardState";

export default function AccountPanelResizeHandle({
  height,
  maximum,
  onResize,
}: {
  height: number;
  maximum: number;
  onResize: (height: number) => void;
}) {
  const t = useTranslations("farmerDashboard.panel");
  const drag = useRef<{ id: number; y: number; height: number } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  function flush() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (pending.current !== null) {
      onResize(pending.current);
      pending.current = null;
    }
  }
  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = { id: event.pointerId, y: event.clientY, height };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    event.preventDefault();
    event.stopPropagation();
    pending.current = clampPanelHeight(
      drag.current.height - (event.clientY - drag.current.y),
      maximum,
    );
    if (frame.current === null)
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (pending.current !== null) {
          onResize(pending.current);
          pending.current = null;
        }
      });
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    flush();
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next =
      event.key === "ArrowUp"
        ? height + 32
        : event.key === "ArrowDown"
          ? height - 32
          : event.key === "Home"
            ? PANEL_MIN_HEIGHT
            : event.key === "End"
              ? maximum
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onResize(clampPanelHeight(next, maximum));
  }
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="horizontal"
      aria-label={t("resize")}
      aria-controls="account-panel-content"
      aria-valuemin={Math.min(PANEL_MIN_HEIGHT, maximum)}
      aria-valuemax={Math.round(maximum)}
      aria-valuenow={Math.round(height)}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onKeyDown={keyDown}
      className={`border-success-300 text-success-700 shadow-theme-sm focus-visible:outline-success-600 dark:border-success-700 dark:text-success-400 absolute start-1/2 z-1 flex h-6 w-20 cursor-ns-resize touch-none items-center justify-center rounded-full border bg-white select-none focus-visible:outline-2 ltr:-translate-x-1/2 rtl:translate-x-1/2 dark:bg-gray-800 ${height >= maximum - 1 ? "top-1" : "top-0 -translate-y-1/2"} ${dragging ? "ring-success-500/30 ring-2" : "hover:bg-success-50 dark:hover:bg-gray-700"}`}
    >
      <ResizeGripIcon aria-hidden="true" className="h-3 w-10" />
    </div>
  );
}
