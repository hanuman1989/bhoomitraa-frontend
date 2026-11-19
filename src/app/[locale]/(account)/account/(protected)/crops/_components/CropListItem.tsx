"use client";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { useTranslations, useLocale } from "next-intl";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import {
  CalenderIcon,
  LocationPinIcon,
  EyeIcon,
  MoreDotIcon,
  SproutIcon,
} from "@/icons";
import type { CropCycle } from "@/types/account/farmCrop";
import { useAccountFarms } from "../../_components/AccountFarmContext";
import { CropImage, cropButton } from "./CropUi";
export default function CropListItem({ crop }: { crop: CropCycle }) {
  const t = useTranslations("farmerCrops");
  const locale = useLocale();
  const units = useAreaUnits();
  const { crops: workspace } = useAccountFarms();
  const selected = workspace.selectedId === crop.id;
  const editable = crop.status === "active" || crop.status === "draft";
  const draft = crop.status === "draft";
  return (
    <article
      tabIndex={0}
      role="group"
      aria-label={t("selectCropRecord", { name: crop.crop.name ?? t("crop") })}
      onClick={() => workspace.select(crop)}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          workspace.select(crop);
        }
      }}
      className={`shadow-theme-xs focus-visible:outline-success-600 cursor-pointer rounded-xl border p-2.5 transition focus-visible:outline-2 ${selected ? "border-success-500 bg-success-50/70 dark:bg-success-950" : "hover:border-success-300 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}
    >
      <div className="grid items-center gap-3 sm:grid-cols-2 xl:grid-cols-12">
        <div className="flex min-w-0 items-center gap-2.5 xl:col-span-2">
          <CropImage
            src={crop.crop.image}
            name={crop.crop.name}
            className="size-14 rounded-lg"
          />
          <div className="min-w-0">
            <h3 className="text-base font-bold">
              {crop.crop.name ?? t("crop")}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {[crop.crop_variety?.name, crop.season.name]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 xl:col-span-2">
          <LocationPinIcon className="size-4 shrink-0" />
          <strong className="text-xs sm:text-sm">{crop.farm.name}</strong>
        </div>
        <div className="text-xs xl:col-span-2">
          <p className="text-gray-500">{t("sown")}</p>
          <strong>{crop.sowing_date ?? t("unavailable")}</strong>
          <p className="mt-1 text-gray-500">
            {formatArea(crop.cultivated_area, locale) ?? t("unavailable")}{" "}
            {units.label(crop.area_unit)}
          </p>
        </div>
        <div className="text-xs xl:col-span-2">
          <p className="text-gray-500">
            {draft ? t("setupProgress") : t("expectedHarvest")}
          </p>
          <strong>
            {draft
              ? t("savedSteps", { count: crop.completed_step })
              : (crop.expected_harvest_date ??
                ([
                  crop.expected_harvest_date_min,
                  crop.expected_harvest_date_max,
                ]
                  .filter(Boolean)
                  .join(" – ") ||
                  t("unavailable")))}
          </strong>
        </div>
        <span className="bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200 w-fit rounded-full px-2.5 py-1 text-xs font-semibold xl:col-span-1">
          {t(`statuses.${crop.status}`)}
        </span>
        <div
          className="flex items-center justify-end gap-2 xl:col-span-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="shadow-theme-xs rounded-full border border-gray-200 p-2 dark:border-gray-700"
            aria-label={t("locate")}
            onClick={() => workspace.select(crop)}
          >
            <LocationPinIcon className="size-4" />
          </button>
          <button
            type="button"
            className={`${cropButton} !min-h-9 !rounded-lg px-3 py-2 text-xs`}
            onClick={() =>
              draft
                ? workspace.open({ id: crop.id })
                : workspace.details(crop.id)
            }
          >
            {!draft && <EyeIcon className="size-4" />}
            {t(draft ? "continueSetup" : "viewDetails")}
          </button>
          <Menu>
            <MenuButton
              aria-label={t("cropActions")}
              className="rounded-full border border-gray-200 p-2 dark:border-gray-700"
            >
              <MoreDotIcon className="size-4" />
            </MenuButton>
            <MenuItems
              anchor="bottom end"
              className="shadow-theme-lg z-999 rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <MenuItem>
                <button
                  type="button"
                  className="data-focus:bg-success-50 block w-full rounded-lg px-4 py-2 text-start dark:data-focus:bg-gray-800"
                  onClick={() => workspace.details(crop.id)}
                >
                  {t("viewDetails")}
                </button>
              </MenuItem>
              {editable && (
                <MenuItem>
                  <button
                    type="button"
                    className="data-focus:bg-success-50 block w-full rounded-lg px-4 py-2 text-start dark:data-focus:bg-gray-800"
                    onClick={() =>
                      workspace.open({
                        id: crop.id,
                        startStep: draft ? undefined : 1,
                      })
                    }
                  >
                    {t(draft ? "continueSetup" : "editCrop")}
                  </button>
                </MenuItem>
              )}
              <MenuItem>
                <button
                  type="button"
                  className="data-focus:bg-success-50 block w-full rounded-lg px-4 py-2 text-start dark:data-focus:bg-gray-800"
                  onClick={() => workspace.select(crop)}
                >
                  {t("locate")}
                </button>
              </MenuItem>
              {editable && (
                <MenuItem>
                  <button
                    type="button"
                    className="text-error-600 data-focus:bg-error-50 dark:data-focus:bg-error-950 block w-full rounded-lg px-4 py-2 text-start"
                    onClick={() =>
                      workspace.remove({
                        id: crop.id,
                        name: crop.crop.name ?? t("crop"),
                        status: crop.status,
                      })
                    }
                  >
                    {t(draft ? "deleteDraft" : "cancelCrop")}
                  </button>
                </MenuItem>
              )}
            </MenuItems>
          </Menu>
        </div>
      </div>
    </article>
  );
}
