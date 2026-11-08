"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import Badge from "@/components/admin/ui/badge/Badge";
import { useModal } from "@/hooks/useModal";
import {
  CalenderIcon,
  ClipboardListIcon,
  EyeIcon,
  SproutIcon,
  HarvestingIcon,
  LeafIcon,
} from "@/icons";
import type {
  TimelineActivity,
  TimelinePreviewData,
} from "@/types/admin/farmerSmartTimeline";
import { buildTimelineDisplayEvents } from "./timelineDisplay";
import TimelineSummary from "./TimelineSummary";
import TimelineActivityDetails from "./TimelineActivityDetails";

const stageStyles = [
  {
    marker: "bg-success-500",
    card: "bg-success-50 text-success-950 dark:bg-success-500/10 dark:text-success-100",
    badge:
      "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-300",
    Icon: SproutIcon,
  },
  {
    marker: "bg-blue-light-500",
    card: "bg-blue-light-50 text-blue-light-950 dark:bg-blue-light-500/10 dark:text-blue-light-100",
    badge:
      "bg-blue-light-100 text-blue-light-800 dark:bg-blue-light-500/20 dark:text-blue-light-300",
    Icon: LeafIcon,
  },
  {
    marker: "bg-theme-purple-500",
    card: "bg-theme-purple-500/10 text-gray-900 dark:text-gray-100",
    badge: "bg-theme-purple-500/15 text-theme-purple-500",
    Icon: SproutIcon,
  },
  {
    marker: "bg-orange-400",
    card: "bg-orange-50 text-orange-950 dark:bg-orange-500/10 dark:text-orange-100",
    badge:
      "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    Icon: LeafIcon,
  },
  {
    marker: "bg-theme-pink-500",
    card: "bg-theme-pink-500/10 text-gray-900 dark:text-gray-100",
    badge: "bg-theme-pink-500/15 text-theme-pink-500",
    Icon: HarvestingIcon,
  },
];

export default function TimelinePreview({
  data,
  loading,
  stale,
}: {
  data: TimelinePreviewData | null;
  loading: boolean;
  stale: boolean;
}) {
  const t = useTranslations("farmerSmartTimeline");
  const formatter = useFormatter();
  const { isOpen, openModal, closeModal } = useModal();
  const [selected, setSelected] = useState<{
    data: TimelinePreviewData;
    activity: TimelineActivity;
  } | null>(null);
  const formatDate = (value: string | null) =>
    value
      ? formatter.dateTime(new Date(`${value}T00:00:00Z`), {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : t("notAvailable");
  const events = data
    ? buildTimelineDisplayEvents(data.growth_stages, data.activities)
    : [];
  const subtitle = data
    ? t(
        data.selection.crop_variety_name
          ? "preview.selectionWithVariety"
          : "preview.selection",
        {
          crop:
            data.selection.crop_name ??
            t("recordId", { id: data.input.crop_id }),
          variety: data.selection.crop_variety_name ?? "",
          season:
            data.selection.season_name ??
            t("recordId", { id: data.input.season_id }),
          district:
            data.selection.district_name ??
            t("recordId", { id: data.input.district_id }),
          date: formatDate(data.input.sowing_date),
        },
      )
    : t("preview.introduction");
  return (
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-10">
      <section
        aria-labelledby="smart-timeline-preview-title"
        aria-busy={loading}
        className="shadow-theme-xs min-w-0 rounded-xl border border-gray-200 bg-white xl:col-span-7 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <SproutIcon
              aria-hidden="true"
              className="text-success-700 dark:text-success-400 mt-1 size-5 shrink-0"
            />
            <div className="min-w-0">
              <h2
                id="smart-timeline-preview-title"
                className="text-base font-semibold text-gray-950 dark:text-white"
              >
                {t("preview.title")}
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            </div>
          </div>
          <Badge
            color="info"
            size="sm"
            startIcon={<EyeIcon aria-hidden="true" className="size-3.5" />}
          >
            {t("previewOnly")}
          </Badge>
        </div>
        <div className="px-4 pb-5 sm:px-5">
          {loading ? (
            <div
              role="status"
              className="flex min-h-64 flex-col items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400"
            >
              <span
                aria-hidden="true"
                className="border-brand-100 border-t-brand-500 dark:border-brand-900 dark:border-t-brand-400 size-8 animate-spin rounded-full border-2"
              />
              {t("generating")}
            </div>
          ) : !data ? (
            <div
              role="status"
              className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 p-6 text-center dark:border-gray-700"
            >
              <CalenderIcon
                aria-hidden="true"
                className="text-brand-400 size-10"
              />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t(stale ? "preview.staleTitle" : "preview.initialTitle")}
              </h3>
              <p className="max-w-lg text-sm leading-6 text-gray-500 dark:text-gray-400">
                {t(stale ? "preview.stale" : "preview.initial")}
              </p>
            </div>
          ) : (
            <>
              {!events.length ? (
                <div
                  role="status"
                  className="rounded-lg border border-dashed border-gray-200 p-8 text-center dark:border-gray-700"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("preview.emptyTitle")}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t("preview.empty")}
                  </p>
                </div>
              ) : (
                <>
                  {!data.growth_stages.length && (
                    <p
                      role="status"
                      className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 mb-4 rounded-lg p-3 text-sm"
                    >
                      {t("preview.noStages")}
                    </p>
                  )}
                  {!data.activities.length && (
                    <p
                      role="status"
                      className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 mb-4 rounded-lg p-3 text-sm"
                    >
                      {t("preview.noActivities")}
                    </p>
                  )}
                  <ol
                    aria-label={t("preview.events")}
                    className="before:bg-brand-200 relative space-y-3 before:absolute before:inset-y-4 before:start-4.5 before:w-px dark:before:bg-gray-700"
                  >
                    {events.map((event) => {
                      if (event.type === "stage") {
                        const stage = event.stage;
                        const style =
                          stageStyles[event.colorIndex % stageStyles.length];
                        return (
                          <li
                            key={`stage-${stage.crop_stage_id}`}
                            className="relative flex items-start gap-3 pt-2"
                          >
                            <span
                              className={`relative flex size-9 shrink-0 items-center justify-center rounded-full text-white ring-4 ring-white dark:ring-gray-900 ${style.marker}`}
                            >
                              <style.Icon
                                aria-hidden="true"
                                className="size-5"
                              />
                            </span>
                            <div
                              className={`flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 ${style.card}`}
                            >
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold">
                                  {stage.name ??
                                    t("recordId", { id: stage.crop_stage_id })}
                                </h3>
                                <p className="mt-0.5 text-xs leading-5">
                                  {t("preview.expectedPeriod", {
                                    start: formatDate(stage.start_date),
                                    end: formatDate(stage.end_date),
                                    min: stage.start_day,
                                    max: stage.end_day,
                                  })}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}
                              >
                                {t("growthStage")}
                              </span>
                            </div>
                          </li>
                        );
                      }
                      const activity = event.activity;
                      const title =
                        activity.title ??
                        t("recordId", { id: activity.template_id });
                      return (
                        <li
                          key={`activity-${activity.template_id}`}
                          className="before:border-brand-200 relative ms-10 flex items-start gap-3 before:absolute before:-start-6 before:top-4 before:w-6 before:border-t dark:before:border-gray-700"
                        >
                          <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300 relative mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900">
                            <ClipboardListIcon
                              aria-hidden="true"
                              className="size-4"
                            />
                          </span>
                          <button
                            type="button"
                            aria-label={t("activity.open", { title })}
                            onClick={() => {
                              setSelected({ data, activity });
                              openModal();
                            }}
                            className="shadow-theme-xs hover:border-brand-200 hover:bg-gray-25 focus-visible:outline-brand-500 dark:hover:border-brand-800 min-w-0 flex-1 rounded-xl border border-gray-100 bg-white px-3 py-2 text-start focus-visible:outline-2 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                          >
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              <div className="min-w-0 flex-1 basis-48">
                                <h4 className="text-sm font-semibold text-gray-950 dark:text-gray-100">
                                  {title}
                                </h4>
                                <p className="mt-0.5 text-xs leading-5 text-gray-600 dark:text-gray-400">
                                  {t("activity.metadata", {
                                    category:
                                      activity.category_name ??
                                      t("recordId", {
                                        id: activity.category_id,
                                      }),
                                    schedule: t(
                                      `schedule.${activity.schedule_type}`,
                                    ),
                                    min: activity.start_day,
                                    max: activity.end_day,
                                  })}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200">
                                <CalenderIcon
                                  aria-hidden="true"
                                  className="size-4 shrink-0"
                                />
                                {t("dateRange", {
                                  start: formatDate(activity.start_date),
                                  end: formatDate(activity.end_date),
                                })}
                              </span>
                              <Badge color="primary" size="sm">
                                {t(`statuses.${activity.status}`)}
                              </Badge>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
            </>
          )}
        </div>
      </section>
      <TimelineSummary data={data} formatDate={formatDate} />
      {isOpen && selected?.data === data && (
        <TimelineActivityDetails
          activity={selected.activity}
          formatDate={formatDate}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
