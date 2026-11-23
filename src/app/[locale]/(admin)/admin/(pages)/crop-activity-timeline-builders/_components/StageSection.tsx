"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Badge from "@/components/admin/ui/badge/Badge";
import { ChevronDownIcon, PlusIcon } from "@/icons";
import type { CropActivityTemplateListItem } from "@/types/admin/cropActivityTemplate";
import type { BuilderCategory, BuilderStage, DayWindow } from "./types";
import TimelineRailMarker, { CategoryIcon } from "./TimelineRailMarker";

export default function StageSection({
  id,
  title,
  stage,
  items,
  categories,
  windows,
  formatWindow,
  closed,
  groupByCategory,
  renderCard,
  onToggle,
  onCreate,
  onStageTimelines,
}: {
  id: string;
  title: string;
  /** Absent for independent (stage-less) activity groups. */
  stage?: BuilderStage;
  items: CropActivityTemplateListItem[];
  categories: BuilderCategory[];
  windows: DayWindow[];
  formatWindow: (window: DayWindow) => string;
  closed: boolean;
  groupByCategory: boolean;
  renderCard: (item: CropActivityTemplateListItem) => ReactNode;
  onToggle: () => void;
  onCreate: (categoryId: number | null) => void;
  onStageTimelines: () => void;
}) {
  const t = useTranslations("timelineBuilder");
  const used = categories.filter((category) =>
    items.some((item) => item.category_id === category.id),
  );
  const missing = items.some(
    (item) => !categories.some((category) => category.id === item.category_id),
  );
  const markerCategories = missing
    ? [...used, { id: 0, name: null, icon: null }]
    : used;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`shadow-theme-xs relative mb-5 scroll-mt-40 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 ${stage ? "" : "border-dashed"}`}
    >
      <span
        aria-hidden="true"
        className="absolute -start-6 top-10 h-0.5 w-6 bg-gray-300 max-sm:-start-3 max-sm:w-3 dark:bg-gray-700"
      />
      <TimelineRailMarker
        categories={markerCategories}
        label={
          markerCategories.length
            ? markerCategories
                .map((category) => category.name ?? t("uncategorized"))
                .join(", ")
            : t("emptyStageMarker")
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h3
            id={`${id}-title`}
            className={`font-semibold text-gray-900 dark:text-white ${stage ? "text-lg" : "text-base text-gray-600 dark:text-gray-300"}`}
          >
            {title}
          </h3>
          {stage && (
            <>
              <p className="text-theme-xs font-semibold tracking-wide text-gray-400 uppercase">
                {t("stageSequence", { sequence: stage.sequence })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {windows.length
                  ? windows.map((window) => formatWindow(window)).join(" | ")
                  : t("timing.noStageTiming")}
              </p>
            </>
          )}
        </div>
        {stage && (
          <>
            <Badge size="sm" color="light">
              {t("activityCount", { count: items.length })}
            </Badge>
            <button
              type="button"
              onClick={onStageTimelines}
              className="h-9 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              {t("stageTimelines")}
            </button>
            <button
              type="button"
              onClick={() => onCreate(null)}
              className="bg-brand-600 hover:bg-brand-700 inline-flex h-9 items-center gap-1 rounded-lg px-4 text-sm font-semibold text-white"
            >
              <PlusIcon aria-hidden="true" className="size-4" />
              {t("addActivity")}
            </button>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!closed}
              aria-controls={`${id}-items`}
              aria-label={t(closed ? "expandStage" : "collapseStage", {
                stage: title,
              })}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 dark:border-gray-700 dark:text-gray-300"
            >
              <ChevronDownIcon
                aria-hidden="true"
                className={`size-4 transition-transform ${closed ? "" : "rotate-180"}`}
              />
            </button>
          </>
        )}
      </div>
      {!closed && (
        <div id={`${id}-items`}>
          {!items.length ? (
            <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
              {t("emptyStage")}
            </p>
          ) : groupByCategory && stage ? (
            used.map((category) => (
              <div key={category.id} className="mt-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
                  <span className="bg-brand-50 text-brand-500 dark:bg-brand-950 flex size-8 items-center justify-center rounded-lg">
                    <CategoryIcon category={category} className="size-4" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {category.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCreate(category.id)}
                    className="text-brand-600 dark:text-brand-400 text-xs font-semibold"
                  >
                    {t("addInCategory")}
                  </button>
                </div>
                {items
                  .filter((item) => item.category_id === category.id)
                  .map(renderCard)}
              </div>
            ))
          ) : (
            items.map(renderCard)
          )}
        </div>
      )}
    </section>
  );
}
