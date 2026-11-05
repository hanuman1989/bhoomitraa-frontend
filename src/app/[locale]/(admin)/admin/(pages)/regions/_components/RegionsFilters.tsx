"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { SearchIcon } from "@/icons";
import type { Region, RegionFilterValues } from "@/types/admin/region";
import ParentRegionSelect from "./ParentRegionSelect";

interface RegionsFiltersProps {
  initialFilters: RegionFilterValues;
  initialParent?: Pick<Region, "id" | "name"> | null;
}

const emptyFilters: RegionFilterValues = {
  keyword: "",
  region_type: "",
  parent_id: "",
  is_active: "",
};

export default function RegionsFilters({
  initialFilters,
  initialParent,
}: RegionsFiltersProps) {
  const t = useTranslations("regions.filters");
  const types = useTranslations("regions.types");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<RegionFilterValues>({
    defaultValues: initialFilters,
    mode: "onTouched",
  });
  const busy = isPending || isSubmitting;
  const regionType = useWatch({ control, name: "region_type" });
  const allParents = regionType
    ? t(`allParentsByType.${regionType}`)
    : t("allParents");

  function navigate(values: RegionFilterValues) {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("page");
    query.delete("locale");
    const filters = {
      ...values,
      keyword: values.keyword.trim(),
      parent_id: values.region_type ? values.parent_id : "",
    };
    for (const [key, value] of Object.entries(filters)) {
      if (value === "") query.delete(key);
      else query.set(key, value);
    }
    const next = query.toString();
    startTransition(() =>
      router.push(next ? `${pathname}?${next}` : pathname, { scroll: false }),
    );
  }

  function handleReset() {
    reset(emptyFilters);
    navigate(emptyFilters);
  }

  return (
    <form
      onSubmit={handleSubmit(navigate)}
      noValidate
      aria-label={t("label")}
      aria-busy={busy}
      className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <fieldset
        disabled={busy}
        className="grid items-start gap-4 disabled:opacity-60 sm:grid-cols-2 xl:grid-cols-4"
      >
        <legend className="sr-only">{t("label")}</legend>
        <div>
          <Label
            htmlFor="regions-keyword"
            className="mb-2 text-gray-900 dark:text-gray-100"
          >
            {t("keyword")}
          </Label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-4 z-1 size-4 text-gray-500 dark:text-gray-400"
            />
            <Input
              {...register("keyword")}
              id="regions-keyword"
              type="search"
              maxLength={150}
              placeholder={t("searchPlaceholder")}
              className="h-12 rounded-md ps-10"
            />
          </div>
        </div>
        <FilterSelect
          {...register("region_type", {
            onChange: () =>
              setValue("parent_id", "", {
                shouldDirty: true,
                shouldValidate: true,
              }),
          })}
          id="regions-type"
          label={t("regionType")}
        >
          <option value="">{t("allTypes")}</option>
          <option value="country">{types("country")}</option>
          <option value="state">{types("state")}</option>
          <option value="district">{types("district")}</option>
          <option value="subdistrict">{types("subdistrict")}</option>
          <option value="village">{types("village")}</option>
        </FilterSelect>
        <Controller
          name="parent_id"
          control={control}
          rules={{
            validate: (value) =>
              value === "" ||
              (/^[1-9]\d*$/.test(value) &&
                Number.isSafeInteger(Number(value))) ||
              t("invalidParent"),
          }}
          render={({ field, fieldState }) => (
            <ParentRegionSelect
              key={regionType}
              id="regions-parent"
              type={regionType}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              initialParent={initialParent}
              label={t("parentRegion")}
              placeholder={regionType ? allParents : t("selectTypeFirst")}
              hint={
                regionType ? t("parentSelectionHint") : t("selectTypeFirst")
              }
              allLabel={allParents}
              required={false}
              disabled={busy || !regionType}
              error={fieldState.error?.message}
            />
          )}
        />
        <FilterSelect
          {...register("is_active")}
          id="regions-status"
          label={t("status")}
        >
          <option value="">{t("allStatuses")}</option>
          <option value="1">{t("active")}</option>
          <option value="0">{t("inactive")}</option>
        </FilterSelect>
      </fieldset>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 dark:focus-visible:outline-brand-400 rounded-md px-6 py-3 text-sm font-medium text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white"
        >
          {busy ? t("applying") : t("apply")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleReset}
          className="border-brand-200 text-brand-600 hover:bg-brand-50 focus-visible:outline-brand-500 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-500/10 dark:focus-visible:outline-brand-400 rounded-md border bg-white px-6 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900"
        >
          {t("reset")}
        </button>
      </div>
    </form>
  );
}
