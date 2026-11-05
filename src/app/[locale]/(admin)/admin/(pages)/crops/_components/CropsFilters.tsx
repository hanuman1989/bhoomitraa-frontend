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
import type { CropCategory } from "@/types/admin/cropCategory";
import type { CropsFilterValues } from "@/types/admin/crop";

export default function CropsFilters({
  initialFilters,
  categories,
}: {
  initialFilters: CropsFilterValues;
  categories: CropCategory[];
}) {
  const t = useTranslations("crops");
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    if (filters.category_id) params.set("category_id", filters.category_id);
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
      className="shadow-theme-xs mb-5 grid items-end gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] dark:border-gray-800 dark:bg-gray-900"
    >
      <div>
        <Label htmlFor="crop-search" className="sr-only">
          {t("filters.search")}
        </Label>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-3 z-1 size-5 text-gray-500"
          />
          <Input
            id="crop-search"
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
        id="crop-category-filter"
        label={t("fields.category")}
        value={filters.category_id}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          setFilters({ ...filters, category_id: event.target.value })
        }
      >
        <option value="">{t("filters.allCategories")}</option>
        {filters.category_id &&
          !categories.some(
            (category) => String(category.id) === filters.category_id,
          ) && (
            <option value={filters.category_id}>
              {t("categoryUnavailable", { id: filters.category_id })}
            </option>
          )}
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name ?? category.slug}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id="crop-status-filter"
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
        <option value="">{t("filters.allStatuses")}</option>
        <option value="1">{t("active")}</option>
        <option value="0">{t("inactive")}</option>
      </FilterSelect>
      <div className="flex gap-3">
        <button
          disabled={pending}
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 h-12 rounded-lg px-5 text-sm font-semibold whitespace-nowrap text-white focus-visible:outline-2 disabled:opacity-50"
        >
          {pending ? t("filters.applying") : t("filters.apply")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFilters({ keyword: "", category_id: "", status: "" });
            startTransition(() => router.push(pathname));
          }}
          className="focus-visible:outline-brand-500 h-12 rounded-lg border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {t("filters.reset")}
        </button>
      </div>
    </form>
  );
}
