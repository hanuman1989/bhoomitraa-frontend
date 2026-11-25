"use client";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/common/Tooltip";
import { Link } from "@/i18n/navigation";
import {
  ChevronLeftIcon,
  CloseLineIcon,
  ExternalLinkIcon,
  SproutIcon,
} from "@/icons";
import type { TimelineCrop } from "@/types/account/cropTimeline";

/**
 * "Crop Timeline" plus the crop · variety · farm · season line. The dialog has
 * Close and "Open full page"; the page has a breadcrumb and a back link.
 * There is deliberately no language switch: the app locale is used.
 */
export default function TimelineHeader({
  titleId,
  cycleId,
  crop,
  variant,
  onClose,
}: {
  titleId: string;
  cycleId: number;
  crop: TimelineCrop;
  variant: "page" | "dialog";
  onClose?: () => void;
}) {
  const t = useTranslations("farmerCropTimeline");
  const line = [crop.name, crop.variety, crop.farm, crop.season]
    .filter(Boolean)
    .join(" · ");
  return (
    <header className="flex items-start gap-3">
      <SproutIcon
        aria-hidden="true"
        className="text-success-700 dark:text-success-300 mt-0.5 size-9 shrink-0"
      />
      <div className="min-w-0 flex-1">
        {variant === "page" && (
          <nav aria-label={t("breadcrumb")} className="mb-1">
            <Link
              href="/account/crops"
              className="text-success-700 dark:text-success-300 focus-visible:outline-success-600 inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline focus-visible:outline-2"
            >
              <ChevronLeftIcon
                aria-hidden="true"
                className="size-4 rtl:rotate-180"
              />
              {t("back")}
            </Link>
          </nav>
        )}
        <h2
          id={titleId}
          className="text-xl font-bold text-gray-950 sm:text-2xl dark:text-white"
        >
          {t("title")}
        </h2>
        {line && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {line}
          </p>
        )}
      </div>
      {variant === "dialog" && (
        <div className="flex shrink-0 items-center gap-1">
          {/* Below, since the dialog clips anything above its header. */}
          <Tooltip content={t("openFullPage")} side="bottom">
            <Link
              href={`/account/crop-timeline/${cycleId}`}
              // The dialog lives in the persistent shell, so close it when moving to the page.
              onClick={onClose}
              aria-label={t("openFullPage")}
              className="text-success-700 dark:text-success-300 focus-visible:outline-success-600 flex size-11 items-center justify-center rounded-lg hover:bg-gray-100 focus-visible:outline-2 dark:hover:bg-gray-800"
            >
              <ExternalLinkIcon aria-hidden="true" className="size-5" />
            </Link>
          </Tooltip>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="text-success-700 dark:text-success-300 focus-visible:outline-success-600 flex size-11 items-center justify-center rounded-lg hover:bg-gray-100 focus-visible:outline-2 dark:hover:bg-gray-800"
          >
            <CloseLineIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
      )}
    </header>
  );
}
