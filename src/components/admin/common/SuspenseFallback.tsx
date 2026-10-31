import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type LoadingVariant = "page" | "table" | "cards" | "section" | "inline";

interface SuspenseFallbackProps {
  variant?: LoadingVariant;
  title?: string;
  rows?: number;
  className?: string;
}

function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700/70 ${className}`}
    />
  );
}

function LoadingCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {children}
    </div>
  );
}

/** Server-compatible Suspense placeholder with localized loading text. */
export default function SuspenseFallback({
  variant = "section",
  title,
  rows = 5,
  className = "",
}: SuspenseFallbackProps) {
  const tUi = useTranslations("ui.suspenseFallback");
  if (title === undefined) title = tUi("loadingContent");

  const rowCount = Math.max(
    1,
    Math.min(12, Math.trunc(Number.isFinite(rows) ? rows : 5)),
  );

  let content: ReactNode;

  switch (variant) {
    case "inline":
      content = (
        <div className="flex items-center gap-3 py-2">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-green-600 dark:border-gray-700 dark:border-t-green-400"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {title}
          </span>
        </div>
      );
      break;
    case "cards":
      content = (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }, (_, index) => (
            <LoadingCard key={index}>
              <Bar className="mb-4 h-9 w-9 rounded-lg" />
              <Bar className="mb-3 h-7 w-20" />
              <Bar className="h-4 w-24 max-w-full" />
            </LoadingCard>
          ))}
        </div>
      );
      break;
    case "table":
      content = (
        <LoadingCard>
          <div className="mb-5 flex items-center justify-between gap-4">
            <Bar className="h-7 w-40" />
            <Bar className="h-9 w-32" />
          </div>
          <div className="space-y-3">
            <Bar className="h-11 w-full" />
            {Array.from({ length: rowCount }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-4 border-b border-gray-100 py-3 sm:grid-cols-6 dark:border-gray-800"
              >
                <Bar className="h-4 w-full" />
                <Bar className="h-4 w-full" />
                <Bar className="h-4 w-full" />
                <Bar className="h-4 w-full" />
                <Bar className="hidden h-4 w-full sm:block" />
                <Bar className="hidden h-4 w-full sm:block" />
              </div>
            ))}
          </div>
        </LoadingCard>
      );
      break;
    case "page":
      content = (
        <div className="space-y-6">
          <div className="space-y-3">
            <Bar className="h-9 w-52" />
            <Bar className="h-4 w-72 max-w-full" />
          </div>
          <LoadingCard>
            <div className="grid gap-4 md:grid-cols-3">
              <Bar className="h-11 w-full" />
              <Bar className="h-11 w-full" />
              <Bar className="h-11 w-full" />
            </div>
          </LoadingCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <LoadingCard>
              <Bar className="mb-5 h-6 w-40" />
              <Bar className="h-56 w-full" />
            </LoadingCard>
            <LoadingCard>
              <Bar className="mb-5 h-6 w-40" />
              <Bar className="h-56 w-full" />
            </LoadingCard>
          </div>
        </div>
      );
      break;
    default:
      content = (
        <LoadingCard>
          <Bar className="mb-5 h-6 w-44" />
          <Bar className="mb-3 h-4 w-full" />
          <Bar className="mb-3 h-4 w-4/5" />
          <Bar className="h-36 w-full" />
        </LoadingCard>
      );
  }

  return (
    <div
      role="status"
      aria-label={title}
      aria-live="polite"
      className={className}
    >
      {content}
      <span className="sr-only">{title}</span>
    </div>
  );
}
