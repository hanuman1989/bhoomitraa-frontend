"use client";

import type { Ref } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import type {
  RegionScope,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import DistrictCheckboxTree from "./DistrictCheckboxTree";

export function validDistrictSelection(
  ids: number[],
  states: TimelineState[],
  savedIds: number[],
) {
  return (
    ids.length > 0 &&
    new Set(ids).size === ids.length &&
    ids.every(
      (id) =>
        Number.isSafeInteger(id) &&
        (savedIds.includes(id) ||
          states.some((state) =>
            state.districts.some(
              (district) => district.id === id && district.is_active,
            ),
          )),
    )
  );
}

export default function RegionScopeSelector({
  scope,
  scopeInput,
  states,
  selectedIds,
  onChange,
  districtRef,
  busy,
  scopeError,
  districtError,
}: {
  scope: RegionScope;
  scopeInput: UseFormRegisterReturn<"region_scope">;
  states: TimelineState[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  districtRef?: Ref<HTMLDivElement>;
  busy: boolean;
  scopeError?: string;
  districtError?: string;
}) {
  const t = useTranslations("stageTimelines");
  return (
    <ComponentCard
      title={t("regions.title")}
      className="shadow-theme-xs rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
    >
      <fieldset disabled={busy}>
        <legend className="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">
          {t("regions.scope")}{" "}
          <span aria-hidden="true" className="text-error-600">
            *
          </span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${scope === "all" ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-gray-200 dark:border-gray-700"}`}
          >
            <input
              {...scopeInput}
              type="radio"
              value="all"
              aria-describedby="timeline-scope-error"
              className="accent-brand-600 mt-1 size-4 shrink-0"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t("regions.all")}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("regions.allHelp")}
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${scope === "specific" ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-gray-200 dark:border-gray-700"}`}
          >
            <input
              {...scopeInput}
              type="radio"
              value="specific"
              aria-describedby="timeline-scope-error"
              className="accent-brand-600 mt-1 size-4 shrink-0"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t("regions.specific")}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("regions.specificHelp")}
              </span>
            </span>
          </label>
        </div>
      </fieldset>
      <p
        id="timeline-scope-error"
        role="alert"
        className="text-error-600 dark:text-error-400 text-xs"
      >
        {scopeError}
      </p>
      {scope === "specific" ? (
        <div ref={districtRef} tabIndex={-1}>
          <DistrictCheckboxTree
            states={states}
            selectedIds={selectedIds}
            onChange={onChange}
            disabled={busy}
            error={districtError}
          />
        </div>
      ) : (
        <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-lg p-3 text-sm">
          {t("regions.warning")}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("regions.legacy")}
      </p>
    </ComponentCard>
  );
}
