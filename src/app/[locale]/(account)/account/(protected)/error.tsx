"use client";
import { useTranslations } from "next-intl";

export default function AccountModuleError({ retry }: { retry: () => void }) {
  const t = useTranslations("farmerDashboard");
  return (
    <div
      role="alert"
      className="space-y-3 rounded-2xl border border-gray-200 p-6 dark:border-gray-700"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t("pageError")}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        {t("pageErrorDescription")}
      </p>
      <button
        type="button"
        onClick={retry}
        className="bg-success-700 focus-visible:outline-success-700 rounded-lg px-4 py-2.5 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("retry")}
      </button>
    </div>
  );
}
