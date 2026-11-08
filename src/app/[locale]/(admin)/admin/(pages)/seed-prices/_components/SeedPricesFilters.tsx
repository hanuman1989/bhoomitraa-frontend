"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import { seedPriceTypes, type SeedPriceFilters } from "@/types/admin/seedPrice";
import type {
  TimelineOption,
  TimelineOptionPage,
} from "@/types/admin/cropStageTimeline";

const empty: SeedPriceFilters = {
  keyword: "",
  seed_id: "",
  price_type: "",
  region_scope: "",
  is_active: "",
};
export default function SeedPricesFilters({
  initialFilters,
  choices,
  selection,
}: {
  initialFilters: SeedPriceFilters;
  choices?: TimelineOptionPage;
  selection: TimelineOption | null;
}) {
  const t = useTranslations("seedPrices"),
    router = useRouter(),
    params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { register, control, handleSubmit, reset } = useForm<SeedPriceFilters>({
    defaultValues: initialFilters,
  });
  function apply(values: SeedPriceFilters) {
    const query = new URLSearchParams(params.toString());
    query.delete("page");
    query.delete("locale");
    for (const [key, value] of Object.entries({
      ...values,
      keyword: values.keyword.trim(),
    })) {
      if (value !== "") query.set(key, value);
      else query.delete(key);
    }
    startTransition(() =>
      router.push(`/admin/seed-prices${query.size ? `?${query}` : ""}`, {
        scroll: false,
      }),
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label htmlFor="prices-keyword">{t("filters.keyword")}</Label>
            <Input
              {...register("keyword")}
              id="prices-keyword"
              type="search"
              maxLength={150}
              placeholder={t("filters.placeholder")}
            />
          </div>
          <Controller
            name="seed_id"
            control={control}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="seed"
                id="prices-seed"
                label={t("fields.seed_id")}
                value={field.value}
                onChange={field.onChange}
                initialPage={choices}
                initialSelection={selection}
                disabled={pending}
                emptyLabel={t("filters.allSeeds")}
                placeholder={t("filters.allSeeds")}
              />
            )}
          />
          <FilterSelect
            {...register("price_type")}
            id="prices-type"
            label={t("fields.price_type")}
          >
            <option value="">{t("filters.allTypes")}</option>
            {seedPriceTypes.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            {...register("region_scope")}
            id="prices-scope"
            label={t("fields.region_scope")}
          >
            <option value="">{t("filters.allScopes")}</option>
            <option value="all">{t("scopes.all")}</option>
            <option value="specific">{t("scopes.specific")}</option>
          </FilterSelect>
          <FilterSelect
            {...register("is_active")}
            id="prices-active"
            label={t("fields.status")}
          >
            <option value="">{t("filters.allStatuses")}</option>
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </FilterSelect>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
            className="border-brand-200 text-brand-500 dark:border-brand-800 rounded-lg border px-6 py-2.5 text-sm font-medium"
          >
            {t("filters.reset")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
