"use client";

import { useTranslations } from "next-intl";
import { SproutIcon } from "@/icons";

export default function CropManagerLoading() {
  const t = useTranslations("farmerCrops");

  return (
    <div aria-busy="true" className="animate-pulse space-y-5">
      <header className="flex items-center gap-4">
        <span className="bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300 hidden rounded-full p-3 sm:block">
          <SproutIcon className="size-9" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-8 w-52 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 max-w-md rounded bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="hidden gap-3 sm:flex">
          <div className="h-11 w-32 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="bg-success-100 dark:bg-success-950 h-11 w-32 rounded-xl" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-24 rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="h-11 w-64 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-11 w-full max-w-sm rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>

      <span role="status" className="sr-only">
        {t("loading")}
      </span>
    </div>
  );
}
