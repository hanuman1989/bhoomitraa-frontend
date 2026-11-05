"use client";

import {
  useState,
  useTransition,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { SearchIcon } from "@/icons";
import type { CropCategoriesFilterValues } from "@/types/admin/cropCategory";

export default function CropCategoriesFilters({
  initialFilters,
}: {
  initialFilters: CropCategoriesFilterValues;
}) {
  const t = useTranslations("cropCategories");
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    if (filters.status !== "") params.set("status", filters.status);
    const query = params.toString();
    startTransition(() =>
      router.push(query ? `${pathname}?${query}` : pathname),
    );
  }
  return (
    <form
      onSubmit={submit}
      aria-label={t("filters.label")}
      aria-busy={pending}
      className="shadow-theme-xs mb-6 grid items-end gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)] dark:border-gray-800 dark:bg-gray-900"
    >
      <div>
        <Label htmlFor="category-keyword" className="sr-only">
          {t("filters.search")}
        </Label>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-3 z-1 size-5 text-gray-500 dark:text-gray-400"
          />
          <Input
            id="category-keyword"
            type="search"
            maxLength={150}
            value={filters.keyword}
            onChange={(event) =>
              setFilters({ ...filters, keyword: event.target.value })
            }
            placeholder={t("filters.placeholder")}
            className="h-12 ps-10"
          />
        </div>
      </div>
      <FilterSelect
        id="category-status"
        label={t("fields.status")}
        value={filters.status}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          const value = event.target.value;
          setFilters({
            ...filters,
            status: value === "1" || value === "0" ? value : "",
          });
        }}
      >
        <option value="">{t("filters.all")}</option>
        <option value="1">{t("active")}</option>
        <option value="0">{t("inactive")}</option>
      </FilterSelect>
      <div className="flex gap-3 sm:col-span-2 2xl:col-span-1 2xl:justify-end">
        <button
          disabled={pending}
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 h-12 rounded-lg px-6 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
        >
          {pending ? t("filters.applying") : t("filters.apply")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFilters({ keyword: "", status: "" });
            startTransition(() => router.push(pathname));
          }}
          className="focus-visible:outline-brand-500 h-12 rounded-lg border border-gray-300 px-6 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {t("filters.reset")}
        </button>
      </div>
    </form>
  );
}
