"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StageTimelineListItem } from "@/types/admin/cropStageTimeline";
import type { BuilderStage, DayWindow } from "./types";
import BuilderDialog from "./BuilderDialog";

/** Read-only view of the active Stage Timeline records for one stage. */
export default function StageTimelinesDialog({
  stage,
  timelines,
  formatWindow,
  onClose,
}: {
  stage?: BuilderStage;
  timelines: StageTimelineListItem[];
  formatWindow: (window: DayWindow) => string;
  onClose: () => void;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const windows = new Set(
    timelines.map(
      ({ days_after_sowing_min, days_after_sowing_max }) =>
        `${days_after_sowing_min}-${days_after_sowing_max}`,
    ),
  );
  return (
    <BuilderDialog
      title={t("stageDialog.title")}
      description={stage?.name ?? stage?.code}
      onClose={onClose}
      wide
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("stageDialog.summary", {
          records: timelines.length,
          windows: windows.size,
        })}
      </p>
      {windows.size > 1 && (
        <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-lg p-3 text-sm">
          {t("stageDialog.multiple")}
        </p>
      )}
      {timelines.length ? (
        timelines.map((timeline) => (
          <section
            key={timeline.id}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {formatWindow({
                min: timeline.days_after_sowing_min,
                max: timeline.days_after_sowing_max,
              })}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {timeline.variety_scope === "all"
                ? tt("applicability.allVarieties")
                : timeline.varieties.map(({ name }) => name).join(", ")}
              {" · "}
              {timeline.season_scope === "all"
                ? tt("applicability.allSeasons")
                : timeline.seasons.map(({ name }) => name).join(", ")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("stageDialog.sources", {
                count: timeline.knowledge_sources.length,
              })}{" "}
              <Link
                href={`/admin/crop-stage-timelines/${timeline.id}/edit`}
                className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
              >
                {t("stageDialog.regions")}
              </Link>
            </p>
          </section>
        ))
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700">
          {t("stageDialog.empty")}
        </p>
      )}
      <p className="bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300 rounded-lg p-3 text-xs">
        {t("stageDialog.note")}
      </p>
    </BuilderDialog>
  );
}
