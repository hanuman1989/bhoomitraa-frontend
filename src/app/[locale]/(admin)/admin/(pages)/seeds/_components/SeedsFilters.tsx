"use client";

import { useTransition } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import {
  materialTypes,
  seedVerificationStatuses,
  type SeedFilters,
} from "@/types/admin/seed";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";

const empty: SeedFilters = {
  keyword: "",
  crop_id: "",
  crop_variety_id: "",
  material_type: "",
  is_active: "",
  verification_status: "",
  setup_status: "",
};
export default function SeedsFilters({
  initialFilters,
  choices,
  selections,
}: {
  initialFilters: SeedFilters;
  choices: TimelineChoices;
  selections: TimelineSelections;
}) {
  const t = useTranslations("seeds"),
    router = useRouter(),
    params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { register, control, handleSubmit, setValue, reset } =
    useForm<SeedFilters>({ defaultValues: initialFilters });
  const crop = useWatch({ control, name: "crop_id" }),
    sameCrop = crop === initialFilters.crop_id;
  function apply(values: SeedFilters) {
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
      router.push(`/admin/seeds${query.size ? `?${query}` : ""}`, {
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
            <Label htmlFor="seeds-keyword">{t("filters.keyword")}</Label>
            <Input
              {...register("keyword")}
              id="seeds-keyword"
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
                id="seeds-crop"
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
                id="seeds-variety"
                label={t("fields.crop_variety_id")}
                value={field.value}
                onChange={field.onChange}
                cropId={crop ? Number(crop) : null}
                disabled={pending || !crop}
                initialPage={sameCrop ? choices.variety : undefined}
                initialSelection={sameCrop ? selections.variety : null}
                emptyLabel={t("filters.allVarieties")}
              />
            )}
          />
          <FilterSelect
            {...register("material_type")}
            id="seeds-material"
            label={t("fields.material_type")}
          >
            <option value="">{t("filters.allMaterials")}</option>
            {materialTypes.map((value) => (
              <option key={value} value={value}>
                {t(`materials.${value}`)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            {...register("is_active")}
            id="seeds-status"
            label={t("fields.is_active")}
          >
            <option value="">{t("filters.allStatuses")}</option>
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </FilterSelect>
        </div>
        <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            {...register("verification_status")}
            id="seeds-verification"
            label={t("fields.verification_status")}
          >
            <option value="">{t("filters.allVerification")}</option>
            {seedVerificationStatuses.map((value) => (
              <option key={value} value={value}>
                {t(`verification.${value}`)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            {...register("setup_status")}
            id="seeds-setup"
            label={t("fields.setup_status")}
          >
            <option value="">{t("filters.allSetup")}</option>
            <option value="draft">{t("setup.draft")}</option>
            <option value="completed">{t("setup.completed")}</option>
          </FilterSelect>
          <div className="flex justify-end gap-3 md:col-span-2 xl:col-span-3">
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
        </div>
      </fieldset>
    </form>
  );
}
