"use client";
import { useTranslations } from "next-intl";
import type { TimelineActivity } from "@/types/account/cropTimeline";
import ActivityRecords from "./ActivityRecords";
import ActivitySmartActions from "./ActivitySmartActions";
import ActivityFooter from "./ActivityFooter";

const lastTileTones = {
  time_left:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-800 dark:bg-warning-950 dark:text-warning-300",
  window_ended:
    "border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300",
  completed_on:
    "border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-950 dark:text-success-300",
  starts_in: "",
  window: "",
} as const;

function Tile({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${tone || "border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"}`}
    >
      <dt className="text-theme-xs opacity-75">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

/** Expanded activity: schedule tiles, admin instructions, records, smart actions and footer. */
export default function ActivityDetails({
  activity,
}: {
  activity: TimelineActivity;
}) {
  const t = useTranslations("farmerCropTimeline.activity");
  return (
    <div className="mt-3 space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
      <dl
        aria-label={t("details")}
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      >
        <Tile label={t("schedule")} value={activity.schedule_label} />
        <Tile label={t("startDate")} value={activity.start_date_label} />
        <Tile label={t("endDate")} value={activity.end_date_label} />
        <Tile
          label={activity.last_tile.label}
          value={activity.last_tile.value}
          tone={lastTileTones[activity.last_tile.key]}
        />
      </dl>
      <div className="border-blue-light-200 bg-blue-light-50 dark:border-blue-light-800 rounded-lg border px-3 py-2.5 dark:bg-gray-800">
        <p className="text-blue-light-700 dark:text-blue-light-300 text-theme-xs font-semibold">
          {t(activity.type === "information" ? "goodToKnow" : "whatToDo")}
        </p>
        <p className="mt-1 text-sm whitespace-pre-line text-gray-800 dark:text-gray-200">
          {activity.instructions || t("noInstructions")}
        </p>
      </div>
      <ActivityRecords activity={activity} />
      <ActivitySmartActions activity={activity} />
      <ActivityFooter activity={activity} />
    </div>
  );
}
