"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  CalenderIcon,
  CheckLineIcon,
  MapLayersIcon,
  SproutIcon,
} from "@/icons";
import type { TimelineCrop, TimelineStats } from "@/types/account/cropTimeline";
import { CropImage } from "../../crops/_components/CropUi";

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${highlight ? "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-800 dark:bg-warning-950 dark:text-warning-300" : "border-gray-200 dark:border-gray-700"}`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${highlight ? "bg-white dark:bg-gray-900" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl leading-tight font-bold">{value}</p>
        <p
          className={`text-theme-sm ${highlight ? "" : "text-gray-500 dark:text-gray-400"}`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

/** Crop summary card with dates and the four stat tiles. */
export default function TimelineSummary({
  crop,
  stats,
}: {
  crop: TimelineCrop;
  stats: TimelineStats;
}) {
  const t = useTranslations("farmerCropTimeline.summary");
  return (
    <section
      aria-label={t("label")}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center gap-4">
        <CropImage
          src={crop.image}
          name={crop.name}
          className="size-16 rounded-xl sm:size-18"
        />
        <div className="min-w-0 flex-1 basis-60">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            {crop.name}
            {crop.other_name && (
              <span className="ms-2 text-base font-medium text-gray-500 dark:text-gray-400">
                · {crop.other_name}
              </span>
            )}
          </h3>
          <p className="font-semibold text-gray-600 dark:text-gray-300">
            {[crop.variety, crop.season].filter(Boolean).join(" · ")}
          </p>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {[crop.farm, crop.area_label, crop.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crop.days && (
            <InfoTile label={crop.days.label} value={crop.days.value} />
          )}
          {crop.sowing_date_label && (
            <InfoTile label={t("sowingDate")} value={crop.sowing_date_label} />
          )}
          {crop.expected_harvest_label && (
            <InfoTile
              label={t("expectedHarvest")}
              value={crop.expected_harvest_label}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat
          icon={<SproutIcon aria-hidden="true" className="size-5" />}
          value={stats.growth_stages}
          label={t("growthStages")}
        />
        <Stat
          icon={<MapLayersIcon aria-hidden="true" className="size-5" />}
          value={stats.activities}
          label={t("activities")}
        />
        <Stat
          highlight
          icon={<CalenderIcon aria-hidden="true" className="size-5" />}
          value={stats.due_now}
          label={
            stats.late > 0 ? t("dueNowLate", { late: stats.late }) : t("dueNow")
          }
        />
        <Stat
          icon={
            <CheckLineIcon
              aria-hidden="true"
              className="text-success-700 dark:text-success-300 size-5"
            />
          }
          value={t("completedValue", {
            completed: stats.completed,
            total: stats.total_tasks,
          })}
          label={t("completed")}
        />
      </div>
    </section>
  );
}
