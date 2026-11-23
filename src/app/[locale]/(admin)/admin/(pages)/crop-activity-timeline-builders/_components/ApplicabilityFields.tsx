"use client";

import { useTranslations } from "next-intl";
import DistrictCheckboxTree from "@/components/admin/common/DistrictCheckboxTree";
import CropActivityTemplateMultiSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-activity-templates/_components/CropActivityTemplateMultiSelect";
import { applicabilityScopes } from "@/types/admin/cropActivityTemplate";
import type { TemplateSelectionOption } from "@/types/admin/cropActivityTemplate";
import type { TimelineState } from "@/types/admin/cropStageTimeline";
import type { ApplicabilityValues, BuilderOption } from "./types";

/** Specific scopes need at least one selection; All scopes carry none. */
export function applicabilityComplete(value: ApplicabilityValues) {
  return (
    (value.variety_scope === "all" || value.crop_variety_ids.length > 0) &&
    (value.season_scope === "all" || value.season_ids.length > 0) &&
    (value.region_scope === "all" || value.region_ids.length > 0)
  );
}

function ScopeCards({
  name,
  legend,
  value,
  labels,
  onChange,
}: {
  name: string;
  legend: string;
  value: "all" | "specific";
  labels: Record<"all" | "specific", [string, string]>;
  onChange: (scope: "all" | "specific") => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {legend}{" "}
        <span aria-hidden="true" className="text-error-600">
          *
        </span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {applicabilityScopes.map((scope) => (
          <label
            key={scope}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
              value === scope
                ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={scope}
              checked={value === scope}
              onChange={() => onChange(scope)}
              className="accent-brand-600 mt-0.5 size-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                {labels[scope][0]}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {labels[scope][1]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ApplicabilityFields({
  idPrefix,
  value,
  onChange,
  cropId,
  varieties,
  seasons,
  sources,
  states,
  disabled,
  error,
}: {
  idPrefix: string;
  value: ApplicabilityValues;
  onChange: (value: ApplicabilityValues) => void;
  cropId: number | null;
  varieties: BuilderOption[];
  seasons: BuilderOption[];
  sources: TemplateSelectionOption[];
  states: TimelineState[];
  disabled: boolean;
  error?: string;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const tr = useTranslations("stageTimelines.regions");
  const labelled = (options: BuilderOption[], ids: number[]) =>
    ids.map((id) => ({
      id,
      label:
        options.find((option) => option.id === id)?.name ??
        tt("recordId", { id }),
    }));
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <ScopeCards
          name={`${idPrefix}-variety-scope`}
          legend={tt("fields.varietyApplicability")}
          value={value.variety_scope}
          labels={{
            all: [
              tt("applicability.allVarieties"),
              tt("applicability.allVarietiesHelp"),
            ],
            specific: [
              tt("applicability.specificVarieties"),
              tt("applicability.specificVarietiesHelp"),
            ],
          }}
          onChange={(scope) =>
            onChange({
              ...value,
              variety_scope: scope,
              crop_variety_ids: scope === "all" ? [] : value.crop_variety_ids,
            })
          }
        />
        {value.variety_scope === "specific" && (
          <CropActivityTemplateMultiSelect
            key={`${idPrefix}-variety-${cropId}`}
            kind="variety"
            id={`${idPrefix}-varieties`}
            label={t("fields.varieties")}
            placeholder={tt("placeholders.varieties")}
            value={value.crop_variety_ids}
            onChange={(ids) => onChange({ ...value, crop_variety_ids: ids })}
            cropId={cropId}
            initialSelected={labelled(varieties, value.crop_variety_ids)}
            required
            disabled={disabled || !cropId}
          />
        )}
      </div>
      <div className="space-y-3">
        <ScopeCards
          name={`${idPrefix}-season-scope`}
          legend={tt("fields.seasonApplicability")}
          value={value.season_scope}
          labels={{
            all: [
              tt("applicability.allSeasons"),
              tt("applicability.allSeasonsHelp"),
            ],
            specific: [
              tt("applicability.specificSeasons"),
              tt("applicability.specificSeasonsHelp"),
            ],
          }}
          onChange={(scope) =>
            onChange({
              ...value,
              season_scope: scope,
              season_ids: scope === "all" ? [] : value.season_ids,
            })
          }
        />
        {value.season_scope === "specific" && (
          <CropActivityTemplateMultiSelect
            kind="season"
            id={`${idPrefix}-seasons`}
            label={t("fields.seasons")}
            placeholder={tt("placeholders.seasons")}
            value={value.season_ids}
            onChange={(ids) => onChange({ ...value, season_ids: ids })}
            initialSelected={labelled(seasons, value.season_ids)}
            required
            disabled={disabled}
          />
        )}
      </div>
      <div className="space-y-3">
        <ScopeCards
          name={`${idPrefix}-region-scope`}
          legend={tr("scope")}
          value={value.region_scope}
          labels={{
            all: [tr("all"), tr("allHelp")],
            specific: [tr("specific"), tr("specificHelp")],
          }}
          onChange={(scope) =>
            onChange({
              ...value,
              region_scope: scope,
              region_ids: scope === "all" ? [] : value.region_ids,
            })
          }
        />
        {value.region_scope === "all" ? (
          <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-lg p-3 text-xs">
            {tr("warning")}
          </p>
        ) : (
          <DistrictCheckboxTree
            states={states}
            selectedIds={value.region_ids}
            onChange={(ids) => onChange({ ...value, region_ids: ids })}
            disabled={disabled}
          />
        )}
      </div>
      <div>
        <CropActivityTemplateMultiSelect
          kind="source"
          id={`${idPrefix}-sources`}
          label={tt("fields.knowledgeSources")}
          placeholder={tt("placeholders.knowledgeSources")}
          value={value.knowledge_source_ids}
          onChange={(ids) => onChange({ ...value, knowledge_source_ids: ids })}
          initialSelected={sources}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {tt("form.knowledgeSourcesHelp")}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-error-600 dark:text-error-400 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
