"use client";
import { useTranslations } from "next-intl";
import { SproutIcon } from "@/icons";

const DOTS = [0, 1, 2, 3, 4];

/** Full-screen card shown while the crop timeline is being generated. */
export default function TimelineGeneratingLoader() {
  const t = useTranslations("farmerCropTimeline.generating");
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-999999 flex items-center justify-center bg-gray-950/40 p-5 backdrop-blur-md"
    >
      <div className="shadow-theme-xl w-full max-w-sm rounded-3xl bg-white px-8 py-10 text-center dark:bg-gray-900">
        <span className="bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300 mx-auto flex size-18 items-center justify-center rounded-full">
          <SproutIcon aria-hidden="true" className="size-10" />
        </span>
        <p className="mt-5 text-xl font-bold text-gray-950 dark:text-white">
          {t("title")}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
        <div aria-hidden="true" className="mt-6 flex justify-center gap-2">
          {DOTS.map((dot) => (
            <span
              key={dot}
              className="bg-success-600 size-2.5 animate-bounce rounded-full motion-reduce:animate-none"
              style={{ animationDelay: `${dot * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
