import {
  boundaryArea,
  boundaryError,
  boundaryPointRejection,
} from "../farmGeometry";
import type { MapPosition } from "../dashboardTypes";

export type BoundaryDrawMode = "idle" | "drawing" | "drawn";
/** `farmerFarms` message keys, shared with Add Farm step 3. */
export type BoundaryDrawError =
  | `boundaryErrors.${NonNullable<ReturnType<typeof boundaryError>>}`
  | "pointLimit";
export interface BoundaryDrawState {
  mode: BoundaryDrawMode;
  points: readonly MapPosition[];
  error: BoundaryDrawError | null;
}
export type BoundaryDrawAction =
  | { type: "start" }
  | { type: "add"; point: MapPosition }
  | { type: "undo" }
  | { type: "complete" }
  | { type: "reopen" }
  | { type: "reset" };

export const initialBoundaryDrawState: BoundaryDrawState = {
  mode: "idle",
  points: [],
  error: null,
};

export function boundaryDrawReducer(
  state: BoundaryDrawState,
  action: BoundaryDrawAction,
): BoundaryDrawState {
  switch (action.type) {
    case "start":
      return state.mode === "idle"
        ? { mode: "drawing", points: [], error: null }
        : state;
    case "add": {
      if (state.mode !== "drawing") return state;
      const rejection = boundaryPointRejection(state.points, action.point);
      if (rejection === "pointLimit") return { ...state, error: "pointLimit" };
      if (rejection) return state;
      return { ...state, points: [...state.points, action.point], error: null };
    }
    case "undo":
      if (state.mode === "drawn") return { ...state, mode: "drawing" };
      return state.mode === "drawing" && state.points.length
        ? { ...state, points: state.points.slice(0, -1), error: null }
        : state;
    case "complete": {
      if (state.mode !== "drawing") return state;
      const error = boundaryError(state.points);
      return error
        ? { ...state, error: `boundaryErrors.${error}` }
        : { ...state, mode: "drawn", error: null };
    }
    case "reopen":
      return state.mode === "drawn"
        ? { ...state, mode: "drawing", error: null }
        : state;
    case "reset":
      return initialBoundaryDrawState;
  }
}

/** Same rule as step 3: an area preview only exists for a valid shape. */
export function boundaryDrawArea(
  points: readonly MapPosition[],
): number | null {
  return points.length >= 3 && !boundaryError(points)
    ? boundaryArea(points)
    : null;
}
