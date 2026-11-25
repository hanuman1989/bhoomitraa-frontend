"use client";
import { useEffect, useEffectEvent } from "react";

type Shortcut = "complete" | "undo" | "clear";
interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  target: EventTarget | null;
}

/** Desktop shortcuts; never while typing or inside a dialog. */
export function boundaryDrawShortcut(event: KeyInput): Shortcut | null {
  if (event.defaultPrevented || event.altKey) return null;
  const target =
    event.target && typeof (event.target as Element).closest === "function"
      ? (event.target as Element)
      : null;
  if (
    target?.closest(
      "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog']",
    )
  )
    return null;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "z") return "undo";
  if (event.ctrlKey || event.metaKey) return null;
  if (key === "enter") return target?.closest("button, a") ? null : "complete";
  if (key === "backspace") return "undo";
  if (key === "escape") return "clear";
  return null;
}

export default function useBoundaryDrawShortcuts(
  enabled: boolean,
  actions: Record<Shortcut, () => void>,
) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    const shortcut = boundaryDrawShortcut(event);
    if (!shortcut) return;
    event.preventDefault();
    actions[shortcut]();
  });
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => handle(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}
