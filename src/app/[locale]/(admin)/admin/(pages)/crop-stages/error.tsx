"use client";

import { useTranslations } from "next-intl";

export default function Error({ reset }: { reset: () => void }) {
  const t = useTranslations("cropStages");
  return (
    <div
      role="alert"
      className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 space-y-4 rounded-xl border p-6"
    >
      <p>{t("feedback.loadFailed")}</p>
      <button
        type="button"
        onClick={reset}
        className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus-visible:outline-2"
      >
        {t("retry")}
      </button>
    </div>
  );
}
