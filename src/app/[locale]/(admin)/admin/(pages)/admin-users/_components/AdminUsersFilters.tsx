"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import FilterSelect from "@/components/admin/common/FilterSelect";
import { useTranslations } from "next-intl";

export interface AdminUsersFilterValues {
  keyword: string;
  status: "" | "1" | "0";
}

interface AdminUsersFiltersProps {
  initialFilters?: AdminUsersFilterValues;
}

const emptyFilters: AdminUsersFilterValues = { keyword: "", status: "" };

const inputClasses =
  "h-12 w-full rounded-md border border-[#dce3f1] bg-white px-4 text-sm text-[#53699b] outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

export default function AdminUsersFilters({
  initialFilters = emptyFilters,
}: AdminUsersFiltersProps) {
  const tUi = useTranslations("adminUsers.filters");

  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<AdminUsersFilterValues>(() => ({
    keyword: initialFilters.keyword,
    status: initialFilters.status,
  }));

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.currentTarget;

    if (name === "keyword") {
      setFilters((current) => ({ ...current, keyword: value }));
    } else if (
      name === "status" &&
      (value === "" || value === "1" || value === "0")
    ) {
      setFilters((current) => ({ ...current, status: value }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    const keyword = filters.keyword.trim();

    if (keyword) params.set("keyword", keyword);
    if (filters.status !== "") params.set("status", filters.status);

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function handleReset() {
    setFilters({ ...emptyFilters });
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={tUi("filterAdminUsers")}
      className="mb-4 grid items-end gap-4 rounded-xl border border-[#dce3f1] bg-white p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <label
          htmlFor="admin-search"
          className="mb-2 block text-sm font-medium"
        >
          {tUi("search")}
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="pointer-events-none absolute start-4 top-3.5 size-5 text-[#53699b]"
          >
            <circle cx="10.5" cy="10.5" r="7.5" />
            <path d="m16 16 5 5" />
          </svg>
          <input
            id="admin-search"
            name="keyword"
            type="search"
            value={filters.keyword ?? ""}
            onChange={handleChange}
            placeholder={tUi("nameEmailOrMobile")}
            className={`${inputClasses} ps-12 placeholder:text-[#8a9ac0]`}
          />
        </div>
      </div>
      <FilterSelect
        id="admin-status"
        name="status"
        label={tUi("status")}
        value={filters.status}
        onChange={handleChange}
      >
        <option value="">{tUi("all")}</option>
        <option value="1">{tUi("active")}</option>
        <option value="0">{tUi("inactive")}</option>
      </FilterSelect>

      <div className="flex gap-3 sm:col-span-2 lg:col-span-3 xl:col-span-1">
        <button
          type="submit"
          disabled={isPending}
          className="h-12 flex-1 rounded-md bg-[#004bff] px-6 text-sm font-medium whitespace-nowrap text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {isPending ? tUi("applying") : tUi("applyFilters")}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="h-12 flex-1 rounded-md border border-blue-200 px-6 text-sm font-medium text-[#004bff] transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-gray-800"
        >
          {tUi("reset")}
        </button>
      </div>
    </form>
  );
}
