"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function AccountError({ reset }: { reset: () => void }) {
  const t = useTranslations("account");
  return (
    <div className="bg-success-50 flex min-h-svh items-center justify-center p-6 dark:bg-gray-950">
      <section
        role="alert"
        className="shadow-theme-lg w-full max-w-md rounded-2xl bg-white/95 p-8 text-center dark:bg-gray-900"
      >
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("unavailable")}
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          {t("feedback.sessionFailed")}
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-success-700 focus-visible:outline-success-700 mt-5 rounded-lg px-5 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t("retry")}
        </button>
        <p className="mt-4">
          <Link
            href="/account/login"
            className="text-success-800 dark:text-success-400 font-medium underline"
          >
            {t("reset.backToLogin")}
          </Link>
        </p>
      </section>
    </div>
  );
}
