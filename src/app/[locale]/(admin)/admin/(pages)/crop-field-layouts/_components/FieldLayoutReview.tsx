"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLanguage, languages } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import { PencilIcon } from "@/icons";
import type { ReactNode } from "react";
import type {
  CropFieldLayoutOptions,
  CropFieldLayoutSections,
  FieldLayoutStep,
} from "@/types/admin/cropFieldLayout";
import FieldLayoutPreview, { ConfigurationSummary } from "./FieldLayoutPreview";

const listPath = "/admin/crop-field-layouts";
const outline =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-2 last:border-b-0 sm:grid-cols-2 sm:gap-3 dark:border-gray-800">
      <dt className="text-sm text-gray-600 dark:text-gray-400">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-words whitespace-pre-wrap text-gray-900 dark:text-white">
        {children}
      </dd>
    </div>
  );
}

export default function FieldLayoutReview({
  sections,
  options,
  status,
  onEdit,
  busy,
  viewId,
}: {
  sections: CropFieldLayoutSections;
  options: CropFieldLayoutOptions;
  status: "active" | "inactive" | "draft";
  onEdit?: (step: FieldLayoutStep) => void;
  busy?: boolean;
  viewId?: number;
}) {
  const t = useTranslations("cropFieldLayouts");
  const {
    basic_details: basic,
    layout_configuration: config,
    translations,
  } = sections;
  const definition = Array.isArray(config.definition)
    ? options.layout_types.find(({ value }) => value === config.layout_type)
    : config.definition;
  const obsolete =
    !definition ||
    config.configuration_version !== definition.configuration_version;
  const ids = [
    ...new Set([
      ...languages.map(({ id }) => id).filter((id) => translations[id]),
      ...Object.keys(translations),
    ]),
  ];
  const unrestricted = t("notRestricted");
  const fallback = t("notAvailable");

  function edit(step: FieldLayoutStep, section: string) {
    return (
      onEdit && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onEdit(step)}
          className={`${outline} absolute end-4 top-3 sm:end-6`}
          aria-label={t("editSection", { section })}
        >
          <PencilIcon className="size-4" aria-hidden="true" />
          {t("actions.edit")}
        </button>
      )
    );
  }

  return (
    <div className="space-y-4">
      <ComponentCard
        title={t("step1")}
        className="relative [&>div:first-child]:pe-32"
      >
        {edit(1, t("step1"))}
        <div className="grid gap-3 md:grid-cols-2 md:gap-6">
          <dl>
            <Detail label={t("basic.cropApplicability")}>
              {t(
                basic.crop_scope === "all"
                  ? "basic.allCrops"
                  : "basic.specificCrops",
              )}
            </Detail>
            {basic.crop_scope === "specific" && (
              <Detail label={t("columns.crops")}>
                <span className="flex flex-wrap gap-1.5">
                  {basic.crops.length
                    ? basic.crops.map((crop) => (
                        <Badge key={crop.id} size="sm" color="primary">
                          {crop.name ?? t("recordId", { id: crop.id })}
                        </Badge>
                      ))
                    : fallback}
                </span>
              </Detail>
            )}
            {basic.crop_scope === "specific" && basic.crops.length === 1 && (
              <Detail label={t("basic.cropVariety")}>
                {basic.crop_variety?.name ??
                  (basic.crop_variety_id
                    ? t("recordId", { id: basic.crop_variety_id })
                    : t("basic.allVarieties"))}
              </Detail>
            )}
            <Detail label={t("basic.sowingMethod")}>
              {basic.sowing_method?.title ??
                (basic.sowing_method_id
                  ? t("recordId", { id: basic.sowing_method_id })
                  : unrestricted)}
            </Detail>
          </dl>
          <dl>
            <Detail label={t("basic.farmingType")}>
              {basic.farming_type_label ??
                (basic.farming_type ? fallback : unrestricted)}
            </Detail>
            <Detail label={t("basic.growingSystem")}>
              {basic.growing_system_label ??
                (basic.growing_system ? fallback : unrestricted)}
            </Detail>
            <Detail label={t("basic.layoutType")}>
              {basic.layout_type_label ?? fallback}
            </Detail>
            <Detail label={t("basic.sortOrder")}>{basic.sort_order}</Detail>
            <Detail label={t(onEdit ? "requestedStatus" : "columns.status")}>
              <Badge
                size="sm"
                color={
                  status === "active"
                    ? "success"
                    : status === "draft"
                      ? "warning"
                      : "light"
                }
              >
                {t(status)}
              </Badge>
            </Detail>
          </dl>
        </div>
      </ComponentCard>
      <ComponentCard
        title={t("step2")}
        className="relative [&>div:first-child]:pe-32"
      >
        {edit(2, t("step2"))}
        {obsolete ? (
          <div className="space-y-3">
            <p
              role="status"
              className="text-warning-700 dark:text-warning-400 text-sm"
            >
              {t("configuration.unavailable")}
            </p>
            {config.reference_note && (
              <dl>
                <Detail label={t("referenceLabel")}>
                  {config.reference_note}
                </Detail>
              </dl>
            )}
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <ConfigurationSummary
                definition={definition}
                configuration={config.configuration}
              />
              {config.reference_note && (
                <dl>
                  <Detail label={t("referenceLabel")}>
                    {config.reference_note}
                  </Detail>
                </dl>
              )}
            </div>
            <FieldLayoutPreview
              definition={definition}
              configuration={config.configuration}
            />
          </div>
        )}
      </ComponentCard>
      <ComponentCard
        title={t("step3")}
        className="relative [&>div:first-child]:pe-32"
      >
        {edit(3, t("step3"))}
        {ids.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("noTranslations")}
          </p>
        ) : (
          <TabGroup>
            <TabList className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
              {ids.map((id) => (
                <Tab
                  key={id}
                  className="focus-visible:outline-brand-500 data-selected:bg-brand-50 data-selected:text-brand-700 dark:data-selected:bg-brand-500/15 dark:data-selected:text-brand-300 flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-semibold text-gray-600 focus-visible:outline-2 dark:text-gray-300"
                >
                  <span className="uppercase">{id}</span>
                  {languages.some((language) => language.id === id)
                    ? getLanguage(id).name
                    : translations[id].language_name}
                </Tab>
              ))}
            </TabList>
            <TabPanels className="pt-2">
              {ids.map((id) => (
                <TabPanel
                  key={id}
                  className="focus-visible:outline-brand-500 rounded-lg px-2 focus-visible:outline-2"
                >
                  <dl>
                    <Detail label={t("translations.name")}>
                      <span lang={id} dir="auto">
                        {translations[id].title}
                      </span>
                    </Detail>
                    <Detail label={t("translations.description")}>
                      <span lang={id} dir="auto">
                        {translations[id].description || fallback}
                      </span>
                    </Detail>
                    <Detail label={t("translations.importantConsiderations")}>
                      <span lang={id} dir="auto">
                        {translations[id].important_considerations || fallback}
                      </span>
                    </Detail>
                  </dl>
                </TabPanel>
              ))}
            </TabPanels>
          </TabGroup>
        )}
      </ComponentCard>
      {viewId !== undefined && (
        <div className="flex flex-wrap gap-2">
          <Link href={listPath} className={outline}>
            {t("back")}
          </Link>
          <Link
            href={`${listPath}/${viewId}/edit`}
            className="bg-brand-500 hover:bg-brand-600 inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white"
          >
            {t("actions.edit")}
          </Link>
        </div>
      )}
    </div>
  );
}
