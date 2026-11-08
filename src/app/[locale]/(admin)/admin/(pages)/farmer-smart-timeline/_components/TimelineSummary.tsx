import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import {
  CalenderIcon,
  SproutIcon,
  InfoIcon,
  KnowledgeSourcesIcon,
  AlertIcon,
} from "@/icons";
import type { TimelinePreviewData } from "@/types/admin/farmerSmartTimeline";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child]:py-3 [&>div:nth-child(2)]:p-4";

export default function TimelineSummary({
  data,
  formatDate,
}: {
  data: TimelinePreviewData | null;
  formatDate: (date: string | null) => string;
}) {
  const t = useTranslations("farmerSmartTimeline");
  return (
    <aside className="min-w-0 space-y-4 xl:col-span-3">
      <ComponentCard
        title={
          <span className="flex items-center gap-3 font-semibold text-gray-950 dark:text-white">
            <InfoIcon aria-hidden="true" className="text-brand-500 size-5" />
            {t("summary.title")}
          </span>
        }
        className={cardClass}
      >
        <dl className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <div className="flex items-center justify-between gap-3 pb-3">
            <dt className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <CalenderIcon aria-hidden="true" className="size-4 shrink-0" />
              {t("summary.activities")}
            </dt>
            <dd className="font-semibold text-gray-950 dark:text-gray-100">
              {data?.summary.total_activities ?? t("notAvailable")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <SproutIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-4 shrink-0"
              />
              {t("summary.stages")}
            </dt>
            <dd className="font-semibold text-gray-950 dark:text-gray-100">
              {data?.summary.total_growth_stages ?? t("notAvailable")}
            </dd>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 pt-3">
            <dt className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <CalenderIcon aria-hidden="true" className="size-4 shrink-0" />
              {t("summary.range")}
            </dt>
            <dd className="text-end text-xs leading-5 font-semibold text-gray-950 dark:text-gray-100">
              {data?.summary.first_date && data.summary.last_date
                ? t("dateRange", {
                    start: formatDate(data.summary.first_date),
                    end: formatDate(data.summary.last_date),
                  })
                : t("notAvailable")}
            </dd>
          </div>
        </dl>
      </ComponentCard>
      <ComponentCard
        title={
          <span className="flex items-center gap-3 font-semibold text-gray-950 dark:text-white">
            <KnowledgeSourcesIcon
              aria-hidden="true"
              className="text-brand-500 size-5"
            />
            {t("notes.title")}
          </span>
        }
        className={cardClass}
      >
        <ul className="marker:text-brand-500 list-disc space-y-3 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
          <li>{t("notes.configuration")}</li>
          <li>
            {data
              ? t("notes.sowingDate", {
                  date: formatDate(data.input.sowing_date),
                })
              : t("notes.dates")}
          </li>
          <li>{t("notes.estimates")}</li>
          <li>{t("notes.readOnly")}</li>
        </ul>
      </ComponentCard>
      {data && (
        <ComponentCard
          title={
            <span className="flex items-center gap-3 font-semibold text-gray-950 dark:text-white">
              <AlertIcon
                aria-hidden="true"
                className="text-warning-600 size-5"
              />
              {t("diagnostics.title", { count: data.warnings.length })}
            </span>
          }
          className={cardClass}
        >
          {data.warnings.length ? (
            <ul className="space-y-3">
              {data.warnings.map((warning, index) => (
                <li
                  key={`${warning.code}-${index}`}
                  className="border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10 min-w-0 rounded-lg border p-3"
                >
                  <p className="text-warning-800 dark:text-warning-300 font-mono text-xs font-semibold break-words">
                    {warning.code}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-gray-800 dark:text-gray-200">
                    {warning.message}
                  </p>
                  {Object.keys(warning.context).length > 0 && (
                    <dl className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {Object.entries(warning.context).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex flex-wrap gap-x-2 gap-y-1"
                        >
                          <dt className="font-medium">
                            {t.has(`diagnostics.context.${key}`)
                              ? t(`diagnostics.context.${key}`)
                              : key}
                          </dt>
                          <dd className="min-w-0 break-words">
                            {value === null
                              ? t("notAvailable")
                              : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("diagnostics.none")}
            </p>
          )}
        </ComponentCard>
      )}
    </aside>
  );
}
