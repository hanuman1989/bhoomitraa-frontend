"use client";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type {
  CropVarietiesFilterValues,
  VarietyRelation,
  VarietyRelationPage,
} from "@/types/admin/cropVariety";
import VarietyRelationSelect from "./VarietyRelationSelect";

export default function CropVarietiesFilters({
  initialFilters,
  crops,
  sources,
  selectedCrop,
  selectedSource,
}: {
  initialFilters: CropVarietiesFilterValues;
  crops: VarietyRelationPage;
  sources: VarietyRelationPage;
  selectedCrop: VarietyRelation | null;
  selectedSource: VarietyRelation | null;
}) {
  const t = useTranslations("cropVarieties");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  function navigate(reset: boolean) {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("page");
    for (const [key, value] of Object.entries(
      reset ? { keyword: "", crop_id: "", source_id: "", status: "" } : values,
    )) {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    }
    startTransition(() =>
      router.push(`/admin/crop-varieties${query.size ? `?${query}` : ""}`, {
        scroll: false,
      }),
    );
  }
  return (
    <form
      aria-label={t("filters.label")}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(false);
      }}
      className="shadow-theme-xs mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <fieldset
        disabled={pending}
        className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-6"
      >
        <legend className="sr-only">{t("filters.label")}</legend>
        <div className="xl:col-span-2">
          <Label htmlFor="variety-keyword">{t("filters.keyword")}</Label>
          <Input
            id="variety-keyword"
            value={values.keyword}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                keyword: event.target.value,
              }))
            }
            maxLength={150}
            placeholder={t("filters.placeholder")}
          />
        </div>
        <VarietyRelationSelect
          kind="crop"
          id="variety-filter-crop"
          label={t("fields.crop")}
          value={values.crop_id}
          onChange={(value) =>
            setValues((previous) => ({ ...previous, crop_id: value }))
          }
          initialPage={crops}
          initialSelection={selectedCrop}
          disabled={pending}
        />
        <div>
          <Label htmlFor="variety-filter-status">{t("fields.status")}</Label>
          <select
            id="variety-filter-status"
            value={values.status}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                status:
                  event.target.value === "1"
                    ? "1"
                    : event.target.value === "0"
                      ? "0"
                      : "",
              }))
            }
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">{t("filters.allStatus")}</option>
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </select>
        </div>
        <VarietyRelationSelect
          kind="source"
          emptyLabel={t("filters.allSources")}
          id="variety-filter-source"
          label={t("fields.source")}
          value={values.source_id}
          onChange={(value) =>
            setValues((previous) => ({ ...previous, source_id: value }))
          }
          initialPage={sources}
          initialSelection={selectedSource}
          disabled={pending}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-600 hover:bg-brand-700 h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("filters.apply")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => navigate(true)}
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            {t("filters.reset")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
