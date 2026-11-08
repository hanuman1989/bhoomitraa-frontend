"use client";

import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import { yieldBenchmarkTypes } from "@/types/admin/cropYieldBenchmark";
import type { CropYieldBenchmarkFilters } from "@/types/admin/cropYieldBenchmark";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";

const empty: CropYieldBenchmarkFilters = {
  keyword: "",
  crop_id: "",
  crop_variety_id: "",
  season_id: "",
  benchmark_type: "",
  region_scope: "",
  is_active: "",
};
export default function CropYieldBenchmarksFilters({
  initialFilters,
  choices,
  selections,
}: {
  initialFilters: CropYieldBenchmarkFilters;
  choices: TimelineChoices;
  selections: TimelineSelections;
}) {
  const t = useTranslations("cropYieldBenchmarks"),
    router = useRouter(),
    params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { register, control, handleSubmit, reset, setValue } =
    useForm<CropYieldBenchmarkFilters>({ defaultValues: initialFilters });
  const crop = useWatch({ control, name: "crop_id" }),
    sameCrop = crop === initialFilters.crop_id;
  function apply(values: CropYieldBenchmarkFilters) {
    const query = new URLSearchParams(params.toString());
    query.delete("page");
    query.delete("locale");
    for (const [key, value] of Object.entries({
      ...values,
      keyword: values.keyword.trim(),
      crop_variety_id: values.crop_id ? values.crop_variety_id : "",
    })) {
      if (value !== "") query.set(key, value);
      else query.delete(key);
    }
    startTransition(() =>
      router.push(
        `/admin/crop-yield-benchmarks${query.size ? `?${query}` : ""}`,
        {
          scroll: false,
        },
      ),
    );
  }
  return (
    <form
      onSubmit={handleSubmit(apply)}
      aria-label={t("filters.label")}
      aria-busy={pending}
      className="shadow-theme-xs rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <fieldset disabled={pending} className="space-y-4">
        <legend className="sr-only">{t("filters.label")}</legend>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="rates-keyword">{t("filters.keyword")}</Label>
            <Input
              {...register("keyword")}
              id="rates-keyword"
              type="search"
              maxLength={150}
              placeholder={t("filters.placeholder")}
            />
          </div>
          <Controller
            name="crop_id"
            control={control}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="crop"
                id="rates-crop"
                label={t("fields.crop_id")}
                value={field.value}
                onChange={(value) => {
                  if (value !== field.value) {
                    field.onChange(value);
                    setValue("crop_variety_id", "");
                  }
                }}
                initialPage={choices.crop}
                initialSelection={selections.crop}
                disabled={pending}
                emptyLabel={t("filters.allCrops")}
                placeholder={t("filters.allCrops")}
              />
            )}
          />
          <Controller
            name="crop_variety_id"
            control={control}
            render={({ field }) => (
              <TimelineRelationSelect
                key={`variety-${crop}`}
                kind="variety"
                id="rates-variety"
                label={t("fields.crop_variety_id")}
                value={field.value}
                onChange={field.onChange}
                cropId={crop ? Number(crop) : null}
                initialPage={sameCrop ? choices.variety : undefined}
                initialSelection={sameCrop ? selections.variety : null}
                disabled={pending || !crop}
                emptyLabel={t("allVarieties")}
                placeholder={t("allVarieties")}
              />
            )}
          />
          <Controller
            name="season_id"
            control={control}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="season"
                id="rates-season"
                label={t("fields.season_id")}
                value={field.value}
                onChange={field.onChange}
                initialPage={choices.season}
                initialSelection={selections.season}
                disabled={pending}
                emptyLabel={t("allSeasons")}
                placeholder={t("allSeasons")}
              />
            )}
          />
          <FilterSelect
            {...register("benchmark_type")}
            id="benchmarks-type"
            label={t("fields.benchmark_type")}
          >
            <option value="">{t("filters.allTypes")}</option>
            {yieldBenchmarkTypes.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            {...register("region_scope")}
            id="rates-scope"
            label={t("fields.region_scope")}
          >
            <option value="">{t("filters.allScopes")}</option>
            <option value="all">{t("scopes.all")}</option>
            <option value="specific">{t("scopes.specific")}</option>
          </FilterSelect>
          <FilterSelect
            {...register("is_active")}
            id="rates-active"
            label={t("fields.status")}
          >
            <option value="">{t("filters.allStatuses")}</option>
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </FilterSelect>
          <div className="flex items-end justify-end gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-500 hover:bg-brand-600 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("filters.apply")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                reset(empty);
                apply(empty);
              }}
              className="border-brand-200 text-brand-500 dark:border-brand-800 rounded-lg border px-5 py-2.5 text-sm font-medium"
            >
              {t("filters.reset")}
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
