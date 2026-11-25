"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CrosshairIcon,
  SearchIcon,
} from "@/icons";
import { cn } from "@/utils";
import { cropButton, cropControl } from "../../crops/_components/CropUi";
import Tooltip from "@/components/common/Tooltip";

export type TimelineStatusFilter =
  "all" | "due" | "upcoming" | "late" | "in_progress" | "completed";
export type TimelineView = "stages" | "calendar";
export interface TimelineFilters {
  search: string;
  status: TimelineStatusFilter;
  category: string;
}

const statusFilters: Exclude<TimelineStatusFilter, "all">[] = [
  "due",
  "upcoming",
  "late",
  "in_progress",
  "completed",
];

/**
 * Search, status and category filters, view toggle, expand/collapse all, and
 * "Go to current". One row on wide screens; it wraps when the row is too narrow.
 */
export default function TimelineToolbar({
  filters,
  categories,
  view,
  hasCurrent,
  onFilters,
  onView,
  onExpandAll,
  onCollapseAll,
  onGoToCurrent,
}: {
  filters: TimelineFilters;
  categories: { id: number; name: string }[];
  view: TimelineView;
  /** Whether an In progress or Due now activity exists to go to. */
  hasCurrent: boolean;
  onFilters: (filters: TimelineFilters) => void;
  onView: (view: TimelineView) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onGoToCurrent: () => void;
}) {
  const t = useTranslations("farmerCropTimeline.toolbar");
  const noCurrentId = useId();
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="relative min-w-52 flex-1 basis-56 xl:min-w-40 xl:basis-40">
        <SearchIcon
          aria-hidden="true"
          className="text-success-600 absolute start-3 top-3.5 size-4"
        />
        <input
          type="search"
          aria-label={t("searchLabel")}
          value={filters.search}
          maxLength={150}
          placeholder={t("search")}
          onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          className={cn(cropControl, "h-11 ps-9")}
        />
      </div>
      <select
        aria-label={t("status")}
        value={filters.status}
        onChange={(e) =>
          onFilters({
            ...filters,
            status: e.target.value as TimelineStatusFilter,
          })
        }
        className={cn(cropControl, "h-11 w-auto shrink-0")}
      >
        <option value="all">{t("allStatuses")}</option>
        {statusFilters.map((status) => (
          <option key={status} value={status}>
            {t(`statuses.${status}`)}
          </option>
        ))}
      </select>
      <select
        aria-label={t("category")}
        value={filters.category}
        onChange={(e) => onFilters({ ...filters, category: e.target.value })}
        className={cn(cropControl, "h-11 w-auto max-w-56 shrink-0")}
      >
        <option value="all">{t("allCategories")}</option>
        {categories.map((category) => (
          <option key={category.id} value={String(category.id)}>
            {category.name}
          </option>
        ))}
      </select>
      <div
        role="group"
        aria-label={t("view")}
        className="inline-flex shrink-0 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
      >
        {(["stages", "calendar"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => onView(key)}
            className={`focus-visible:outline-success-600 min-h-11 px-3 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 ${view === key ? "bg-success-700 font-semibold text-white" : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"}`}
          >
            {t(`views.${key}`)}
          </button>
        ))}
      </div>
      {/* Icon-only; the label is the tooltip and the accessible name. */}
      <Tooltip content={t("expandAll")} className="shrink-0">
        <button
          type="button"
          onClick={onExpandAll}
          aria-label={t("expandAll")}
          className={cn(cropButton, "size-11 p-0")}
        >
          <ChevronsUpDownIcon aria-hidden="true" className="size-5" />
        </button>
      </Tooltip>
      <Tooltip content={t("collapseAll")} className="shrink-0">
        <button
          type="button"
          onClick={onCollapseAll}
          aria-label={t("collapseAll")}
          className={cn(cropButton, "size-11 p-0")}
        >
          <ChevronsDownUpIcon aria-hidden="true" className="size-5" />
        </button>
      </Tooltip>
      {/* aria-disabled rather than disabled, so the reason in the tooltip still shows on hover and focus. */}
      <Tooltip
        content={hasCurrent ? null : t("noCurrent")}
        id={noCurrentId}
        className="shrink-0"
      >
        <button
          type="button"
          aria-disabled={!hasCurrent}
          aria-describedby={hasCurrent ? undefined : noCurrentId}
          onClick={hasCurrent ? onGoToCurrent : undefined}
          className={`${cropButton} min-h-11 whitespace-nowrap aria-disabled:cursor-not-allowed aria-disabled:opacity-40`}
        >
          <CrosshairIcon aria-hidden="true" className="size-4" />
          {t("goToCurrent")}
        </button>
      </Tooltip>
    </div>
  );
}
