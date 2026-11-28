"use client";
import { useTranslations } from "next-intl";

/** Skeleton while the first list page, summary and options load. */
export default function IrrigationManagerLoading() {
  const t = useTranslations("farmerIrrigation");
  return (
    <div aria-busy="true" className="animate-pulse space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-7 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 max-w-md rounded bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <div className="bg-blue-light-100 dark:bg-blue-light-950 h-11 w-44 rounded-lg" />
          <div className="bg-success-100 dark:bg-success-950 h-11 w-36 rounded-lg" />
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-20 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </div>
      <div className="h-11 rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-17 rounded-xl bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
      <span role="status" className="sr-only">
        {t("loading")}
      </span>
    </div>
  );
}
