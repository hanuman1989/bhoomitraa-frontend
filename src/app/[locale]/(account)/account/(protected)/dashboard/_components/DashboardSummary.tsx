import { getTranslations } from "next-intl/server";
import {
  FarmFieldIcon,
  SproutIcon,
  DropletsIcon,
  TractorIcon,
  GroupIcon,
} from "@/icons";

const cards = [
  {
    label: "summary.totalFarms",
    value: 12,
    icon: FarmFieldIcon,
    surface:
      "border-success-100 from-success-50 to-success-25 dark:border-success-800 dark:from-success-950 dark:to-gray-900",
    accent:
      "bg-success-100/70 text-success-600 dark:bg-success-900 dark:text-success-300",
  },
  {
    label: "summary.activeCrops",
    value: 18,
    icon: SproutIcon,
    surface:
      "border-warning-100 from-warning-50 to-warning-25 dark:border-warning-900 dark:from-warning-950 dark:to-gray-900",
    accent:
      "bg-warning-100/70 text-warning-500 dark:bg-warning-900 dark:text-warning-300",
  },
  {
    label: "overview.irrigationUnits",
    value: 6,
    icon: DropletsIcon,
    surface:
      "border-blue-light-200 from-blue-light-50 to-blue-light-25 dark:border-blue-light-900 dark:from-blue-light-950 dark:to-gray-900",
    accent:
      "bg-blue-light-100 text-blue-light-500 dark:bg-blue-light-900 dark:text-blue-light-300",
  },
  {
    label: "modules.machinery",
    value: 4,
    icon: TractorIcon,
    surface:
      "border-theme-purple-500/20 from-theme-purple-500/5 to-theme-purple-500/10 dark:border-theme-purple-500/30 dark:from-theme-purple-500/15 dark:to-gray-900",
    accent:
      "bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20 dark:text-white",
  },
  {
    label: "modules.employees",
    value: 8,
    icon: GroupIcon,
    surface:
      "border-theme-pink-500/20 from-theme-pink-500/5 to-theme-pink-500/10 dark:border-theme-pink-500/30 dark:from-theme-pink-500/15 dark:to-gray-900",
    accent:
      "bg-theme-pink-500/10 text-theme-pink-500 dark:bg-theme-pink-500/20 dark:text-white",
  },
] as const;

export default async function DashboardSummary() {
  const t = await getTranslations("farmerDashboard");
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, surface, accent }) => (
        <div
          key={label}
          className={`flex items-center gap-4 rounded-xl border bg-linear-to-br px-4 py-3 ${surface}`}
        >
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${accent}`}
          >
            <Icon aria-hidden="true" viewBox="0 0 24 24" className="size-8" />
          </span>
          <div className="min-w-0">
            <dt className="text-theme-xs font-medium text-gray-900 dark:text-gray-200">
              {t(label)}
            </dt>
            <dd className="mt-1 text-2xl leading-none font-bold text-gray-950 dark:text-white">
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
