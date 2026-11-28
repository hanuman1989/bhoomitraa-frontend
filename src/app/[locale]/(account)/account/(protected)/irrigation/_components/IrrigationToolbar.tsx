"use client";
import { useTranslations } from "next-intl";
import {
  ListIcon,
  MapFoldIcon,
  PanelTopIcon,
  ReopenIcon,
  SearchIcon,
} from "@/icons";
import { cn } from "@/utils";
import type { IrrigationOptions } from "@/types/account/irrigation";
import {
  IRRIGATION_SEARCH_MAX,
  withGroup,
  withType,
  type IrrigationFilterState,
  type IrrigationGroup,
  type IrrigationTypeFilter,
} from "./irrigationFilters";
import type { IrrigationView } from "./irrigationMap";
import { irrigationControl, irrigationGhost } from "./IrrigationUi";

const views = [
  { id: "list", Icon: ListIcon },
  { id: "map", Icon: MapFoldIcon },
  { id: "combined", Icon: PanelTopIcon },
] as const;
const groups = ["all", "source", "pipeline"] as const;
const segment =
  "inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-gray-600 transition first:rounded-s-xl last:rounded-e-xl hover:text-gray-900 focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-success-600 aria-pressed:bg-success-50 aria-pressed:font-semibold aria-pressed:text-success-800 dark:text-gray-300 dark:hover:text-white dark:aria-pressed:bg-success-950 dark:aria-pressed:text-success-300";

/** View, group, type, status and search. Every filter change returns to page 1. */
export default function IrrigationToolbar({
  view,
  onView,
  filters,
  onFilters,
  search,
  onSearch,
  options,
  onReset,
}: {
  view: IrrigationView;
  onView: (view: IrrigationView) => void;
  filters: IrrigationFilterState;
  onFilters: (filters: IrrigationFilterState) => void;
  search: string;
  onSearch: (search: string) => void;
  options: IrrigationOptions | null;
  onReset: () => void;
}) {
  const t = useTranslations("farmerIrrigation.toolbar");
  const sourceOptions = options?.source_types.map((option) => (
    <option key={option.key} value={`source:${option.key}`}>
      {option.label}
    </option>
  ));
  const pipelineOptions = options?.pipeline_types.map((option) => (
    <option key={option.key} value={`pipeline:${option.key}`}>
      {option.label}
    </option>
  ));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label={t("view")}
        className="inline-flex shrink-0 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      >
        {views.map(({ id, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => onView(id)}
            className={segment}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {t(`views.${id}`)}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label={t("group")}
        className="inline-flex shrink-0 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      >
        {groups.map((group: IrrigationGroup) => (
          <button
            key={group}
            type="button"
            aria-pressed={filters.group === group}
            onClick={() => onFilters(withGroup(filters, group))}
            className={segment}
          >
            {t(`groups.${group}`)}
          </button>
        ))}
      </div>
      <select
        aria-label={t("type")}
        value={filters.type}
        onChange={(event) =>
          onFilters(
            withType(filters, event.target.value as IrrigationTypeFilter),
          )
        }
        className={cn(
          irrigationControl,
          "w-auto max-w-56 min-w-36 flex-1 sm:flex-none",
        )}
      >
        <option value="">{t("allTypes")}</option>
        {filters.group === "source" ? (
          sourceOptions
        ) : filters.group === "pipeline" ? (
          pipelineOptions
        ) : (
          <>
            <optgroup label={t("groups.source")}>{sourceOptions}</optgroup>
            <optgroup label={t("groups.pipeline")}>{pipelineOptions}</optgroup>
          </>
        )}
      </select>
      <select
        aria-label={t("status")}
        value={filters.status}
        onChange={(event) =>
          onFilters({
            ...filters,
            status: event.target.value as IrrigationFilterState["status"],
            page: 1,
          })
        }
        className={cn(
          irrigationControl,
          "w-auto max-w-56 min-w-36 flex-1 sm:flex-none",
        )}
      >
        <option value="">{t("allStatuses")}</option>
        {options?.statuses.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <label className="relative min-w-48 flex-1 basis-56">
        <span className="sr-only">{t("search")}</span>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
        />
        <input
          type="search"
          value={search}
          maxLength={IRRIGATION_SEARCH_MAX}
          autoComplete="off"
          placeholder={t("search")}
          onChange={(event) => onSearch(event.target.value)}
          className={cn(irrigationControl, "ps-9")}
        />
      </label>
      <button type="button" onClick={onReset} className={irrigationGhost}>
        <ReopenIcon aria-hidden="true" className="size-4" />
        {t("reset")}
      </button>
    </div>
  );
}
