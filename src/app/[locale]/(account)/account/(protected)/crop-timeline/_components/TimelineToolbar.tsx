"use client";
import { useTranslations } from "next-intl";
import { SearchIcon } from "@/icons";
import { cropButton, cropControl } from "../../crops/_components/CropUi";

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

/** Search, status and category filters, view toggle, and expand/collapse all. */
export default function TimelineToolbar({
  filters,
  categories,
  view,
  onFilters,
  onView,
  onExpandAll,
  onCollapseAll,
}: {
  filters: TimelineFilters;
  categories: { id: number; name: string }[];
  view: TimelineView;
  onFilters: (filters: TimelineFilters) => void;
  onView: (view: TimelineView) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const t = useTranslations("farmerCropTimeline.toolbar");
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="relative min-w-52 flex-1 basis-56">
        <SearchIcon
          aria-hidden="true"
          className="text-success-600 absolute start-3 top-3 size-4"
        />
        <input
          type="search"
          aria-label={t("searchLabel")}
          value={filters.search}
          maxLength={150}
          placeholder={t("search")}
          onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          className={`${cropControl} !h-11 ps-9`}
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
        className={`${cropControl} !h-11 w-auto`}
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
        className={`${cropControl} !h-11 w-auto max-w-56`}
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
        className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
      >
        {(["stages", "calendar"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => onView(key)}
            className={`focus-visible:outline-success-600 min-h-11 px-3 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 ${view === key ? "bg-success-700 font-semibold text-white" : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"}`}
          >
            {t(`views.${key}`)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onExpandAll}
        className={`${cropButton} min-h-11`}
      >
        {t("expandAll")}
      </button>
      <button
        type="button"
        onClick={onCollapseAll}
        className={`${cropButton} min-h-11`}
      >
        {t("collapseAll")}
      </button>
    </div>
  );
}
