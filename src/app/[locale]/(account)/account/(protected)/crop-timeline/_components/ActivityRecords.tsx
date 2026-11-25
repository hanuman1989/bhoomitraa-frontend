"use client";
import type { ComponentType, SVGProps } from "react";
import { useTranslations } from "next-intl";
import {
  CameraIcon,
  CheckLineIcon,
  ChevronDownIcon,
  GroupIcon,
  PencilIcon,
  RupeeIcon,
  TrashBinIcon,
} from "@/icons";
import type {
  ActivityRecordType,
  TimelineActivity,
} from "@/types/account/cropTimeline";
import { useTimelineActions } from "./TimelineActions";
import { AccordionChip } from "./ActivityAccordion";

const recordButtons: {
  type: ActivityRecordType;
  flag: keyof TimelineActivity["flags"];
  label: "addNote" | "addExpense" | "addLabour" | "addPhoto";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { type: "notes", flag: "allow_notes", label: "addNote", icon: PencilIcon },
  {
    type: "expenses",
    flag: "allow_expenses",
    label: "addExpense",
    icon: RupeeIcon,
  },
  { type: "labour", flag: "allow_labour", label: "addLabour", icon: GroupIcon },
  {
    type: "photos",
    flag: "allow_attachments",
    label: "addPhoto",
    icon: CameraIcon,
  },
];

/** "Record for this activity": one button per enabled record type, plus the notes list. */
export default function ActivityRecords({
  activity,
}: {
  activity: TimelineActivity;
}) {
  const t = useTranslations("farmerCropTimeline.records");
  const actions = useTimelineActions();
  const buttons = recordButtons.filter((item) => activity.flags[item.flag]);
  if (!buttons.length) return null;
  const open = actions.isPanelOpen(activity.id, "records");
  const panelId = `activity-${activity.id}-records`;
  const disabled = !actions.editable || actions.busyId === activity.id;
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => actions.togglePanel(activity.id, "records")}
        className="focus-visible:outline-success-600 flex min-h-12 w-full flex-wrap items-center gap-2 bg-gray-50 px-3 py-2 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 dark:bg-gray-800"
      >
        <PencilIcon
          aria-hidden="true"
          className="text-success-700 dark:text-success-300 size-4.5"
        />
        <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </span>
        <AccordionChip>
          {t("count", { count: activity.records_total })}
        </AccordionChip>
        {activity.record_types_remaining > 0 ? (
          <AccordionChip tone="amber">
            {t("remaining", { count: activity.record_types_remaining })}
          </AccordionChip>
        ) : (
          <AccordionChip tone="green">{t("allDone")}</AccordionChip>
        )}
        <ChevronDownIcon
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={panelId} className="space-y-3 p-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {buttons.map(({ type, label, icon: Icon }) => {
              const count = activity.records[type];
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    type === "notes"
                      ? actions.addNote(activity)
                      : actions.placeholder(activity, type)
                  }
                  className={`focus-visible:outline-success-600 relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${count > 0 ? "border-success-300 bg-success-50 text-success-800 dark:border-success-800 dark:bg-success-950 dark:text-success-200" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"}`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {t(label)}
                  {count > 0 && (
                    <>
                      <span className="text-theme-xs bg-success-100 dark:bg-success-900 rounded-full px-1.5 font-semibold">
                        {count}
                        <span className="sr-only">
                          {" "}
                          {t("recorded", { count })}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="bg-success-700 absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-white"
                      >
                        <CheckLineIcon className="size-3" />
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {activity.notes.length > 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-theme-xs border-b border-gray-200 bg-gray-50 px-3 py-1.5 font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {t("notes")}
              </h4>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {activity.notes.map((note) => (
                  <li
                    key={note.id}
                    className="flex items-start gap-3 px-3 py-2 text-sm"
                  >
                    <span className="text-theme-xs w-14 shrink-0 pt-0.5 text-gray-500 dark:text-gray-400">
                      {note.date_label}
                    </span>
                    <p className="min-w-0 flex-1 break-words whitespace-pre-line text-gray-800 dark:text-gray-200">
                      {note.text}
                    </p>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => actions.askDeleteNote(activity, note)}
                      aria-label={t("deleteNote", { date: note.date_label })}
                      className="hover:text-error-600 focus-visible:outline-success-600 -my-1.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 focus-visible:outline-2 disabled:opacity-40 dark:text-gray-400"
                    >
                      <TrashBinIcon aria-hidden="true" className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("nothingYet")}{" "}
              {activity.status === "pending" && t("firstRecordHint")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
