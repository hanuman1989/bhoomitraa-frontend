import type { PageSearchParams } from "@/types/api";
import type {
  IrrigationAssetType,
  IrrigationFilters,
  IrrigationPipelineType,
  IrrigationSourceType,
  IrrigationStatus,
} from "@/types/account/irrigation";

export const IRRIGATION_PAGE_SIZE = 20;
export const IRRIGATION_SEARCH_MAX = 100;
export const IRRIGATION_SOURCE_TYPES = [
  "borewell",
  "open_well",
  "canal",
  "pond",
  "tank",
  "river",
  "reservoir",
  "rainwater_collection",
  "other",
] as const satisfies readonly IrrigationSourceType[];
export const IRRIGATION_PIPELINE_TYPES = [
  "underground",
  "surface",
  "portable",
  "other",
] as const satisfies readonly IrrigationPipelineType[];
export const IRRIGATION_STATUSES = [
  "operational",
  "needs_maintenance",
  "out_of_service",
  "inactive",
] as const satisfies readonly IrrigationStatus[];

export type IrrigationGroup = "all" | IrrigationAssetType;
/** Category and key together, because "other" exists in both groups. */
export type IrrigationTypeFilter =
  "" | `source:${IrrigationSourceType}` | `pipeline:${IrrigationPipelineType}`;
export interface IrrigationFilterState {
  group: IrrigationGroup;
  type: IrrigationTypeFilter;
  status: IrrigationStatus | "";
  search: string;
  page: number;
}
export const defaultIrrigationFilters: IrrigationFilterState = {
  group: "all",
  type: "",
  status: "",
  search: "",
  page: 1,
};

const includes = <T extends string>(list: readonly T[], value: string) =>
  (list as readonly string[]).includes(value) ? (value as T) : undefined;

/** Filters from the page URL. Unknown or mismatched values are ignored. */
export function irrigationFilters(
  params: PageSearchParams,
): IrrigationFilterState {
  const value = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw : "";
  };
  const group: IrrigationGroup =
    value("asset_type") === "source" || value("asset_type") === "pipeline"
      ? (value("asset_type") as IrrigationAssetType)
      : "all";
  const source = includes(IRRIGATION_SOURCE_TYPES, value("source_type"));
  const pipeline = includes(IRRIGATION_PIPELINE_TYPES, value("pipeline_type"));
  const type: IrrigationTypeFilter =
    source && group !== "pipeline"
      ? `source:${source}`
      : pipeline && group !== "source"
        ? `pipeline:${pipeline}`
        : "";
  const page = /^\d+$/.test(value("page")) ? Number(value("page")) : 1;
  return {
    group,
    type,
    status: includes(IRRIGATION_STATUSES, value("status")) ?? "",
    search: value("search").slice(0, IRRIGATION_SEARCH_MAX),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

/** The list query for Laravel. The map uses the same filters without the page. */
export function irrigationQuery(
  state: IrrigationFilterState,
): IrrigationFilters {
  const [category, key] = state.type.split(":") as [string, string];
  const search = state.search.trim();
  return {
    ...(state.group !== "all" && { asset_type: state.group }),
    ...(category === "source" && { source_type: key as IrrigationSourceType }),
    ...(category === "pipeline" && {
      pipeline_type: key as IrrigationPipelineType,
    }),
    ...(state.status && { status: state.status }),
    ...(search && { search }),
    page: state.page,
    per_page: IRRIGATION_PAGE_SIZE,
  };
}

/** URL query string (without "?") that irrigationFilters() reads back. */
export function irrigationSearchParams(state: IrrigationFilterState): string {
  const query: IrrigationFilters = irrigationQuery(state);
  delete query.per_page;
  if (state.page <= 1) delete query.page;
  return new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  ).toString();
}

/** A new group clears a type from the other group and returns to page 1. */
export function withGroup(
  state: IrrigationFilterState,
  group: IrrigationGroup,
): IrrigationFilterState {
  const keep = group === "all" || state.type.startsWith(`${group}:`);
  return { ...state, group, type: keep ? state.type : "", page: 1 };
}

/** A type from another group moves a narrowed group along with it. */
export function withType(
  state: IrrigationFilterState,
  type: IrrigationTypeFilter,
): IrrigationFilterState {
  const category = type.split(":")[0] as IrrigationAssetType;
  return {
    ...state,
    type,
    group: type && state.group !== "all" ? category : state.group,
    page: 1,
  };
}

export function hasIrrigationFilters(state: IrrigationFilterState): boolean {
  return Boolean(
    state.group !== "all" || state.type || state.status || state.search.trim(),
  );
}
