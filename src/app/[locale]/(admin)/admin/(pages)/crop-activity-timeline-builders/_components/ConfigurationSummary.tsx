"use client";

import { useTranslations } from "next-intl";
import ImagePreview from "@/components/common/ImagePreview";
import { CheckCircleIcon, ListIcon, SproutIcon, AlertIcon } from "@/icons";
import type { BuilderConfig, BuilderWorkspace } from "./types";
import { buttonClass, primaryClass } from "./BuilderDialog";

export interface BuilderStats {
  stages: number;
  activities: number;
  configured: number;
  incomplete: number;
  stagesWithActivities: number;
  stagesWithTiming: number;
  exceptions: number;
}

export default function ConfigurationSummary({
  config,
  workspace,
  sources,
  stats,
  onEdit,
  onCreate,
}: {
  config: BuilderConfig;
  workspace: BuilderWorkspace | null;
  sources: number;
  stats: BuilderStats;
  onEdit: () => void;
  onCreate: () => void;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const names = (
    options: { id: number; name: string | null }[],
    ids: number[],
  ) =>
    ids
      .map((id) => options.find((option) => option.id === id)?.name ?? `#${id}`)
      .join(", ");
  const { app } = config;
  return (
    <section
      id="builder-configuration"
      className="shadow-theme-xs mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          {workspace?.crop.image_url ? (
            <ImagePreview
              src={workspace.crop.image_url}
              alt={workspace.crop.name ?? config.crop.label}
              width={80}
              height={80}
              className="size-full object-cover"
            />
          ) : (
            <SproutIcon
              aria-hidden="true"
              className="text-brand-500 m-5 size-10"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {workspace?.crop.name ?? config.crop.label}
          </h2>
          <p className="font-medium text-gray-700 dark:text-gray-300">
            {app.variety_scope === "all"
              ? tt("applicability.allVarieties")
              : names(workspace?.varieties ?? [], app.crop_variety_ids)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("summaryLine", {
              seasons:
                app.season_scope === "all"
                  ? tt("applicability.allSeasons")
                  : names(workspace?.seasons ?? [], app.season_ids),
              regions:
                app.region_scope === "all"
                  ? t("allRegions")
                  : t("districtCount", { count: app.region_ids.length }),
              sources,
            })}
          </p>
        </div>
        <button type="button" onClick={onEdit} className={buttonClass}>
          {t("editConfiguration")}
        </button>
        <button type="button" onClick={onCreate} className={primaryClass}>
          {t("createActivity")}
        </button>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            [SproutIcon, stats.stages, t("stats.stages")],
            [ListIcon, stats.activities, t("stats.activities")],
            [CheckCircleIcon, stats.configured, t("stats.configured")],
            [AlertIcon, stats.incomplete, t("stats.incomplete")],
          ] as const
        ).map(([Icon, value, label]) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <dd className="text-title-sm font-bold text-gray-900 dark:text-white">
                {value}
              </dd>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                {label}
              </dt>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
