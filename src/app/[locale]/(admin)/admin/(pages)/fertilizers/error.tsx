"use client";

import { useTranslations } from "next-intl";
export default function Error({ reset }: { reset: () => void }) {
  const t = useTranslations("fertilizers");
  return (
    <div
      role="alert"
      className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 space-y-4 rounded-xl p-5"
    >
      <p>{t("feedback.loadFailed")}</p>
      <button
        type="button"
        onClick={reset}
        className="bg-brand-500 rounded-lg px-5 py-2.5 text-white"
      >
        {t("retry")}
      </button>
    </div>
  );
}
