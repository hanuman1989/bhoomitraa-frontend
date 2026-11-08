"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Badge from "@/components/admin/ui/badge/Badge";
import type { TimelineActivity } from "@/types/admin/farmerSmartTimeline";

export default function TimelineActivityDetails({
  activity,
  formatDate,
  onClose,
}: {
  activity: TimelineActivity;
  formatDate: (date: string | null) => string;
  onClose: () => void;
}) {
  const t = useTranslations("farmerSmartTimeline");
  return (
    <Dialog open onClose={onClose} className="relative z-99999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="shadow-theme-xl w-full max-w-2xl space-y-5 rounded-2xl bg-white p-6 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <DialogTitle className="min-w-0 flex-1 text-xl font-semibold text-gray-950 dark:text-white">
                {activity.title ?? t("recordId", { id: activity.template_id })}
              </DialogTitle>
              <Badge color="info">{t("previewOnly")}</Badge>
            </div>
            <Description className="text-sm text-gray-500 dark:text-gray-400">
              {t("activity.readOnly")}
            </Description>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  {t("activity.category")}
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {activity.category_name ??
                    t("recordId", { id: activity.category_id })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  {t("activity.stage")}
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {activity.crop_stage_name ??
                    (activity.crop_stage_id
                      ? t("recordId", { id: activity.crop_stage_id })
                      : t("notAvailable"))}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  {t("activity.schedule")}
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {t("activity.scheduleRange", {
                    schedule: t(`schedule.${activity.schedule_type}`),
                    min: activity.start_day,
                    max: activity.end_day,
                  })}
                  <p className="mt-1">
                    {t("dateRange", {
                      start: formatDate(activity.start_date),
                      end: formatDate(activity.end_date),
                    })}
                  </p>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  {t("activity.priority")}
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">
                  {t(`priorities.${activity.priority}`)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  {t("activity.status")}
                </dt>
                <dd className="mt-1">
                  <Badge color="primary">
                    {t(`statuses.${activity.status}`)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  {t("activity.source")}
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/admin/knowledge-sources/${activity.source_id}`}
                    className="text-brand-500 dark:text-brand-300 hover:underline"
                  >
                    {activity.source.title}
                  </Link>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {activity.source.publisher}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.source.reference_identifier}
                  </p>
                </dd>
              </div>
            </dl>
            <section className="border-t border-gray-100 pt-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("activity.description")}
              </h3>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                {activity.description ?? t("activity.noDescription")}
              </p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("activity.instructions")}
              </h3>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                {activity.instructions ?? t("activity.noInstructions")}
              </p>
            </section>
            <div className="flex justify-end">
              <button
                type="button"
                data-autofocus
                onClick={onClose}
                className="focus-visible:outline-brand-500 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {t("close")}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
