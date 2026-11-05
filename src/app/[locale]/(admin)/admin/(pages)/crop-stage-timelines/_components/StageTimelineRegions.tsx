"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import type {
  StageTimelineFormValues,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import DistrictCheckboxTree from "./DistrictCheckboxTree";

export default function StageTimelineRegions({
  form,
  states,
  savedIds,
  busy,
}: {
  form: UseFormReturn<StageTimelineFormValues>;
  states: TimelineState[];
  savedIds: number[];
  busy: boolean;
}) {
  const t = useTranslations("stageTimelines");
  const {
    control,
    register,
    getValues,
    formState: { errors },
  } = form;
  const scope = useWatch({ control, name: "region_scope" });
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
              {...register("region_scope", { required: t("validation.scope") })}
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
              {...register("region_scope", { required: t("validation.scope") })}
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
        {errors.region_scope?.message}
      </p>
      <Controller
        name="region_ids"
        control={control}
        rules={{
          validate: (ids) =>
            getValues("region_scope") === "all" ||
            (ids.length > 0 &&
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
              )) ||
            t("validation.districts"),
        }}
        render={({ field }) =>
          scope === "specific" ? (
            <div ref={field.ref} tabIndex={-1}>
              <DistrictCheckboxTree
                states={states}
                selectedIds={field.value}
                onChange={field.onChange}
                disabled={busy}
                error={errors.region_ids?.message}
              />
            </div>
          ) : (
            <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 rounded-lg p-3 text-sm">
              {t("regions.warning")}
            </p>
          )
        }
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("regions.legacy")}
      </p>
    </ComponentCard>
  );
}
