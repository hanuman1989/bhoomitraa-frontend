"use client";

import { useTranslations } from "next-intl";
import BuilderDialog from "./BuilderDialog";

const operations = [
  "features",
  "actions",
  "priority",
  "sources",
  "applicability",
  "stageScheduling",
  "clearScheduling",
  "activate",
  "deactivate",
  "delete",
] as const;

/**
 * Laravel has no bulk endpoint returning per-record outcomes yet, so bulk
 * execution stays unavailable instead of simulating database changes.
 * See BACKEND_REQUIREMENTS.md.
 */
export default function BulkOperationsDialog({
  count,
  onClose,
}: {
  count: number;
  onClose: () => void;
}) {
  const t = useTranslations("timelineBuilder");
  return (
    <BuilderDialog
      title={t("bulk.title")}
      description={t("selectedCount", { count })}
      onClose={onClose}
    >
      <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-lg p-3 text-sm">
        {t("bulk.unavailable")}
      </p>
      <ul className="list-disc space-y-1 ps-5 text-sm text-gray-600 dark:text-gray-400">
        {operations.map((operation) => (
          <li key={operation}>{t(`bulk.operations.${operation}`)}</li>
        ))}
      </ul>
    </BuilderDialog>
  );
}
