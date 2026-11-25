"use client";
import type { TimelineActivity } from "@/types/account/cropTimeline";
import ActivityCard from "./ActivityCard";

/** Calendar-list view: activities by start date, grouped under the month headings the API provides. */
export default function TimelineCalendarList({
  activities,
}: {
  activities: TimelineActivity[];
}) {
  const sorted = [...activities].sort(
    (a, b) =>
      a.start_date.localeCompare(b.start_date) ||
      a.end_date.localeCompare(b.end_date) ||
      a.id - b.id,
  );
  const months: { key: string; label: string; items: TimelineActivity[] }[] =
    [];
  for (const activity of sorted) {
    const last = months.at(-1);
    if (last?.key === activity.month_key) last.items.push(activity);
    else
      months.push({
        key: activity.month_key,
        label: activity.month_label,
        items: [activity],
      });
  }
  return (
    <div className="space-y-5">
      {months.map((month) => (
        <section
          key={month.key}
          aria-labelledby={`timeline-month-${month.key}`}
        >
          <h3
            id={`timeline-month-${month.key}`}
            className="mb-2 text-sm font-bold tracking-wide text-gray-600 dark:text-gray-300"
          >
            {month.label}
          </h3>
          <div className="space-y-2.5">
            {month.items.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
