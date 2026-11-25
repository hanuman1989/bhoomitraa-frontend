"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  boundaryDrawArea,
  boundaryDrawReducer,
  initialBoundaryDrawState,
  type BoundaryDrawAction,
  type BoundaryDrawState,
} from "./boundaryDrawState";

/**
 * JavaScript memory only: survives the locale remount and account navigation,
 * never written to storage, and gone after a reload. Only the current Farmer's
 * draft is retained.
 */
let draft: { owner: number; state: BoundaryDrawState } | null = null;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const serverSnapshot = () => initialBoundaryDrawState;

export default function useBoundaryDraw(owner: number | null | undefined) {
  const read = useCallback(
    () =>
      owner != null && draft?.owner === owner
        ? draft.state
        : initialBoundaryDrawState,
    [owner],
  );
  const state = useSyncExternalStore(subscribe, read, serverSnapshot);
  const dispatch = useCallback(
    (action: BoundaryDrawAction) => {
      if (owner == null) return;
      const current = read();
      const next = boundaryDrawReducer(current, action);
      if (next === current) return;
      draft = next.mode === "idle" ? null : { owner, state: next };
      listeners.forEach((listener) => listener());
    },
    [owner, read],
  );
  const area = useMemo(() => boundaryDrawArea(state.points), [state.points]);
  return { ...state, area, dispatch };
}
export type BoundaryDraw = ReturnType<typeof useBoundaryDraw>;
