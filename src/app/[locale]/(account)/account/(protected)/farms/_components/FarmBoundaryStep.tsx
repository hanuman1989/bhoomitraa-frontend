"use client";
import { useTranslations } from "next-intl";
import FarmBoundaryEditor from "@/components/common/maps/FarmBoundaryEditor";
import type { FarmBoundarySession } from "@/hooks/useFarmBoundary";
import type { AreaUnit } from "@/types/account/farm";
import { FarmFieldIcon } from "@/icons";
export default function FarmBoundaryStep({
  session,
  areaUnit,
  location,
}: {
  session: FarmBoundarySession;
  areaUnit: AreaUnit;
  location: string;
}) {
  const t = useTranslations("farmerFarms");
  return (
    <div className="space-y-4 rounded-xl border border-gray-100 p-3 sm:p-4 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <span className="bg-success-50 text-success-700 dark:bg-success-950 rounded-full p-3">
          <FarmFieldIcon className="size-7" />
        </span>
        <div>
          <h3 className="text-xl font-bold">{t("wizard.boundaryTitle")}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("wizard.boundaryDescription")}
          </p>
        </div>
      </div>
      <FarmBoundaryEditor
        session={session}
        areaUnit={areaUnit}
        location={location}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("wizard.boundaryOptional")}
      </p>
    </div>
  );
}
