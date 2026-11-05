"use client";
import { useTranslations, useFormatter } from "next-intl";
import { CalenderIcon } from "@/icons";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import KnowledgeSourceSection from "./KnowledgeSourceSection";
import KnowledgeSourceStatus from "./KnowledgeSourceStatus";
import KnowledgeSourceRowActions from "./KnowledgeSourceRowActions";

export default function KnowledgeSourceSummary({
  source,
  canReview,
  pending,
  onChanged,
}: {
  source: KnowledgeSource | null;
  canReview: boolean;
  pending: boolean;
  onChanged: (source: KnowledgeSource) => void;
}) {
  const t = useTranslations("knowledgeSources");
  const format = useFormatter();
  const date = (value: string | null | undefined) =>
    value
      ? format.dateTime(new Date(value), {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        })
      : t("notSet");
  return (
    <aside className="min-w-0 2xl:col-span-1">
      <KnowledgeSourceSection
        title={t("sections.summary")}
        desc={t("sections.summaryHelp")}
        kind="summary"
      >
        <dl className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <div className="flex flex-wrap justify-between gap-3 py-3">
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              {t("fields.verification_status")}
            </dt>
            <dd>
              <KnowledgeSourceStatus
                status={source?.verification_status ?? "pending"}
              />
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-3 py-3">
            <dt className="font-medium text-gray-700 dark:text-gray-300">
              {t("fields.created_by")}
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {source?.creator
                ? `${source.creator.first_name} ${source.creator.last_name}`
                : t("notSet")}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-3 py-3">
            <dt className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
              <CalenderIcon aria-hidden="true" className="size-4" />
              {t("fields.updated_at")}
            </dt>
            <dd className="text-gray-600 dark:text-gray-400">
              {date(source?.updated_at)}
            </dd>
          </div>
        </dl>
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("fields.review_notes")}
          </h3>
          <p className="rounded-lg border border-gray-200 p-3 text-sm whitespace-pre-wrap text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {source?.review_notes || t("noReviewNotes")}
          </p>
          {source?.rejection_reason && (
            <p className="text-error-600 dark:text-error-400 mt-3 text-sm">
              {t("rejection", { reason: source.rejection_reason })}
            </p>
          )}
        </div>
        {source && !pending && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("fields.actions")}
            </span>
            <KnowledgeSourceRowActions
              source={source}
              canReview={canReview}
              onChanged={onChanged}
            />
          </div>
        )}
      </KnowledgeSourceSection>
    </aside>
  );
}
