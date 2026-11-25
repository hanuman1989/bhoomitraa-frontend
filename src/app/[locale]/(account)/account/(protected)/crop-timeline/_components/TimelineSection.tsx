"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "@/icons";
import type { TimelineSection as Section } from "@/types/account/cropTimeline";
import TimelineMarker from "./TimelineMarker";

/**
 * One rail entry. Before Sowing and After Harvesting sections hold a single
 * activity; growth stages show sequence, names, day range, progress and a
 * collapse toggle.
 */
export default function TimelineSection({
  section,
  open,
  onToggle,
  visibleCount,
  children,
}: {
  section: Section;
  open: boolean;
  onToggle: () => void;
  visibleCount: number;
  children: ReactNode;
}) {
  const t = useTranslations("farmerCropTimeline.stage");
  const stage = section.stage;
  const current = stage?.state === "current";
  const growth = section.type === "growth_stage";
  const headingId = `timeline-section-${section.key.replace(/\W/g, "-")}`;
  const name = section.title ?? "";
  return (
    <section
      aria-labelledby={headingId}
      className={`relative mb-4 rounded-2xl border bg-white p-3 sm:mb-5 sm:p-4 dark:bg-gray-900 ${current ? "border-success-300 ring-success-50 dark:border-success-700 dark:ring-success-950 ring-3" : "border-gray-200 dark:border-gray-800"}`}
    >
      <span
        aria-hidden="true"
        className="absolute -start-3 top-8 h-0.5 w-3 bg-gray-300 sm:-start-5.5 sm:top-10 sm:w-5 dark:bg-gray-700"
      />
      <TimelineMarker
        section={section}
        label={
          growth && stage?.sequence_label
            ? `${stage.sequence_label}: ${name}`
            : name
        }
      />
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          {growth && stage?.sequence_label && (
            <p className="text-theme-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {stage.sequence_label}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3
              id={headingId}
              className="text-lg font-semibold text-gray-950 dark:text-white"
            >
              {name}
            </h3>
            {section.other_title && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {section.other_title}
              </span>
            )}
            {current && (
              <span className="bg-success-700 text-theme-xs rounded-full px-2.5 py-0.5 font-semibold text-white">
                {t("youAreHere")}
              </span>
            )}
          </div>
          {stage?.range_label && (
            <p className="text-theme-sm mt-0.5 text-gray-500 dark:text-gray-400">
              {stage.range_label}
            </p>
          )}
        </div>
        {growth && (
          <>
            <span className="text-theme-xs rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {t("activities", { count: section.activity_count })}
            </span>
            {section.total_count > 0 && (
              <div className="flex items-center gap-2">
                <div
                  role="img"
                  aria-label={t("progress", {
                    done: section.done_count,
                    total: section.total_count,
                  })}
                  className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                >
                  <div
                    className="bg-success-600 h-full rounded-full transition-all"
                    style={{
                      width: `${(section.done_count / section.total_count) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {t("done", {
                    done: section.done_count,
                    total: section.total_count,
                  })}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-label={t(open ? "collapse" : "expand", { name })}
              className="focus-visible:outline-success-600 flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ChevronDownIcon
                aria-hidden="true"
                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </>
        )}
      </div>
      {(open || !growth) &&
        (visibleCount > 0 ? (
          <div className="mt-2 space-y-2.5">{children}</div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("noActivities")}
          </p>
        ))}
    </section>
  );
}
