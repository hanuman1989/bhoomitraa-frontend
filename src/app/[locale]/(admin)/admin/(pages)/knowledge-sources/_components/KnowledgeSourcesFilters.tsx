"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { SearchIcon } from "@/icons";
import {
  sourceTypes,
  verificationStatuses,
  type KnowledgeSourcesFilterValues,
} from "@/types/admin/knowledgeSource";

export default function KnowledgeSourcesFilters({
  initialFilters,
}: {
  initialFilters: KnowledgeSourcesFilterValues;
}) {
  const t = useTranslations("knowledgeSources");
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }
  return (
    <form
      onSubmit={submit}
      aria-label={t("filters.label")}
      aria-busy={pending}
      className="shadow-theme-xs mb-5 grid items-end gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))_auto] dark:border-gray-800 dark:bg-gray-900"
    >
      <div>
        <Label htmlFor="source-search">{t("filters.search")}</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-3 z-1 size-5 text-gray-500"
          />
          <Input
            id="source-search"
            type="search"
            maxLength={150}
            value={filters.keyword}
            onChange={(e) =>
              setFilters({ ...filters, keyword: e.target.value })
            }
            placeholder={t("filters.placeholder")}
            className="ps-10"
          />
        </div>
      </div>
      <FilterSelect
        id="source-type-filter"
        label={t("fields.source_type")}
        value={filters.source_type}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const value = e.target.value;
          setFilters({
            ...filters,
            source_type: sourceTypes.find((type) => type === value) ?? "",
          });
        }}
        className="h-11"
      >
        <option value="">{t("filters.allTypes")}</option>
        {sourceTypes.map((type) => (
          <option key={type} value={type}>
            {t(`types.${type}`)}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id="source-status-filter"
        label={t("fields.verification_status")}
        value={filters.verification_status}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const value = e.target.value;
          setFilters({
            ...filters,
            verification_status:
              verificationStatuses.find((status) => status === value) ?? "",
          });
        }}
        className="h-11"
      >
        <option value="">{t("filters.allStatuses")}</option>
        {verificationStatuses.map((status) => (
          <option key={status} value={status}>
            {t(`statuses.${status}`)}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id="source-language-filter"
        label={t("fields.language")}
        value={filters.language}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          setFilters({
            ...filters,
            language:
              e.target.value === "en" || e.target.value === "hi"
                ? e.target.value
                : "",
          })
        }
        className="h-11"
      >
        <option value="">{t("filters.allLanguages")}</option>
        <option value="en">{t("languages.en")}</option>
        <option value="hi">{t("languages.hi")}</option>
      </FilterSelect>
      <div className="flex gap-2 sm:col-span-2 2xl:col-span-1">
        <button
          disabled={pending}
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 h-11 flex-1 rounded-lg px-4 text-sm font-medium whitespace-nowrap text-white focus-visible:outline-2 disabled:opacity-50"
        >
          {pending ? t("filters.applying") : t("filters.apply")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFilters({
              keyword: "",
              source_type: "",
              verification_status: "",
              language: "",
            });
            startTransition(() => router.push(pathname));
          }}
          className="border-brand-300 text-brand-600 hover:bg-brand-50 focus-visible:outline-brand-500 dark:text-brand-300 h-11 rounded-lg border px-4 text-sm font-medium focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("filters.reset")}
        </button>
      </div>
    </form>
  );
}
