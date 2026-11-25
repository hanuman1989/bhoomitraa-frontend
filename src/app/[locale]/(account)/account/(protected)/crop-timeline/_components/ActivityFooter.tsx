"use client";
import { useTranslations } from "next-intl";
import { CalenderIcon, CheckLineIcon, ReopenIcon } from "@/icons";
import type { TimelineActivity } from "@/types/account/cropTimeline";
import { cropButton, cropPrimary } from "../../crops/_components/CropUi";
import { useTimelineActions } from "./TimelineActions";

const statusTones = {
  pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress:
    "bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300",
  completed:
    "bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300",
} as const;

/** Reschedule (when enabled and not completed), status line and Mark as done / Reopen. */
export default function ActivityFooter({
  activity,
}: {
  activity: TimelineActivity;
}) {
  const t = useTranslations("farmerCropTimeline");
  const actions = useTimelineActions();
  const disabled = !actions.editable || actions.busyId === activity.id;
  const completed = activity.status === "completed";
  const reschedule = activity.flags.allow_rescheduling && !completed && (
    <button
      type="button"
      disabled={disabled}
      onClick={() => actions.reschedule(activity)}
      className={`${cropButton} min-h-11`}
    >
      <CalenderIcon aria-hidden="true" className="size-4" />
      {t("footer.reschedule")}
    </button>
  );
  if (!activity.flags.allow_status_update || !activity.status)
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
        {reschedule || (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("activity.infoFooter")}
          </p>
        )}
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
      {reschedule}
      <div className="ms-auto flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${statusTones[activity.status]}`}
        >
          {completed && <CheckLineIcon aria-hidden="true" className="size-4" />}
          {activity.status_line}
        </span>
        {completed ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => actions.askReopen(activity)}
            className={`${cropButton} min-h-11`}
          >
            <ReopenIcon aria-hidden="true" className="size-4" />
            {t("footer.reopen")}
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => actions.complete(activity)}
            className={`${cropPrimary} min-h-11`}
          >
            <CheckLineIcon aria-hidden="true" className="size-4" />
            {t("footer.markDone")}
          </button>
        )}
      </div>
    </div>
  );
}
