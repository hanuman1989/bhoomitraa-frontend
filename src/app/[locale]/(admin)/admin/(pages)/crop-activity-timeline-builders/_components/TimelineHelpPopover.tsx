"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CloseLineIcon, InfoIcon } from "@/icons";
import type { BuilderConfig } from "./types";
import type { BuilderStats } from "./ConfigurationSummary";

const actionClass =
  "rounded-lg border border-gray-300 h-9 px-4 text-sm font-medium text-gray-700 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300";

export interface HelpProps {
  config: BuilderConfig | null;
  stats: BuilderStats;
  onCreate: () => void;
  onIncomplete: () => void;
  onExport: () => void;
  onLanguages: () => void;
}

export default function TimelineHelpPopover({
  config,
  stats,
  onCreate,
  onIncomplete,
  onExport,
  onLanguages,
}: HelpProps) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const row = (label: string, value: string | number) => (
    <div className="flex justify-between gap-3 border-b border-gray-100 py-2 text-xs last:border-0 dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <b className="text-end text-gray-800 dark:text-gray-200">{value}</b>
    </div>
  );
  const app = config?.app;
  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="builder-help"
        aria-label={t("help.open")}
        className="flex size-11 items-center justify-center rounded-lg border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
      >
        <InfoIcon aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <div
          id="builder-help"
          role="dialog"
          aria-label={t("help.title")}
          className="shadow-theme-lg absolute end-0 top-full z-999 mt-2 max-h-screen w-96 max-w-screen overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t("help.title")}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="rounded-lg p-1 text-gray-500"
            >
              <CloseLineIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t("help.configuration")}
          </h3>
          {config && app ? (
            <>
              {row(t("fields.crop"), config.crop.label)}
              {row(
                t("fields.varieties"),
                app.variety_scope === "all"
                  ? tt("applicability.allVarieties")
                  : t("selectedCount", { count: app.crop_variety_ids.length }),
              )}
              {row(
                t("fields.seasons"),
                app.season_scope === "all"
                  ? tt("applicability.allSeasons")
                  : t("selectedCount", { count: app.season_ids.length }),
              )}
              {row(
                t("fields.regions"),
                app.region_scope === "all"
                  ? t("allRegions")
                  : t("districtCount", { count: app.region_ids.length }),
              )}
              {row(t("fields.sources"), app.knowledge_source_ids.length)}
            </>
          ) : (
            <p className="text-xs text-gray-500">{t("configureFirst")}</p>
          )}
          <h3 className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t("help.coverage")}
          </h3>
          {row(
            t("help.stagesWithActivities"),
            `${stats.stagesWithActivities}/${stats.stages}`,
          )}
          {row(
            t("help.stagesWithTiming"),
            `${stats.stagesWithTiming}/${stats.stages}`,
          )}
          {row(
            t("stats.configured"),
            `${stats.configured}/${stats.activities}`,
          )}
          <progress
            value={stats.configured}
            max={stats.activities || 1}
            aria-label={t("stats.configured")}
            className="accent-brand-500 my-2 block h-2 w-full"
          />
          {row(t("help.exceptions"), stats.exceptions)}
          <h3 className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t("help.operations")}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={run(onCreate)}
              className={actionClass}
            >
              {t("addActivity")}
            </button>
            <button
              type="button"
              onClick={run(onIncomplete)}
              className={actionClass}
            >
              {t("stats.incomplete")}
            </button>
            <button
              type="button"
              onClick={run(onExport)}
              className={actionClass}
            >
              {t("help.export")}
            </button>
            <button
              type="button"
              disabled
              title={t("help.importUnavailable")}
              className={actionClass}
            >
              {t("help.import")}
            </button>
            <button
              type="button"
              onClick={run(onLanguages)}
              className={actionClass}
            >
              {t("help.languages")}
            </button>
          </div>
          <p className="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 mt-3 rounded-lg p-3 text-xs">
            {t("help.note")}
          </p>
        </div>
      )}
    </div>
  );
}
