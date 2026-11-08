"use client";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import {
  fertilizerTypes,
  fertilizerForms,
  fertilizerVerificationStatuses,
  type FertilizerFilters,
} from "@/types/admin/fertilizer";

const empty: FertilizerFilters = {
  keyword: "",
  fertilizer_type: "",
  form: "",
  verification_status: "",
  is_active: "",
};
export default function FertilizersFilters({
  initialFilters,
}: {
  initialFilters: FertilizerFilters;
}) {
  const t = useTranslations("fertilizers"),
    router = useRouter(),
    params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset } = useForm<FertilizerFilters>({
    defaultValues: initialFilters,
  });
  function apply(values: FertilizerFilters) {
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
      router.push(`/admin/fertilizers${query.size ? `?${query}` : ""}`, {
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
      <fieldset
        disabled={pending}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <legend className="sr-only">{t("filters.label")}</legend>
        <div>
          <Label htmlFor="fertilizers-keyword">{t("filters.keyword")}</Label>
          <Input
            {...register("keyword")}
            id="fertilizers-keyword"
            type="search"
            maxLength={150}
            placeholder={t("filters.placeholder")}
          />
        </div>
        <FilterSelect
          {...register("fertilizer_type")}
          id="fertilizers-type"
          label={t("fields.fertilizer_type")}
        >
          <option value="">{t("filters.allTypes")}</option>
          {fertilizerTypes.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          {...register("form")}
          id="fertilizers-form"
          label={t("fields.form")}
        >
          <option value="">{t("filters.allForms")}</option>
          {fertilizerForms.map((form) => (
            <option key={form} value={form}>
              {t(`forms.${form}`)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          {...register("verification_status")}
          id="fertilizers-verification"
          label={t("fields.verification_status")}
        >
          <option value="">{t("filters.allVerification")}</option>
          {fertilizerVerificationStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`verification.${status}`)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          {...register("is_active")}
          id="fertilizers-status"
          label={t("fields.status")}
        >
          <option value="">{t("filters.allStatuses")}</option>
          <option value="1">{t("active")}</option>
          <option value="0">{t("inactive")}</option>
        </FilterSelect>
        <div className="flex items-end justify-end gap-3 md:col-start-2 xl:col-start-4">
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
      </fieldset>
    </form>
  );
}
