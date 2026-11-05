"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import type {
  CropStageCropOption,
  CropStagesFilterValues,
} from "@/types/admin/cropStage";

export default function CropStagesFilters({
  initialFilters,
  crops,
}: {
  initialFilters: CropStagesFilterValues;
  crops: CropStageCropOption[];
}) {
  const t = useTranslations("cropStages");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  function navigate(reset: boolean) {
    if (pending) return;
    const query = new URLSearchParams(searchParams.toString());
    query.delete("page");
    for (const [key, value] of Object.entries(
      reset ? { keyword: "", crop_id: "", status: "" } : values,
    )) {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    }
    if (reset) setValues({ keyword: "", crop_id: "", status: "" });
    startTransition(() =>
      router.push(`/admin/crop-stages${query.size ? `?${query}` : ""}`, {
        scroll: false,
      }),
    );
  }
  return (
    <form
      aria-label={t("filters.label")}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(false);
      }}
      className="shadow-theme-xs rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <fieldset
        disabled={pending}
        className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-12"
      >
        <legend className="sr-only">{t("filters.label")}</legend>
        <div className="xl:col-span-4">
          <Label htmlFor="stage-keyword">{t("filters.keyword")}</Label>
          <Input
            id="stage-keyword"
            value={values.keyword}
            maxLength={150}
            placeholder={t("filters.placeholder")}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                keyword: event.target.value,
              }))
            }
          />
        </div>
        <div className="xl:col-span-2">
          <FilterSelect
            id="stage-filter-crop"
            label={t("fields.crop")}
            value={values.crop_id}
            className="h-11"
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setValues((previous) => ({
                ...previous,
                crop_id: event.target.value,
              }))
            }
          >
            <option value="">{t("filters.allCrops")}</option>
            {values.crop_id &&
              !crops.some((crop) => String(crop.id) === values.crop_id) && (
                <option value={values.crop_id}>
                  {t("form.missingCrop", { id: values.crop_id })}
                </option>
              )}
            {crops.map((crop) => (
              <option key={crop.id} value={String(crop.id)}>
                {crop.name}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="xl:col-span-2">
          <FilterSelect
            id="stage-filter-status"
            label={t("fields.status")}
            value={values.status}
            className="h-11"
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              setValues((previous) => ({
                ...previous,
                status:
                  event.target.value === "1" || event.target.value === "0"
                    ? event.target.value
                    : "",
              }))
            }
          >
            <option value="">{t("filters.allStatus")}</option>
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </FilterSelect>
        </div>
        <div className="flex gap-3 md:col-span-2 xl:col-span-4 xl:justify-end">
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 h-11 rounded-lg px-5 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
          >
            {t("filters.apply")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => navigate(true)}
            className="focus-visible:outline-brand-500 h-11 rounded-lg border border-gray-300 px-5 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("filters.reset")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
