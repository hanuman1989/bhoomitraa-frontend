import type { TimelineSection } from "@/types/account/cropTimeline";
import CategoryIcon from "./CategoryIcon";

const states = {
  current:
    "bg-success-700 text-white ring-success-700 dark:bg-success-600 dark:ring-success-600",
  past: "bg-success-50 text-success-700 ring-success-200 dark:bg-success-950 dark:text-success-300 dark:ring-success-800",
  future:
    "bg-blue-light-50 text-blue-light-600 ring-blue-light-200 dark:bg-blue-light-950 dark:text-blue-light-300 dark:ring-blue-light-800",
} as const;

/**
 * Rail marker: one category shows its icon; several show the layers icon with
 * a strip of up to three category icons and "+N". Past stages are green,
 * the current stage is solid green and future stages are blue.
 */
export default function TimelineMarker({
  section,
  label,
}: {
  section: TimelineSection;
  label: string;
}) {
  const state =
    section.stage?.state ??
    (section.type === "before_sowing" ? "past" : "future");
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`absolute -start-11 top-3.5 flex size-9 items-center justify-center rounded-xl border-3 border-gray-50 ring-1 sm:-start-18.5 sm:top-3 sm:size-13.5 sm:rounded-2xl sm:border-4 dark:border-gray-950 ${states[state]}`}
    >
      <CategoryIcon icon={section.marker.icon} className="size-4.5 sm:size-6" />
      {section.marker.icons.length > 0 && (
        <span className="shadow-theme-xs absolute top-full mt-1 hidden items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5 text-gray-600 sm:flex dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          {section.marker.icons.map((icon) => (
            <CategoryIcon key={icon} icon={icon} className="size-3.5" />
          ))}
          {section.marker.more > 0 && (
            <span className="text-theme-xs px-0.5 leading-none font-semibold">
              +{section.marker.more}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
