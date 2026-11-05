"use client";

import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { searchRegionParents } from "@/actions/admin/regions";
import Label from "@/components/admin/form/Label";
import { CheckLineIcon, ChevronDownIcon } from "@/icons";
import type { PaginationMeta } from "@/types/api";
import type { Region, RegionType } from "@/types/admin/region";

type ParentOption = Pick<Region, "id" | "name">;

interface ParentRegionSelectProps {
  type: RegionType | "";
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: (element: HTMLInputElement | null) => void;
  initialParent?: ParentOption | null;
  error?: string;
  disabled: boolean;
  id?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
  allLabel?: string;
  required?: boolean;
}

interface ParentSearchResult {
  queryKey: string;
  requestKey: string;
  options: ParentOption[];
  pagination?: PaginationMeta;
  error?: string;
}

export default function ParentRegionSelect({
  type,
  value,
  onChange,
  onBlur,
  inputRef,
  initialParent,
  error,
  disabled,
  id = "region-parent",
  label,
  placeholder,
  hint,
  allLabel,
  required = true,
}: ParentRegionSelectProps) {
  const t = useTranslations("regions.form");
  const types = useTranslations("regions.types");
  const [search, setSearch] = useState({ keyword: "", page: 1, attempt: 0 });
  const queryKey = JSON.stringify([type, search.keyword]);
  const requestKey = JSON.stringify([queryKey, search.page, search.attempt]);
  const [result, setResult] = useState<ParentSearchResult>();
  const [selected, setSelected] = useState<ParentOption | null>(
    initialParent ?? null,
  );
  const currentResult = result?.queryKey === queryKey ? result : undefined;
  const loading = Boolean(type) && currentResult?.requestKey !== requestKey;
  const options = currentResult?.options ?? [];
  const loadError = !loading ? currentResult?.error : undefined;
  const pagination = currentResult?.pagination;
  const selectedParent = value
    ? (options.find((option) => String(option.id) === value) ??
      (selected && String(selected.id) === value ? selected : null))
    : null;

  useEffect(() => {
    if (!type) return;
    let current = true;
    const timeout = setTimeout(async () => {
      try {
        const response = await searchRegionParents(
          type,
          search.keyword,
          search.page,
        );
        if (!current) return;
        setResult((previous) => {
          const existing =
            previous?.queryKey === queryKey ? previous : undefined;
          if (!response.success || !response.data) {
            return {
              queryKey,
              requestKey,
              options: existing?.options ?? [],
              pagination: existing?.pagination,
              error: response.message || t("parentsFailed"),
            };
          }
          return {
            queryKey,
            requestKey,
            options:
              search.page === 1
                ? response.data.data
                : Array.from(
                    new Map(
                      [...(existing?.options ?? []), ...response.data.data].map(
                        (option) => [option.id, option],
                      ),
                    ).values(),
                  ),
            pagination: response.data.pagination,
          };
        });
      } catch {
        if (current)
          setResult((previous) => ({
            queryKey,
            requestKey,
            options: previous?.queryKey === queryKey ? previous.options : [],
            pagination:
              previous?.queryKey === queryKey ? previous.pagination : undefined,
            error: t("parentsFailed"),
          }));
      }
    }, 250);
    return () => {
      current = false;
      clearTimeout(timeout);
    };
  }, [
    type,
    search.keyword,
    search.page,
    search.attempt,
    queryKey,
    requestKey,
    t,
  ]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label ?? t("parent")}</Label>
      <Combobox
        name="parent_id"
        value={value || null}
        disabled={disabled || !type}
        invalid={Boolean(error)}
        immediate
        onChange={(id: string | null) => {
          setSelected(
            options.find((option) => String(option.id) === id) ?? null,
          );
          onChange(id ?? "");
        }}
        onClose={() => setSearch({ keyword: "", page: 1, attempt: 0 })}
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            ref={inputRef}
            defaultValue={
              selectedParent ? (selectedParent.name ?? t("unnamedParent")) : ""
            }
            onBlur={onBlur}
            displayValue={() =>
              selectedParent ? (selectedParent.name ?? t("unnamedParent")) : ""
            }
            onChange={(event) =>
              setSearch({ keyword: event.target.value, page: 1, attempt: 0 })
            }
            maxLength={150}
            autoComplete="off"
            placeholder={placeholder ?? t("searchParents")}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error ${id}-hint` : `${id}-hint`}
            className="focus:border-brand-300 focus:ring-brand-500/20 aria-invalid:border-error-500 dark:focus:border-brand-800 dark:aria-invalid:border-error-500 h-12 w-full rounded-md border border-gray-300 bg-white ps-4 pe-10 text-sm text-gray-800 transition outline-none placeholder:text-gray-400 focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
          <ComboboxButton
            aria-label={t("selectParent")}
            className="focus-visible:outline-brand-500 absolute inset-y-0 end-0 flex items-center px-4 text-gray-500 focus-visible:outline-2 disabled:opacity-50 dark:text-gray-400"
          >
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          aria-busy={loading}
          onScroll={(event) => {
            const element = event.currentTarget;
            if (
              !loading &&
              !loadError &&
              pagination &&
              pagination.current_page < pagination.last_page &&
              element.scrollHeight - element.scrollTop - element.clientHeight <
                32
            ) {
              setSearch((previous) =>
                previous.page === pagination.current_page
                  ? { ...previous, page: previous.page + 1 }
                  : previous,
              );
            }
          }}
          className="shadow-theme-lg z-99999 max-h-60 w-(--input-width) overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          {allLabel && (
            <ComboboxOption
              value={null}
              className="data-focus:bg-brand-50 rounded-md px-3 py-2 text-sm text-gray-800 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              {allLabel}
            </ComboboxOption>
          )}
          {options.map((option) => (
            <ComboboxOption
              key={option.id}
              value={String(option.id)}
              className="group data-focus:bg-brand-50 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-800 select-none dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              <span className="min-w-0 flex-1 truncate">
                {option.name ?? t("unnamedParent")} ({option.id})
              </span>
              <CheckLineIcon
                aria-hidden="true"
                className="text-brand-500 dark:text-brand-400 invisible size-4 shrink-0 group-data-selected:visible"
              />
            </ComboboxOption>
          ))}
          {loading && (
            <p
              role="status"
              className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
            >
              {t("loadingParents")}
            </p>
          )}
          {!loading && !loadError && options.length === 0 && (
            <p
              role="status"
              className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
            >
              {t("noParents")}
            </p>
          )}
        </ComboboxOptions>
      </Combobox>
      <p
        id={`${id}-hint`}
        className="text-theme-xs text-gray-500 dark:text-gray-400"
      >
        {hint ??
          (type
            ? t("parentTypeHint", { type: types(type) })
            : t("selectTypeFirst"))}
      </p>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-theme-xs text-error-600 dark:text-error-400"
        >
          {error}
        </p>
      )}
      {loadError && (
        <div
          role="alert"
          className="text-theme-xs text-error-600 dark:text-error-400"
        >
          {loadError}{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              setSearch((previous) => ({
                ...previous,
                attempt: previous.attempt + 1,
              }))
            }
            className="focus-visible:outline-brand-500 underline focus-visible:outline-2"
          >
            {t("retry")}
          </button>
        </div>
      )}
    </div>
  );
}
