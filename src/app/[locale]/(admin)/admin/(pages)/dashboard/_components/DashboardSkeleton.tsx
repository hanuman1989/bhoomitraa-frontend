import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type DashboardSkeletonVariant =
  | "summary"
  | "analytics"
  | "card"
  | "recent-farmers"
  | "reviews"
  | "notifications";

interface DashboardSkeletonProps {
  variant?: DashboardSkeletonVariant;
  className?: string;
}

const pulse = "animate-pulse rounded bg-gray-200/80 dark:bg-gray-700/70";

function Line({
  width = "w-2/3",
  height = "h-3",
}: {
  width?: string;
  height?: string;
}) {
  return <div className={`${pulse} ${width} ${height}`} />;
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </div>
  );
}

function Summary() {
  const tUi = useTranslations("dashboard.loading");

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8"
      role="status"
      aria-label={tUi("loadingDashboardStatistics")}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <Panel key={i} className="min-h-36 space-y-3">
          <div className={`${pulse} size-10 rounded-xl`} />
          <Line width="w-3/5" height="h-7" />
          <Line width="w-4/5" />
          <Line width="w-2/5" />
        </Panel>
      ))}
    </div>
  );
}

function Analytics() {
  const tUi = useTranslations("dashboard.loading");

  return (
    <div
      className="grid grid-cols-1 gap-4 xl:grid-cols-3"
      role="status"
      aria-label={tUi("loadingDashboardAnalytics")}
    >
      <Panel className="space-y-5 xl:col-span-1">
        <Line width="w-1/2" height="h-5" />
        <Line width="w-2/3" />
        <div className="flex h-44 items-end justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          {[35, 52, 68, 80, 65, 90, 83, 72, 60, 54, 67, 82].map((height, i) => (
            <div
              key={i}
              className={`${pulse} w-full rounded-t`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </Panel>
      <Panel className="space-y-5">
        <Line width="w-3/4" height="h-5" />
        <Line width="w-1/2" />
        <div className="flex items-center justify-center gap-6 py-3">
          <div className={`${pulse} size-36 shrink-0 rounded-full`} />
          <div className="w-24 space-y-4">
            <Line width="w-full" />
            <Line width="w-full" />
            <Line width="w-3/4" />
          </div>
        </div>
      </Panel>
      <Panel className="space-y-5">
        <Line width="w-3/4" height="h-5" />
        <Line width="w-1/2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Line width="w-16" />
            <div className={`${pulse} h-5 flex-1 rounded-md`} />
          </div>
        ))}
      </Panel>
    </div>
  );
}

function Card({ variant }: { variant: DashboardSkeletonVariant }) {
  const tUi = useTranslations("dashboard.loading");

  const rows = variant === "notifications" ? 2 : variant === "reviews" ? 4 : 5;
  return (
    <Panel className="min-h-60 space-y-4">
      <div
        role="status"
        aria-label={tUi("loadingDashboardSection")}
        className="space-y-4"
      >
        <Line width="w-1/2" height="h-5" />
        <Line width="w-3/4" />
        <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Line width="w-2/5" />
              <Line width="w-1/4" />
              <Line width="w-1/6" />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default function DashboardSkeleton({
  variant = "card",
  className = "",
}: DashboardSkeletonProps) {
  const tUi = useTranslations("dashboard.loading");

  return (
    <div className={className} aria-busy="true">
      {variant === "summary" ? (
        <Summary />
      ) : variant === "analytics" ? (
        <Analytics />
      ) : (
        <Card variant={variant} />
      )}
      <span className="sr-only">{tUi("loadingDashboardData")}</span>
    </div>
  );
}
