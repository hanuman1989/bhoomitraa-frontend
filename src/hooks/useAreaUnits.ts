"use client";
import {
  startTransition,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { getAreaUnits } from "@/actions/account/users";
import { getAreaUnitLabel } from "@/lib/areaUnits";
import type { AreaUnitsConfig } from "@/types/account/areaUnit";

interface MetadataState {
  config: AreaUnitsConfig | null;
  status: "idle" | "loading" | "ready" | "error";
}
const initial: MetadataState = { config: null, status: "idle" };
let state = initial;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => state;
const serverSnapshot = () => initial;
function publish(next: MetadataState) {
  state = next;
  listeners.forEach((listener) => listener());
}
function load() {
  if (pending) return pending;
  publish({ ...state, status: "loading" });
  pending = (async () => {
    try {
      const result = await getAreaUnits();
      publish(
        result.success && result.data
          ? { config: result.data, status: "ready" }
          : { ...state, status: "error" },
      );
    } catch {
      publish({ ...state, status: "error" });
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/** One session-memory metadata source, shared by Account forms and maps. */
export default function useAreaUnits() {
  const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const locale = useLocale();
  const t = useTranslations("areaUnits");
  useEffect(() => {
    if (state.status === "idle")
      startTransition(() => {
        void load();
      });
  }, []);
  const label = useCallback(
    (unit?: string | null) =>
      getAreaUnitLabel(unit, current.config, locale) ??
      t(
        unit === "bigha"
          ? "legacyBigha"
          : unit === "ha"
            ? "legacyHectare"
            : unit === "sqm"
              ? "squareMetres"
              : "unknownUnit",
      ),
    [current.config, locale, t],
  );
  return {
    ...current,
    label,
    retry: () =>
      startTransition(() => {
        void load();
      }),
  };
}
