"use client";
import { useTranslations, useLocale } from "next-intl";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import {
  CalenderIcon,
  SproutIcon,
  FarmFieldIcon,
  CheckCircleIcon,
} from "@/icons";
import type { CropSummary } from "@/types/account/farmCrop";
export default function CropSummaryCards({
  summary,
}: {
  summary: CropSummary | null;
}) {
  const t = useTranslations("farmerCrops");
  const locale = useLocale();
  const units = useAreaUnits();
  const stats = [
    { key: "totalCycles", value: summary?.total_crops, Icon: CalenderIcon },
    { key: "activeCrops", value: summary?.active_crops, Icon: SproutIcon },
    {
      key: "cultivatedArea",
      value: summary?.total_cultivated_area
        ? `${formatArea(summary.total_cultivated_area, locale)} ${units.label(summary.total_cultivated_area_unit)}`
        : t("unavailable"),
      Icon: FarmFieldIcon,
    },
    {
      key: "completedCrops",
      value: summary?.completed_crops,
      Icon: CheckCircleIcon,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {stats.map(({ key, value, Icon }, index) => (
        <div
          key={key}
          className={`flex min-h-16 items-center gap-2 rounded-lg border px-3 py-2 ${index === 3 ? "border-warning-200 bg-warning-50/50 dark:border-warning-900 dark:bg-warning-950" : "border-success-200 bg-success-50/60 dark:border-success-900 dark:bg-success-950"}`}
        >
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${index === 3 ? "bg-warning-100 text-warning-600" : "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300"}`}
          >
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs leading-4 font-semibold text-gray-500 dark:text-gray-400">
              {t(key)}
            </h3>
            <strong className="block text-base leading-5 font-bold sm:text-lg">
              {value ?? "—"}
            </strong>
            {key === "cultivatedArea" && (
              <span className="block text-xs leading-4 text-gray-500">
                {t("activeCrops")}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
