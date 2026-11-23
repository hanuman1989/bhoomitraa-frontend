"use client";

import { type ChangeEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  CalenderIcon,
  GridIcon,
  PanelTopIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
} from "@/icons";
import { templateScheduleTypes } from "@/types/admin/cropActivityTemplate";
import type {
  BuilderCategory,
  BuilderFilters,
  BuilderPrefs,
  BuilderStage,
} from "./types";
import TimelineHelpPopover, { type HelpProps } from "./TimelineHelpPopover";
import { buttonClass, primaryClass } from "./BuilderDialog";

const selectClass =
  "shadow-theme-xs h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";
const smallButton =
  "rounded-lg border border-gray-300 bg-white h-9 px-4 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

export default function TimelineToolbar({
  filters,
  onFilters,
  prefs,
  onPrefs,
  categories,
  stages,
  fullscreen,
  onFullscreen,
  onCreate,
  onJump,
  onExpandAll,
  onCollapseAll,
  selectedCount,
  onSelectVisible,
  onClearSelection,
  onBulk,
  help,
}: {
  filters: BuilderFilters;
  onFilters: (filters: BuilderFilters) => void;
  prefs: BuilderPrefs;
  onPrefs: (patch: Partial<BuilderPrefs>) => void;
  categories: BuilderCategory[];
  stages: BuilderStage[];
  fullscreen: boolean;
  onFullscreen: () => void;
  onCreate: () => void;
  onJump: (stageId: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  selectedCount: number;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onBulk: () => void;
  help: HelpProps;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const activeFilters = (
    ["status", "category", "applicability", "schedule"] as const
  ).filter((key) => filters[key] !== "all").length;
  const set =
    <K extends keyof BuilderFilters>(key: K) =>
    (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onFilters({ ...filters, [key]: event.target.value });
  function toggleSearch() {
    onPrefs({ searchVisible: !prefs.searchVisible });
    // Focus once the input is shown again; its query is never cleared.
    if (!prefs.searchVisible)
      setTimeout(
        () => document.getElementById("builder-search-input")?.focus(),
        0,
      );
  }
  // Icon-only visibility control; hiding a section keeps its values applied.
  const toggle = (
    visible: boolean,
    controls: string,
    label: string,
    icon: ReactNode,
    onClick: () => void,
    badge?: ReactNode,
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={visible}
      aria-controls={controls}
      aria-label={label}
      title={label}
      className={`relative inline-flex size-11 items-center justify-center rounded-lg border transition-colors ${
        visible
          ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300"
          : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      }`}
    >
      {icon}
      {badge}
    </button>
  );
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          id="builder-search"
          hidden={!prefs.searchVisible}
          className="relative min-w-60 flex-1 max-sm:min-w-full"
        >
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-3 size-5 text-gray-500"
          />
          <input
            id="builder-search-input"
            type="search"
            value={filters.search}
            onChange={set("search")}
            maxLength={150}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="shadow-theme-xs focus:border-brand-300 h-9 w-full rounded-lg border border-gray-300 bg-white ps-10 pe-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div
          role="group"
          aria-label={t("visibilityControls")}
          className="flex items-center gap-2"
        >
          {toggle(
            prefs.searchVisible,
            "builder-search",
            t(prefs.searchVisible ? "hideSearch" : "showSearch"),
            <SearchIcon aria-hidden="true" className="size-5" />,
            toggleSearch,
            // A hidden search that still filters is flagged with a dot.
            !prefs.searchVisible && filters.search.trim() !== "" && (
              <span
                aria-hidden="true"
                className="bg-brand-500 absolute -inset-e-1 -top-1 size-2.5 rounded-full ring-2 ring-white dark:ring-gray-900"
              />
            ),
          )}
          {toggle(
            prefs.filtersVisible,
            "builder-filters",
            t(prefs.filtersVisible ? "hideFilters" : "showFilters"),
            <SlidersIcon aria-hidden="true" className="size-5" />,
            () => onPrefs({ filtersVisible: !prefs.filtersVisible }),
            !!activeFilters && (
              <span className="bg-brand-500 absolute -inset-e-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white dark:ring-gray-900">
                <span aria-hidden="true">{activeFilters}</span>
                <span className="sr-only">
                  {t("activeFilters", { count: activeFilters })}
                </span>
              </span>
            ),
          )}
          {toggle(
            prefs.configVisible,
            "builder-configuration",
            t(prefs.configVisible ? "hideConfiguration" : "showConfiguration"),
            <PanelTopIcon aria-hidden="true" className="size-5" />,
            () => onPrefs({ configVisible: !prefs.configVisible }),
          )}
        </div>
        <TimelineHelpPopover {...help} />
        <button
          type="button"
          onClick={onCreate}
          className={`inline-flex items-center gap-1 ${primaryClass}`}
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("addActivity")}
        </button>
        <button
          type="button"
          onClick={onFullscreen}
          aria-pressed={fullscreen}
          aria-label={t(fullscreen ? "exitFullscreen" : "fullscreen")}
          title={t(fullscreen ? "exitFullscreen" : "fullscreen")}
          className={buttonClass}
        >
          <GridIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div
        id="builder-filters"
        hidden={!prefs.filtersVisible}
        className="flex flex-wrap items-center gap-2"
      >
        <select
          value={filters.status}
          onChange={set("status")}
          aria-label={t("filters.status")}
          className={selectClass}
        >
          {(
            [
              "all",
              "incomplete",
              "configured",
              "active",
              "inactive",
              "exception",
            ] as const
          ).map((value) => (
            <option key={value} value={value}>
              {t(`filters.statuses.${value}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={set("category")}
          aria-label={t("filters.category")}
          className={selectClass}
        >
          <option value="all">{t("filters.allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name ?? t("recordId", { id: category.id })}
            </option>
          ))}
        </select>
        <select
          value={filters.applicability}
          onChange={set("applicability")}
          aria-label={t("filters.applicability")}
          className={selectClass}
        >
          {(["all", "matching", "custom", "session"] as const).map((value) => (
            <option key={value} value={value}>
              {t(`filters.applicabilities.${value}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.schedule}
          onChange={set("schedule")}
          aria-label={t("filters.schedule")}
          className={selectClass}
        >
          <option value="all">{t("filters.allSchedules")}</option>
          {templateScheduleTypes.map((type) => (
            <option key={type} value={type}>
              {tt(`schedule.${type}`)}
            </option>
          ))}
          <option value="unresolved">{t("filters.unresolved")}</option>
        </select>
        <select
          value=""
          onChange={(event) => {
            if (event.target.value) onJump(Number(event.target.value));
          }}
          aria-label={t("filters.jump")}
          className={selectClass}
        >
          <option value="">{t("filters.jump")}</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.sequence}. {stage.name ?? stage.code}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            onFilters({
              search: "",
              status: "all",
              category: "all",
              applicability: "all",
              schedule: "all",
            })
          }
          className={smallButton}
        >
          {t("filters.reset")}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          value={prefs.view}
          onChange={(event) =>
            onPrefs({
              view:
                event.target.value === "chronological"
                  ? "chronological"
                  : "stage",
            })
          }
          aria-label={t("view.label")}
          className={selectClass}
        >
          <option value="stage">{t("view.stage")}</option>
          <option value="chronological">{t("view.chronological")}</option>
        </select>
        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={prefs.groupByCategory}
            onChange={(event) =>
              onPrefs({ groupByCategory: event.target.checked })
            }
            className="accent-brand-600 size-4"
          />
          {t("view.groupByCategory")}
        </label>
        <label
          htmlFor="builder-preview-date"
          className="text-gray-700 dark:text-gray-300"
        >
          {t("view.previewDate")}
        </label>
        <div className="relative">
          <input
            id="builder-preview-date"
            type="date"
            value={prefs.previewDate}
            onChange={(event) => onPrefs({ previewDate: event.target.value })}
            // The admin theme hides the native picker indicator, so open the
            // browser calendar from anywhere on the field.
            onClick={(event) => {
              try {
                event.currentTarget.showPicker();
              } catch {}
            }}
            className={`${selectClass} cursor-pointer pe-10`}
          />
          <CalenderIcon
            aria-hidden="true"
            className="pointer-events-none absolute inset-e-3 top-1/2 size-5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
          />
        </div>
        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={prefs.showDates}
            onChange={(event) => onPrefs({ showDates: event.target.checked })}
            className="accent-brand-600 size-4"
          />
          {t("view.calendarDates")}
        </label>
        <button type="button" onClick={onExpandAll} className={smallButton}>
          {t("view.expandAll")}
        </button>
        <button type="button" onClick={onCollapseAll} className={smallButton}>
          {t("view.collapseAll")}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <b className="text-gray-800 dark:text-gray-200">
          {t("selectedCount", { count: selectedCount })}
        </b>
        <button type="button" onClick={onSelectVisible} className={smallButton}>
          {t("selectVisible")}
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={!selectedCount}
          className={smallButton}
        >
          {t("clearSelection")}
        </button>
        <button
          type="button"
          onClick={onBulk}
          disabled={!selectedCount}
          className={smallButton}
        >
          {t("bulk.open")}
        </button>
      </div>
    </div>
  );
}
