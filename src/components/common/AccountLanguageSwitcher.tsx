"use client";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function AccountLanguageSwitcher({
  onBeforeChange,
  compact = false,
}: { onBeforeChange?: () => void; compact?: boolean } = {}) {
  const t = useTranslations("account.language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  function changeLocale(nextLocale: (typeof routing.locales)[number]) {
    if (pending || nextLocale === locale) return;
    onBeforeChange?.();
    const query = searchParams.toString();
    startTransition(() =>
      router.replace(`${pathname}${query ? `?${query}` : ""}`, {
        locale: nextLocale,
      }),
    );
  }
  return (
    <nav
      aria-label={t("label")}
      className={`shadow-theme-lg absolute z-10 flex gap-1 rounded-full bg-white/95 dark:bg-gray-900 ${compact ? "end-5 top-5 h-8 items-center p-1 sm:end-7" : "end-4 top-4 p-1.5 sm:end-8 sm:top-6"}`}
    >
      <button
        type="button"
        lang="hi"
        disabled={pending}
        aria-pressed={locale === "hi"}
        onClick={() => changeLocale("hi")}
        className={`focus-visible:outline-success-600 rounded-full font-medium focus-visible:outline-2 disabled:opacity-60 ${compact ? "flex h-6 min-w-8 items-center justify-center px-2 text-xs leading-none" : "px-3 py-1.5"} ${locale === "hi" ? "bg-success-700 text-white" : "text-gray-800 dark:text-gray-100"}`}
      >
        {t("hindi")}
      </button>
      <span
        aria-hidden="true"
        className={`self-center text-gray-300 ${compact ? "text-xs" : ""}`}
      >
        |
      </span>
      <button
        type="button"
        lang="en"
        disabled={pending}
        aria-pressed={locale === "en"}
        onClick={() => changeLocale("en")}
        className={`focus-visible:outline-success-600 rounded-full font-medium focus-visible:outline-2 disabled:opacity-60 ${compact ? "flex h-6 min-w-8 items-center justify-center px-2 text-xs leading-none" : "px-3 py-1.5"} ${locale === "en" ? "bg-success-700 text-white" : "text-gray-800 dark:text-gray-100"}`}
      >
        {t("english")}
      </button>
    </nav>
  );
}
