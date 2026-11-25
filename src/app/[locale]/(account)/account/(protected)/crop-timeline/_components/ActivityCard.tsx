"use client";
import { useTranslations } from "next-intl";
import { CheckLineIcon, ChevronDownIcon, InfoIcon } from "@/icons";
import type { TimelineActivity } from "@/types/account/cropTimeline";
import { useTimelineActions } from "./TimelineActions";
import { IconTile } from "./CategoryIcon";
import ActivityDetails from "./ActivityDetails";

const whenTones = {
  due: "font-semibold text-warning-700 dark:text-warning-300",
  late: "font-semibold text-error-700 dark:text-error-300",
} as const;

const pills = {
  pending:
    "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_progress:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-800 dark:bg-warning-950 dark:text-warning-300",
  completed: "border-success-700 bg-success-700 text-white",
  information:
    "border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-800 dark:bg-blue-light-950 dark:text-blue-light-300",
} as const;

const chip =
  "text-theme-xs rounded-full border px-2 py-0.5 font-medium whitespace-nowrap";

/** Round tick: mark done, or (when completed) ask to reopen. Information activities show an info icon. */
function StatusTick({ activity }: { activity: TimelineActivity }) {
  const t = useTranslations("farmerCropTimeline.activity");
  const actions = useTimelineActions();
  const title = activity.title ?? "";
  if (!activity.flags.allow_status_update || !activity.status)
    return (
      <span
        title={t("informationOnly")}
        className="flex size-11 shrink-0 items-center justify-center text-gray-400"
      >
        <InfoIcon aria-hidden="true" className="size-5" />
        <span className="sr-only">{t("informationOnly")}</span>
      </span>
    );
  const completed = activity.status === "completed";
  return (
    <button
      type="button"
      disabled={!actions.editable || actions.busyId === activity.id}
      onClick={() =>
        completed ? actions.askReopen(activity) : actions.complete(activity)
      }
      aria-label={t(completed ? "reopenTick" : "markDone", { title })}
      className="group focus-visible:outline-success-600 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 disabled:cursor-not-allowed"
    >
      <span
        className={`flex size-8 items-center justify-center rounded-full border-2 transition ${completed ? "border-success-700 bg-success-700 text-white" : activity.status === "in_progress" ? "border-warning-500 group-hover:border-success-600 bg-white dark:bg-gray-900" : "group-hover:border-success-600 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"}`}
      >
        {completed ? (
          <CheckLineIcon aria-hidden="true" className="size-4" />
        ) : (
          activity.status === "in_progress" && (
            <span className="bg-warning-500 size-3 rounded-full" />
          )
        )}
      </span>
    </button>
  );
}

/** Collapsed activity row; expands into the full details. */
export default function ActivityCard({
  activity,
}: {
  activity: TimelineActivity;
}) {
  const t = useTranslations("farmerCropTimeline.activity");
  const actions = useTimelineActions();
  const open = actions.isOpen(activity.id);
  const title = activity.title ?? "";
  const done = activity.status === "completed";
  return (
    <article
      id={`timeline-activity-${activity.id}`}
      aria-labelledby={`timeline-activity-${activity.id}-title`}
      className={`scroll-mt-24 rounded-2xl border bg-white transition-colors dark:bg-gray-900 ${open ? "border-success-600 dark:border-success-500 border-2 p-3 sm:p-4" : "border-gray-200 p-2.5 sm:p-3 dark:border-gray-700"} ${done && !open ? "bg-gray-50/60 dark:bg-gray-900" : ""}`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <StatusTick activity={activity} />
        <IconTile
          icon={activity.category?.icon}
          tone={activity.category?.tone}
          className="hidden size-10.5 rounded-xl sm:flex"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-theme-xs ${activity.when_tone ? whenTones[activity.when_tone] : "text-gray-600 dark:text-gray-400"}`}
          >
            {activity.when_label}
          </p>
          <h4
            id={`timeline-activity-${activity.id}-title`}
            className="text-base font-semibold text-gray-950 dark:text-white"
          >
            {title}
          </h4>
          {activity.other_title && (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {activity.other_title}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {activity.category?.name && (
              <span
                className={`${chip} border-success-200 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-950 dark:text-success-300`}
              >
                {activity.category.name}
              </span>
            )}
            <span
              className={`${chip} border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300`}
            >
              {activity.type_label}
            </span>
            {activity.priority === "high" && (
              <span
                className={`${chip} border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300`}
              >
                {activity.priority_label}
              </span>
            )}
            {activity.is_rescheduled && (
              <span
                className={`${chip} border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-800 dark:bg-blue-light-950 dark:text-blue-light-300`}
              >
                {t("moved")}
              </span>
            )}
          </div>
        </div>
        <span
          className={`${chip} hidden sm:inline-block ${pills[activity.status ?? "information"]}`}
        >
          {activity.status_label ?? activity.type_label}
        </span>
        <button
          type="button"
          onClick={() => actions.toggle(activity.id)}
          aria-expanded={open}
          aria-controls={`timeline-activity-${activity.id}-details`}
          aria-label={t(open ? "collapse" : "expand", { title })}
          className="focus-visible:outline-success-600 flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ChevronDownIcon
            aria-hidden="true"
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {activity.status_label && (
        <span
          className={`${chip} mt-2 inline-block sm:hidden ${pills[activity.status ?? "information"]}`}
        >
          {activity.status_label}
        </span>
      )}
      {open && (
        <div id={`timeline-activity-${activity.id}-details`}>
          <ActivityDetails activity={activity} />
        </div>
      )}
    </article>
  );
}
