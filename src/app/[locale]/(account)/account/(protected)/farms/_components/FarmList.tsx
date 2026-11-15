"use client";
import { useLocale, useTranslations } from "next-intl";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import {
  FarmFieldIcon,
  SproutIcon,
  LocationPinIcon,
  PencilIcon,
  MoreDotIcon,
  CheckLineIcon,
} from "@/icons";
import type { Farm } from "@/types/account/farm";
import FarmSatellitePreview from "@/components/common/maps/FarmSatellitePreview";
import { farmMapColor } from "@/components/common/maps/farmMapStyle";
import type { FarmSatelliteSources } from "@/components/common/maps/farmStaticMap";
export default function FarmList({
  farms,
  selectedId,
  busyId,
  satellitePreviews,
  savedFarms = [],
  savedSatellitePreviews,
  onSelect,
  onEdit,
  onStatus,
}: {
  farms: Farm[];
  selectedId: number | null;
  busyId: number | null;
  satellitePreviews?: FarmSatelliteSources;
  savedFarms?: readonly Farm[];
  savedSatellitePreviews?: FarmSatelliteSources;
  onSelect: (id: number) => void;
  onEdit: (farm: Farm) => void;
  onStatus: (farm: Farm) => void;
}) {
  const t = useTranslations("farmerFarms");
  const ta = useTranslations("areaUnits");
  const locale = useLocale();
  const metadata = useAreaUnits();
  const action =
    "flex size-10 items-center justify-center rounded-full border border-gray-200 bg-white text-success-700 shadow-theme-xs hover:bg-success-50 focus-visible:outline-2 focus-visible:outline-success-600 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:text-success-300 dark:hover:bg-gray-800";
  return (
    <ul className="space-y-2">
      {farms.map((farm) => {
        const saved = savedFarms.find((record) => record.id === farm.id);
        const useSaved =
          farm.boundary === undefined &&
          saved &&
          (!farm.updated_at ||
            !saved.updated_at ||
            farm.updated_at === saved.updated_at);
        const geometry = useSaved ? saved : farm;
        const previews = useSaved
          ? (savedSatellitePreviews ?? satellitePreviews)
          : satellitePreviews;
        return (
          <li
            key={farm.id}
            aria-current={farm.id === selectedId ? "true" : undefined}
            className={`shadow-theme-xs grid grid-cols-2 items-center gap-3 rounded-2xl border p-3 lg:grid-cols-12 ${farm.id === selectedId ? "border-success-500 bg-success-50/60 dark:bg-success-950/40" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}
          >
            <button
              type="button"
              onClick={() => onSelect(farm.id)}
              className="col-span-2 flex min-w-0 items-center gap-4 text-start lg:col-span-4"
            >
              <FarmSatellitePreview
                name={farm.name}
                boundary={geometry.boundary}
                latitude={geometry.latitude}
                longitude={geometry.longitude}
                strokeColor={farmMapColor(farm.id, farm.id === selectedId)}
                src={
                  previews?.[farm.id]?.[
                    farm.id === selectedId ? "selected" : "normal"
                  ]
                }
                className="hidden h-14 w-20 shrink-0 sm:flex"
              />
              <span className="min-w-0">
                <strong className="block truncate text-base font-bold">
                  {farm.name}
                </strong>
                <span className="mt-1 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                  <LocationPinIcon className="text-success-700 size-4 shrink-0" />
                  <span className="truncate">
                    {[farm.village, farm.district?.name, farm.state?.name]
                      .filter(Boolean)
                      .join(", ") || t("locationUnavailable")}
                  </span>
                </span>
              </span>
            </button>
            <div className="flex items-center gap-3 lg:col-span-2">
              <FarmFieldIcon className="text-success-700 size-6 shrink-0" />
              <div>
                <strong className="block text-sm">
                  {formatArea(farm.area, locale) ?? farm.area}{" "}
                  {metadata.label(farm.area_unit)}
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("recordedArea")}
                </span>
                {farm.area_unit === "bigha" && (
                  <span className="text-warning-700 dark:text-warning-300 mt-1 block text-xs">
                    {ta("confirmStandard")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 lg:col-span-2">
              <SproutIcon className="text-success-600 size-6 shrink-0" />
              <div>
                <span className="block text-sm">{t("noActiveCrop")}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("activeCrop")}
                </span>
              </div>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold lg:col-span-1 ${farm.is_active ? "bg-success-100 text-success-800 dark:bg-success-950 dark:text-success-300" : "bg-warning-50 text-warning-800 dark:bg-warning-950 dark:text-warning-200"}`}
            >
              {farm.is_active && <CheckLineIcon className="size-4" />}
              {t(farm.is_active ? "active" : "inactive")}
            </span>
            <div className="col-span-2 flex items-center justify-end gap-2 lg:col-span-3">
              <button
                type="button"
                disabled={
                  !farm.has_boundary &&
                  (farm.latitude === null || farm.longitude === null)
                }
                title={t("locateFarm", { name: farm.name })}
                aria-label={t("locateFarm", { name: farm.name })}
                onClick={() => onSelect(farm.id)}
                className={action}
              >
                <LocationPinIcon className="size-5" />
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                aria-label={t("editNamedFarm", { name: farm.name })}
                onClick={() => onEdit(farm)}
                className={action}
              >
                <PencilIcon className="size-5" />
              </button>
              <Menu>
                <MenuButton
                  disabled={busyId !== null}
                  aria-label={t("moreActions", { name: farm.name })}
                  className={action}
                >
                  <MoreDotIcon className="size-5" />
                </MenuButton>
                <MenuItems
                  anchor="bottom end"
                  portal
                  className="shadow-theme-lg z-999 rounded-xl border border-gray-200 bg-white p-1 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                >
                  <MenuItem>
                    <button
                      type="button"
                      onClick={() => onEdit(farm)}
                      className="data-focus:bg-success-50 block w-full rounded-lg px-4 py-2 text-start dark:data-focus:bg-gray-800"
                    >
                      {t("editFarm")}
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      type="button"
                      onClick={() => onStatus(farm)}
                      className="data-focus:bg-success-50 block w-full rounded-lg px-4 py-2 text-start dark:data-focus:bg-gray-800"
                    >
                      {t(farm.is_active ? "deactivateFarm" : "activateFarm")}
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
