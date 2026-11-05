"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import { SearchIcon } from "@/icons";
import type { SeasonsFilterValues } from "@/types/admin/season";

export default function SeasonsFilters({
  initialFilters,
}: {
  initialFilters: SeasonsFilterValues;
}) {
  const t = useTranslations("seasons");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState(initialFilters);
  const [pending, startTransition] = useTransition();

  function navigate(reset: boolean) {
    if (pending) return;
    const query = new URLSearchParams(searchParams.toString());
    query.delete("page");
    const filters = reset ? { keyword: "", status: "" } : values;
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    }
    if (reset) setValues({ keyword: "", status: "" });
    startTransition(() =>
      router.push(`/admin/seasons${query.size ? `?${query}` : ""}`, {
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
        <div className="xl:col-span-5">
          <Label htmlFor="season-keyword">{t("filters.keyword")}</Label>
          <div className="relative">
            <Input
              id="season-keyword"
              value={values.keyword}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  keyword: event.target.value,
                }))
              }
              maxLength={150}
              placeholder={t("filters.placeholder")}
              className="ps-11"
            />
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-3 size-5 text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>
        <div className="xl:col-span-3">
          <FilterSelect
            id="season-filter-status"
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
            className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 h-11 rounded-lg px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          >
            {t("filters.apply")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => navigate(true)}
            className="focus-visible:outline-brand-500 h-11 rounded-lg border border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("filters.reset")}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
