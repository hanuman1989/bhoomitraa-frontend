"use client";
import { useTranslations } from "next-intl";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckLineIcon,
  ChevronDownIcon,
} from "@/icons";
import type { TimelineActivity } from "@/types/account/cropTimeline";
import { useTimelineActions } from "./TimelineActions";
import { AccordionChip } from "./ActivityAccordion";
import { IconTile } from "./CategoryIcon";

/** One card per smart action configured on the activity template. */
export default function ActivitySmartActions({
  activity,
}: {
  activity: TimelineActivity;
}) {
  const t = useTranslations("farmerCropTimeline.smartActions");
  const actions = useTimelineActions();
  if (!activity.smart_actions.length) return null;
  const open = actions.isPanelOpen(activity.id, "actions");
  const panelId = `activity-${activity.id}-smart-actions`;
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => actions.togglePanel(activity.id, "actions")}
        className="focus-visible:outline-success-600 flex min-h-12 w-full flex-wrap items-center gap-2 bg-gray-50 px-3 py-2 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 dark:bg-gray-800"
      >
        <span className="bg-theme-purple-500/10 text-theme-purple-500 flex size-7 items-center justify-center rounded-lg">
          <BoltIcon aria-hidden="true" className="size-4" />
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </span>
        <AccordionChip>
          {t("tools", { count: activity.smart_actions.length })}
        </AccordionChip>
        {activity.tools_remaining > 0 && (
          <AccordionChip tone="amber">
            {t("remaining", { count: activity.tools_remaining })}
          </AccordionChip>
        )}
        <ChevronDownIcon
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={panelId}
          className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {activity.smart_actions.map((action) => {
            const used = action.used_at_label !== null;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => actions.smartAction(activity, action)}
                className={`focus-visible:outline-success-600 flex min-h-15 w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition focus-visible:outline-2 focus-visible:outline-offset-2 ${used ? "border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-950" : "hover:border-success-400 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}
              >
                <IconTile
                  icon={action.icon}
                  tone={action.tone}
                  className="size-9 rounded-lg"
                  iconClassName="size-4.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {action.label}
                  </span>
                  <span
                    className={`text-theme-xs block ${used ? "text-success-700 dark:text-success-300" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {used
                      ? t("used", { date: action.used_at_label ?? "" })
                      : action.description}
                  </span>
                </span>
                {used ? (
                  <span className="bg-success-700 flex size-6 shrink-0 items-center justify-center rounded-full text-white">
                    <CheckLineIcon aria-hidden="true" className="size-3.5" />
                  </span>
                ) : (
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-gray-400 rtl:rotate-180"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
