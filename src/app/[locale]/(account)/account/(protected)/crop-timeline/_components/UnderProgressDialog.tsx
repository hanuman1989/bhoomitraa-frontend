"use client";
import { useTranslations } from "next-intl";
import TimelineDialogShell from "./TimelineDialogShell";

/** Placeholder for Add Expense, Add Labour and Add Photo until those records are built. */
export default function UnderProgressDialog({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const t = useTranslations("farmerCropTimeline");
  return (
    <TimelineDialogShell title={title} subtitle={subtitle} onClose={onClose}>
      <p className="py-10 text-center text-lg font-semibold text-gray-600 dark:text-gray-300">
        {t("underProgress")}
      </p>
    </TimelineDialogShell>
  );
}
