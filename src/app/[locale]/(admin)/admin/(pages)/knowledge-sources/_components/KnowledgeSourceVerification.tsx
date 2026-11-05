"use client";
import { useTranslations, useFormatter } from "next-intl";
import { LockIcon, InfoIcon } from "@/icons";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import KnowledgeSourceSection from "./KnowledgeSourceSection";
import KnowledgeSourceStatus from "./KnowledgeSourceStatus";

export default function KnowledgeSourceVerification({
  source,
}: {
  source: KnowledgeSource | null;
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
    <KnowledgeSourceSection
      title={t("sections.verification")}
      desc={t("sections.verificationHelp")}
      kind="verification"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <KnowledgeSourceStatus
          status={source?.verification_status ?? "pending"}
        />
        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <LockIcon aria-hidden="true" className="size-3" />
          {t("readOnly")}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt className="text-gray-500 dark:text-gray-400">
          {t("fields.reviewer")}
        </dt>
        <dd className="text-gray-800 dark:text-gray-200">
          {source?.verifier
            ? `${source.verifier.first_name} ${source.verifier.last_name}`
            : t("notSet")}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">
          {t("fields.verified_at")}
        </dt>
        <dd className="text-gray-800 dark:text-gray-200">
          {date(source?.verified_at)}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">
          {t("fields.last_checked_at")}
        </dt>
        <dd className="text-gray-800 dark:text-gray-200">
          {date(source?.last_checked_at)}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">
          {t("fields.next_review_at")}
        </dt>
        <dd className="text-gray-800 dark:text-gray-200">
          {date(source?.next_review_at)}
        </dd>
      </dl>
      <div className="flex items-center gap-3">
        <span
          className={`h-5 w-9 rounded-full p-0.5 ${source?.is_active ? "bg-success-600" : "bg-gray-300 dark:bg-gray-700"}`}
          aria-hidden="true"
        >
          <span
            className={`block size-4 rounded-full bg-white ${source?.is_active ? "ms-auto" : ""}`}
          />
        </span>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {source?.is_active ? t("active") : t("inactive")}
        </span>
      </div>
      <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
        {t("verificationHelp")}
      </p>
    </KnowledgeSourceSection>
  );
}
