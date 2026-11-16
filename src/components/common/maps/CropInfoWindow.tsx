"use client";
import { useId } from "react";
import { useTranslations, useLocale } from "next-intl";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import { getLanguage } from "@/i18n/languages";
import {
  CloseLineIcon,
  InfoIcon,
  PencilIcon,
  FlaskConicalIcon,
  LeafIcon,
  FarmFieldIcon,
  TrashBinIcon,
  ChevronLeftIcon,
  SproutIcon,
} from "@/icons";
import type { CropMapRecord } from "@/types/account/farmCrop";
export type CropInfoAction =
  "details" | "edit" | "soil" | "fertilizer" | "farm" | "delete";
export default function CropInfoWindow({
  crop,
  onClose,
  onAction,
}: {
  crop: CropMapRecord;
  onClose: () => void;
  onAction: (action: CropInfoAction, id: number) => void;
}) {
  const t = useTranslations("farmerCrops");
  const locale = useLocale();
  const units = useAreaUnits();
  const id = useId();
  const actions = [
    { key: "details", Icon: InfoIcon, label: "cropDetails" },
    { key: "edit", Icon: PencilIcon, label: "editCrop" },
    { key: "soil", Icon: FlaskConicalIcon, label: "steps.soil_assessment" },
    { key: "fertilizer", Icon: LeafIcon, label: "fertilizerPlan" },
    { key: "farm", Icon: FarmFieldIcon, label: "farmDetails" },
    { key: "delete", Icon: TrashBinIcon, label: "cancelCrop" },
  ] as const;
  return (
    <section
      data-farm-info-card
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-name`}
      lang={locale}
      dir={getLanguage(locale).dir}
      className="font-outfit shadow-theme-xl relative flex w-full flex-col overflow-hidden rounded-2xl bg-white text-start text-gray-950 dark:bg-gray-900 dark:text-gray-100"
    >
      <header
        data-farm-info-header
        className="bg-success-50 dark:bg-success-950 flex shrink-0 items-start gap-3 p-5"
      >
        <SproutIcon className="text-success-700 dark:text-success-300 mt-1 size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-name`} className="text-xl font-bold">
            {crop.crop_name ?? t("crop")}
          </h3>
          {crop.crop_variety_name && (
            <p className="text-sm text-gray-500">{crop.crop_variety_name}</p>
          )}
          <p className="mt-1 text-sm">
            {formatArea(crop.cultivated_area, locale) ?? t("unavailable")}{" "}
            {units.label(crop.area_unit)}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("close")}
          onClick={onClose}
          className="hover:bg-success-100 -me-1 -mt-1 rounded-lg p-2 dark:hover:bg-gray-800"
        >
          <CloseLineIcon className="size-5" />
        </button>
      </header>
      <nav
        data-farm-info-menu
        aria-label={t("cropActions")}
        className="custom-scrollbar min-h-0 overflow-y-auto px-5 py-2"
      >
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {actions.map(({ key, Icon, label }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => onAction(key, crop.id)}
                className={`focus-visible:outline-success-600 flex min-h-12 w-full items-center gap-4 rounded-lg px-2 text-start text-sm font-medium focus-visible:outline-2 ${key === "delete" ? "text-error-600 hover:bg-error-50 dark:hover:bg-error-950" : "hover:bg-success-50 dark:hover:bg-success-950"}`}
              >
                <Icon className="size-5 shrink-0" />
                <span className="flex-1">{t(label)}</span>
                <ChevronLeftIcon className="size-4 rotate-180 rtl:rotate-0" />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
