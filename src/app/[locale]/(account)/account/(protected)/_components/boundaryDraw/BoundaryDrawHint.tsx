"use client";
import { useTranslations } from "next-intl";
import type { BoundaryDrawError, BoundaryDrawMode } from "./boundaryDrawState";

export default function BoundaryDrawHint({
  mode,
  count,
  areaLabel,
  error,
}: {
  mode: BoundaryDrawMode;
  count: number;
  areaLabel: string | null;
  error: BoundaryDrawError | null;
}) {
  const t = useTranslations("farmerDashboard.boundaryDraw");
  const tf = useTranslations("farmerFarms");
  return (
    <div className="pointer-events-none absolute inset-x-14 top-14 z-20 mx-auto max-w-sm sm:inset-x-0 sm:top-5">
      <div className="shadow-theme-lg rounded-2xl bg-white/95 px-4 py-2 text-center text-gray-900 dark:bg-gray-900/95 dark:text-gray-100">
        <p role="status" className="text-sm font-medium">
          {t(mode === "drawn" ? "drawnHint" : "hint")}
          <span className="text-theme-xs mt-0.5 block font-normal text-gray-600 dark:text-gray-300">
            {areaLabel
              ? t("progressWithArea", { count, area: areaLabel })
              : t("progress", { count })}
          </span>
        </p>
        {error && (
          <p
            role="alert"
            className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-200 text-theme-xs mt-1.5 rounded-lg px-2 py-1"
          >
            {tf(error)}
          </p>
        )}
        <p className="text-theme-xs mt-1 hidden text-gray-500 lg:block dark:text-gray-400">
          {t("shortcuts")}
        </p>
      </div>
    </div>
  );
}
