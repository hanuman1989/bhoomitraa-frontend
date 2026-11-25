"use client";
import { useTranslations } from "next-intl";
import { CheckLineIcon, CloseLineIcon } from "@/icons";

/** One-time "Your crop timeline is ready" alert shown right after generation. */
export default function TimelineReadyAlert({
  activities,
  stages,
  sowingDate,
  onDismiss,
}: {
  activities: number;
  stages: number;
  sowingDate: string;
  onDismiss: () => void;
}) {
  const t = useTranslations("farmerCropTimeline.alert");
  return (
    <div
      role="status"
      className="border-success-200 bg-success-50 text-success-800 dark:border-success-800 dark:bg-success-950 dark:text-success-200 flex items-center gap-3 rounded-2xl border px-4 py-3"
    >
      <span className="bg-success-700 flex size-8 shrink-0 items-center justify-center rounded-full text-white">
        <CheckLineIcon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("title")}</p>
        <p className="text-sm">
          {t("description", { activities, stages, date: sowingDate })}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="focus-visible:outline-success-600 flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/60 focus-visible:outline-2 dark:hover:bg-gray-900/60"
      >
        <CloseLineIcon aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
