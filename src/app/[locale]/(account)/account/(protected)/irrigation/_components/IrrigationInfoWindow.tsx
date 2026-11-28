"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon, CloseLineIcon, InfoIcon, PencilIcon } from "@/icons";
import type { IrrigationMapFeature } from "@/types/account/irrigation";
import type { IrrigationMapAction } from "./irrigationMap";
import { IrrigationStatusPill, IrrigationTypeTile } from "./IrrigationUi";

/** Map popup for the asset selected in Map view, where the list is hidden. */
export default function IrrigationInfoWindow({
  feature,
  onClose,
  onAction,
}: {
  feature: IrrigationMapFeature;
  onClose: () => void;
  onAction: (action: IrrigationMapAction, id: string) => void;
}) {
  const t = useTranslations("farmerIrrigation");
  const id = useId();
  const { properties } = feature;
  const actions = [
    { key: "details", Icon: InfoIcon, label: t("details.show") },
    { key: "edit", Icon: PencilIcon, label: t("actions.edit") },
  ] as const;
  return (
    <section
      data-farm-info-card
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-name`}
      className="font-outfit shadow-theme-xl relative flex w-full flex-col overflow-hidden rounded-2xl bg-white text-start text-gray-950 dark:bg-gray-900 dark:text-gray-100"
    >
      <header
        data-farm-info-header
        className="bg-blue-light-50 dark:bg-blue-light-950 flex shrink-0 items-start gap-3 p-4"
      >
        <IrrigationTypeTile
          assetType={properties.asset_type}
          sourceType={
            properties.asset_type === "source" ? properties.source_type : null
          }
          className="size-11 bg-white dark:bg-gray-900"
        />
        <div className="min-w-0 flex-1">
          <h3 id={`${id}-name`} className="text-lg font-bold break-words">
            {properties.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {properties.type_label}
          </p>
          <div className="mt-1.5">
            <IrrigationStatusPill
              status={properties.status}
              label={properties.status_label}
            />
          </div>
        </div>
        <button
          type="button"
          aria-label={t("actions.close")}
          onClick={onClose}
          className="hover:bg-blue-light-100 focus-visible:outline-success-600 -me-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 dark:hover:bg-gray-800"
        >
          <CloseLineIcon aria-hidden="true" className="size-5" />
        </button>
      </header>
      <nav
        data-farm-info-menu
        aria-label={t("actions.label")}
        className="custom-scrollbar min-h-0 overflow-y-auto px-4 py-2"
      >
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {actions.map(({ key, Icon, label }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => onAction(key, feature.id)}
                className="hover:bg-success-50 dark:hover:bg-success-950 focus-visible:outline-success-600 flex min-h-12 w-full items-center gap-4 rounded-lg px-2 text-start text-sm font-medium focus-visible:outline-2"
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronLeftIcon
                  aria-hidden="true"
                  className="size-4 rotate-180 rtl:rotate-0"
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
