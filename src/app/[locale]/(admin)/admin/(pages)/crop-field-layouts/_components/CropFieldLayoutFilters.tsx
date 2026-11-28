"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Button from "@/components/admin/ui/button/Button";
import Tooltip from "@/components/common/Tooltip";
import { SearchIcon } from "@/icons";
import type {
  CropFieldLayoutFilters,
  CropFieldLayoutOptions,
} from "@/types/admin/cropFieldLayout";
import type { TimelineOption } from "@/types/admin/cropStageTimeline";
import TimelineRelationSelect from "../../crop-stage-timelines/_components/TimelineRelationSelect";
import SowingMethodSelect from "./SowingMethodSelect";

const listPath = "/admin/crop-field-layouts";
const empty = {
  crop_id: "",
  sowing_method_id: "",
  layout_type: "",
  farming_type: "",
  keyword: "",
} satisfies CropFieldLayoutFilters;

function listHref(filters: CropFieldLayoutFilters) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value) query.set(name, value);
  }
  return query.size ? `${listPath}?${query}` : listPath;
}

export default function CropFieldLayoutFiltersForm({
  filters,
  options,
  crop,
  method,
}: {
  filters: CropFieldLayoutFilters;
  options: CropFieldLayoutOptions;
  crop: TimelineOption | null;
  method: TimelineOption | null;
}) {
  const t = useTranslations("cropFieldLayouts.filters");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { control, register, handleSubmit, reset } =
    useForm<CropFieldLayoutFilters>({
      defaultValues: filters,
    });

  function apply(next: CropFieldLayoutFilters) {
    startTransition(() => router.push(listHref(next), { scroll: false }));
  }

  return (
    <form
      aria-labelledby="field-layout-filters-title"
      aria-busy={pending}
      onSubmit={handleSubmit((values) =>
        apply({ ...values, keyword: filters.keyword }),
      )}
      className="shadow-theme-xs rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <h2
        id="field-layout-filters-title"
        className="mb-4 text-base font-semibold text-gray-900 dark:text-white"
      >
        {t("title")}
      </h2>
      <fieldset disabled={pending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Controller
            name="crop_id"
            control={control}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="crop"
                id="field-layout-filter-crop"
                label={t("crop")}
                value={field.value}
                onChange={field.onChange}
                initialSelection={crop}
                emptyLabel={t("allCrops")}
                placeholder={t("allCrops")}
                disabled={pending}
              />
            )}
          />
          <Controller
            name="sowing_method_id"
            control={control}
            render={({ field }) => (
              <SowingMethodSelect
                id="field-layout-filter-method"
                label={t("method")}
                value={field.value}
                onChange={field.onChange}
                initialSelection={method}
                emptyLabel={t("allMethods")}
                placeholder={t("allMethods")}
                disabled={pending}
              />
            )}
          />
          <FilterSelect
            {...register("layout_type")}
            id="field-layout-filter-layout"
            label={t("layoutType")}
          >
            <option value="">{t("allLayouts")}</option>
            {options.layout_types.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            {...register("farming_type")}
            id="field-layout-filter-farming"
            label={t("farmingType")}
          >
            <option value="">{t("allFarmingTypes")}</option>
            {options.farming_types.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              reset(empty);
              apply(empty);
            }}
            className="h-9 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t("reset")}
          </button>
          <Button disabled={pending}>{t("apply")}</Button>
        </div>
      </fieldset>
    </form>
  );
}

export function CropFieldLayoutSearch({
  filters,
}: {
  filters: CropFieldLayoutFilters;
}) {
  const t = useTranslations("cropFieldLayouts.filters");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm<{ keyword: string }>({
    defaultValues: { keyword: filters.keyword },
  });

  return (
    <form
      aria-busy={pending}
      role="search"
      className="relative w-full sm:w-64"
      onSubmit={handleSubmit(({ keyword }) => {
        startTransition(() =>
          router.push(listHref({ ...filters, keyword: keyword.trim() }), {
            scroll: false,
          }),
        );
      })}
    >
      <Input
        {...register("keyword")}
        aria-label={t("search")}
        placeholder={t("searchPlaceholder")}
        maxLength={150}
        className="pe-10!"
        disabled={pending}
      />
      <Tooltip content={t("search")} className="absolute inset-y-0 end-0">
        <button
          type="submit"
          aria-label={t("search")}
          disabled={pending}
          className="text-brand-600 hover:text-brand-800 dark:text-brand-400 flex size-9 items-center justify-center rounded-lg disabled:opacity-50"
        >
          <SearchIcon aria-hidden="true" className="size-4" />
        </button>
      </Tooltip>
    </form>
  );
}
