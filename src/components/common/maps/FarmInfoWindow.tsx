"use client";
import { useId, type Ref } from "react";
import { useLocale, useTranslations } from "next-intl";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import { getLanguage } from "@/i18n/languages";
import Tooltip from "@/components/common/Tooltip";
import type { Farm } from "@/types/account/farm";
import {
  ChevronLeftIcon,
  CloseLineIcon,
  FarmLandscapeIcon,
  InfoIcon,
  PencilIcon,
  SproutIcon,
  TimeIcon,
  TrashBinIcon,
} from "@/icons";

const items = [
  {
    key: "planting-crops",
    label: "farmInfoWindow.plantingCrops",
    Icon: SproutIcon,
  },
  {
    key: "historical-crops",
    label: "farmInfoWindow.historicalCrops",
    Icon: TimeIcon,
  },
  { key: "farm-details", label: "farmInfoWindow.farmDetails", Icon: InfoIcon },
  { key: "edit-farm", label: "farmerFarms.editFarm", Icon: PencilIcon },
  {
    key: "delete-farm",
    label: "farmInfoWindow.deleteFarm",
    Icon: TrashBinIcon,
  },
] as const;
export type FarmInfoAction = (typeof items)[number]["key"];
export interface FarmInfoWindowProps {
  farm: Pick<Farm, "id" | "name"> & Partial<Pick<Farm, "area" | "area_unit">>;
  areaLabel?: string | null;
  onClose: () => void;
  ref?: Ref<HTMLElement>;
  onAction?: (action: FarmInfoAction, id: number) => void;
}

export default function FarmInfoWindow({
  farm,
  areaLabel,
  onClose,
  ref,
  onAction,
}: FarmInfoWindowProps) {
  const t = useTranslations();
  const locale = useLocale();
  const metadata = useAreaUnits();
  const id = useId();
  const number = formatArea(farm.area, locale);
  const area =
    number !== null && farm.area_unit
      ? `${number} ${metadata.label(farm.area_unit)}`
      : areaLabel || t("farmInfoWindow.areaUnavailable");
  return (
    <section
      ref={ref}
      data-farm-info-card
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-name`}
      onKeyDown={(event) => {
        if (event.key !== "Escape") event.stopPropagation();
      }}
      lang={locale}
      dir={getLanguage(locale).dir}
      className="font-outfit shadow-theme-xl relative flex w-full flex-col overflow-hidden rounded-2xl bg-white text-start text-gray-950 dark:bg-gray-900 dark:text-gray-100"
    >
      <header
        data-farm-info-header
        className="bg-success-50 dark:bg-success-950 flex shrink-0 items-start gap-4 rounded-2xl p-5"
      >
        <span
          aria-hidden="true"
          className="bg-success-100 mt-0.5 block size-11 shrink-0 overflow-hidden rounded-lg"
        >
          <FarmLandscapeIcon className="text-success-700 h-full w-22 max-w-none" />
        </span>
        <div className="min-w-0 flex-1">
          {/* Shows the full name when it is cut to two lines; below stays inside the card. */}
          <Tooltip as="div" content={farm.name} side="bottom" className="block">
            <h3
              id={`${id}-name`}
              className="line-clamp-2 text-xl leading-6 font-bold break-words"
            >
              {farm.name}
            </h3>
          </Tooltip>
          <p className="mt-1 text-sm leading-5 font-medium break-words text-gray-600 dark:text-gray-300">
            {area}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("farmerFarms.close")}
          className="hover:bg-success-100 focus-visible:outline-success-600 -me-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-gray-800"
        >
          <CloseLineIcon aria-hidden="true" className="size-5" />
        </button>
      </header>
      <nav
        data-farm-info-menu
        aria-label={t("farmInfoWindow.actions", { name: farm.name })}
        className="custom-scrollbar min-h-0 overflow-y-auto overscroll-contain px-5 py-2"
      >
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map(({ key, label, Icon }, index) => (
            <li key={key}>
              {/* The menu scrolls, so the first row's tip opens downwards. */}
              <Tooltip
                content={
                  !onAction || key === "delete-farm"
                    ? t("farmerDashboard.comingSoonTitle")
                    : null
                }
                side={index === 0 ? "bottom" : "top"}
                className="flex w-full"
              >
                <button
                  type="button"
                  aria-disabled={
                    !onAction || key === "delete-farm" ? "true" : undefined
                  }
                  aria-describedby={
                    !onAction || key === "delete-farm"
                      ? `${id}-unavailable`
                      : undefined
                  }
                  onClick={(event) => {
                    if (!onAction || key === "delete-farm")
                      event.preventDefault();
                    else onAction(key, farm.id);
                  }}
                  className={`focus-visible:outline-success-600 flex h-12 w-full items-center gap-6 rounded-sm px-3 text-start text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${key === "delete-farm" ? "text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950" : "hover:bg-success-50 dark:hover:bg-success-950"}`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`size-6 shrink-0 ${key === "delete-farm" ? "text-error-600 dark:text-error-400" : "text-success-700 dark:text-success-400"}`}
                  />
                  <span className="min-w-0 flex-1">{t(label)}</span>
                  <ChevronLeftIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 rotate-180 text-gray-950 rtl:rotate-0 dark:text-gray-100"
                  />
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>
      <p id={`${id}-unavailable`} className="sr-only">
        {t("farmerDashboard.comingSoonTitle")}
      </p>
    </section>
  );
}
