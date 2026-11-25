"use client";
import { useTranslations } from "next-intl";
import { SproutIcon } from "@/icons";
import type { CropTimelineData } from "@/types/account/cropTimeline";
import { cropButton, cropPrimary } from "../../crops/_components/CropUi";

/**
 * Shown when a crop has no timeline: a draft (finish setup first), an active
 * crop whose generation did not finish (generate fallback), or a historical crop.
 */
export default function TimelineEmptyState({
  timeline,
  busy,
  onGenerate,
  onContinueSetup,
}: {
  timeline: CropTimelineData;
  busy: boolean;
  onGenerate: () => void;
  onContinueSetup?: () => void;
}) {
  const t = useTranslations("farmerCropTimeline.empty");
  const draft = timeline.status === "draft";
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center sm:p-10 dark:border-gray-700">
      <SproutIcon
        aria-hidden="true"
        className="text-success-600 mx-auto size-10"
      />
      <h3 className="mt-3 text-lg font-semibold text-gray-950 dark:text-white">
        {t(draft ? "draftTitle" : "notGeneratedTitle")}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t(
          draft
            ? "draftDescription"
            : timeline.can_generate
              ? "notGeneratedDescription"
              : "historicalDescription",
        )}
      </p>
      <div className="mt-4 flex justify-center">
        {timeline.can_generate && (
          <button
            type="button"
            disabled={busy}
            onClick={onGenerate}
            className={cropPrimary}
          >
            {t("generate")}
          </button>
        )}
        {draft && onContinueSetup && (
          <button
            type="button"
            onClick={onContinueSetup}
            className={cropButton}
          >
            {t("continueSetup")}
          </button>
        )}
      </div>
    </div>
  );
}
