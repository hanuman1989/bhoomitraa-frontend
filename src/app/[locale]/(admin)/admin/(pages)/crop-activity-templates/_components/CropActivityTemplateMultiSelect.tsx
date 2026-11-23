"use client";

import { useEffect, useState, type Ref } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { searchTimelineOptions } from "@/actions/admin/cropStageTimelines";
import { CheckLineIcon, ChevronDownIcon, CloseLineIcon } from "@/icons";
import Label from "@/components/admin/form/Label";
import type { TemplateSelectionOption } from "@/types/admin/cropActivityTemplate";
import type {
  TimelineOption,
  TimelineOptionPage,
} from "@/types/admin/cropStageTimeline";

type RelationKind = "variety" | "season" | "source";
type SelectOption = TemplateSelectionOption;

export default function CropActivityTemplateMultiSelect({
  kind,
  id,
  label,
  value,
  onChange,
  initialPage,
  initialSelected,
  cropId = null,
  disabled = false,
  required = false,
  error,
  placeholder,
  inputRef,
  onBlur,
}: {
  kind: RelationKind;
  id: string;
  label: string;
  value: number[];
  onChange: (value: number[]) => void;
  initialPage?: TimelineOptionPage;
  initialSelected: TemplateSelectionOption[];
  cropId?: number | null;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  placeholder: string;
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
}) {
  const t = useTranslations("cropActivityTemplates");
  const eligible = kind !== "source";
  const [search, setSearch] = useState({ keyword: "", page: 1, attempt: 0 });
  const key = JSON.stringify([kind, cropId, eligible, search]);
  const [result, setResult] = useState<{
    key: string;
    page?: TimelineOptionPage;
    error?: string;
  }>({ key: initialPage ? key : "", page: initialPage });
  const [knownOptions, setKnownOptions] = useState(initialSelected);
  const current = result.key === key ? result : undefined;
  const loading = !current;
  const options = current?.page?.options ?? [];
  const optionMap = new Map<number, SelectOption>();
  for (const option of [...knownOptions, ...options]) {
    optionMap.set(option.id, option);
  }
  const selected = value.map(
    (optionId) =>
      optionMap.get(optionId) ?? { id: optionId, label: String(optionId) },
  );

  useEffect(() => {
    if (disabled || result.key === key) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await searchTimelineOptions(
          kind,
          cropId,
          eligible,
          search.keyword,
          search.page,
        );
        if (active) {
          setResult(
            response.success && response.data
              ? { key, page: response.data }
              : { key, error: response.message || t("multiSelect.loadFailed") },
          );
        }
      } catch {
        if (active) setResult({ key, error: t("multiSelect.loadFailed") });
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    disabled,
    eligible,
    key,
    kind,
    cropId,
    search.keyword,
    search.page,
    search.attempt,
    result.key,
    t,
  ]);

  function updateSelection(next: SelectOption[]) {
    const unique = [
      ...new Map(next.map((option) => [option.id, option])).values(),
    ];
    setKnownOptions((previous) => [
      ...new Map(
        [...previous, ...unique].map((option) => [option.id, option]),
      ).values(),
    ]);
    onChange(unique.map((option) => option.id));
  }

  function changePage(page: number) {
    setSearch((previous) => ({ ...previous, page }));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </>
        )}
      </Label>
      <Combobox
        multiple
        value={selected}
        onChange={updateSelection}
        by="id"
        disabled={disabled}
      >
        <div
          className={`relative rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-700 dark:bg-gray-900 ${
            error ? "border-error-500" : ""
          } ${disabled ? "opacity-50" : ""}`}
        >
          {!!selected.length && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {selected.map((option) => (
                <li
                  key={option.id}
                  className="bg-success-50 dark:bg-success-500/10 flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-100"
                  title={option.label}
                >
                  <span className="max-w-48 truncate">{option.label}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      updateSelection(
                        selected.filter((item) => item.id !== option.id),
                      );
                    }}
                    aria-label={t("multiSelect.remove", {
                      label,
                      name: option.label,
                    })}
                    className="shrink-0 text-gray-500 hover:text-gray-800 disabled:opacity-50 dark:hover:text-white"
                  >
                    <CloseLineIcon aria-hidden="true" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="relative">
            <ComboboxInput
              id={id}
              ref={inputRef}
              onBlur={onBlur}
              onChange={(event) =>
                setSearch({ keyword: event.target.value, page: 1, attempt: 0 })
              }
              displayValue={() => ""}
              placeholder={placeholder}
              maxLength={150}
              autoComplete="off"
              aria-invalid={!!error}
              aria-required={required || undefined}
              aria-describedby={`${id}-error`}
              className="focus:border-brand-300 focus:ring-brand-500/20 h-9 w-full rounded-md border-0 bg-transparent ps-2 pe-9 text-sm text-gray-800 outline-none focus:ring-2 dark:text-gray-100"
            />
            {!!value.length && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => updateSelection([])}
                className="absolute inset-y-0 end-8 px-2 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50 dark:hover:text-white"
              >
                {t("multiSelect.clearAll")}
              </button>
            )}
            <ComboboxButton
              aria-label={label}
              className="absolute inset-y-0 end-0 px-2 text-gray-500"
            >
              <ChevronDownIcon aria-hidden="true" className="size-4" />
            </ComboboxButton>
          </div>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          aria-busy={loading}
          className="shadow-theme-lg z-99999 max-h-72 w-(--input-width) overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          {options.map((option) => (
            <ComboboxOption
              key={option.id}
              value={option}
              className="group data-focus:bg-brand-50 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-800 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              <span className="min-w-0 flex-1 truncate" title={option.label}>
                {option.label}
              </span>
              <CheckLineIcon
                aria-hidden="true"
                className="text-brand-500 invisible size-4 shrink-0 group-data-selected:visible"
              />
            </ComboboxOption>
          ))}
          {loading && (
            <p role="status" className="p-3 text-sm text-gray-500">
              {t("multiSelect.loading")}
            </p>
          )}
          {current?.error && (
            <div className="p-3">
              <p role="alert" className="text-error-600 text-sm">
                {current.error}
              </p>
              <button
                type="button"
                onClick={() =>
                  setSearch((previous) => ({
                    ...previous,
                    attempt: previous.attempt + 1,
                  }))
                }
                className="text-brand-600 mt-2 text-sm"
              >
                {t("retry")}
              </button>
            </div>
          )}
          {!loading && !current?.error && !options.length && (
            <p role="status" className="p-3 text-sm text-gray-500">
              {t("multiSelect.empty")}
            </p>
          )}
          {current?.page && current.page.pagination.last_page > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-2 text-sm dark:border-gray-800">
              <button
                type="button"
                disabled={loading || search.page <= 1}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  changePage(search.page - 1);
                }}
                className="text-brand-600 rounded px-2 py-1 disabled:opacity-40"
              >
                {t("multiSelect.previous")}
              </button>
              <span>
                {t("multiSelect.page", {
                  page: current.page.pagination.current_page,
                  total: current.page.pagination.last_page,
                })}
              </span>
              <button
                type="button"
                disabled={
                  loading || search.page >= current.page.pagination.last_page
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  changePage(search.page + 1);
                }}
                className="text-brand-600 rounded px-2 py-1 disabled:opacity-40"
              >
                {t("multiSelect.next")}
              </button>
            </div>
          )}
        </ComboboxOptions>
      </Combobox>
      <p
        id={`${id}-error`}
        role="alert"
        className="text-error-600 dark:text-error-400 text-xs"
      >
        {error}
      </p>
    </div>
  );
}
