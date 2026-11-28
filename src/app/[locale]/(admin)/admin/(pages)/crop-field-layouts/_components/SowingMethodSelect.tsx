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
import { searchFieldLayoutSowingMethods } from "@/actions/admin/cropFieldLayouts";
import Label from "@/components/admin/form/Label";
import { CheckLineIcon, ChevronDownIcon } from "@/icons";
import type {
  TimelineOption,
  TimelineOptionPage,
} from "@/types/admin/cropStageTimeline";

const optionClass =
  "data-focus:bg-brand-50 dark:data-focus:bg-gray-800 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-800 dark:text-gray-200";

type MethodOption = Pick<TimelineOption, "id" | "label">;

function MethodOptions({
  keyword,
  cropKey,
}: {
  keyword: string;
  cropKey?: string;
}) {
  const t = useTranslations("cropFieldLayouts");
  const ui = useTranslations("stageTimelines");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<
    { page: number; attempt: number } & (
      { data: TimelineOptionPage } | { error: string }
    )
  >();
  const current =
    result?.page === page && result.attempt === attempt ? result : undefined;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        try {
          const cropIds =
            cropKey === undefined
              ? undefined
              : cropKey
                ? cropKey.split(",").map(Number)
                : [];
          const response = await searchFieldLayoutSowingMethods(
            keyword,
            page,
            cropIds,
          );
          if (!cancelled) {
            setResult(
              response.success && response.data
                ? { page, attempt, data: response.data }
                : {
                    page,
                    attempt,
                    error: response.message || t("filters.loadMethodsFailed"),
                  },
            );
          }
        } catch {
          if (!cancelled) {
            setResult({ page, attempt, error: t("filters.loadMethodsFailed") });
          }
        }
      },
      keyword ? 250 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, page, cropKey, attempt, t]);

  if (!current) {
    return (
      <p role="status" className="p-3 text-sm text-gray-500">
        {ui("loadingOptions")}
      </p>
    );
  }
  if ("error" in current) {
    return (
      <div className="p-3 text-sm">
        <p role="alert" className="text-error-600 dark:text-error-400">
          {current.error}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((previous) => previous + 1)}
          className="text-brand-600 dark:text-brand-400 mt-2"
        >
          {ui("retry")}
        </button>
      </div>
    );
  }
  const { options, pagination } = current.data;
  return (
    <>
      {options.map((option) => (
        <ComboboxOption
          key={option.id}
          value={option}
          className={`group ${optionClass}`}
        >
          <span className="min-w-0 flex-1">{option.label}</span>
          <CheckLineIcon
            aria-hidden="true"
            className="text-brand-500 invisible size-4 shrink-0 group-data-selected:visible"
          />
        </ComboboxOption>
      ))}
      {!options.length && (
        <p role="status" className="p-3 text-sm text-gray-500">
          {ui("relations.empty")}
        </p>
      )}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-2 text-sm dark:border-gray-800">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="text-brand-600 dark:text-brand-400 px-1 disabled:opacity-40"
          >
            {ui("previous")}
          </button>
          <span>
            {ui("optionPage", {
              page: pagination.current_page,
              total: pagination.last_page,
            })}
          </span>
          <button
            type="button"
            disabled={page >= pagination.last_page}
            onClick={() => setPage(page + 1)}
            className="text-brand-600 dark:text-brand-400 px-1 disabled:opacity-40"
          >
            {ui("next")}
          </button>
        </div>
      )}
    </>
  );
}

export default function SowingMethodSelect({
  id,
  label,
  value,
  onChange,
  initialSelection,
  cropIds,
  disabled,
  error,
  emptyLabel,
  placeholder,
  onBlur,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  initialSelection?: TimelineOption | null;
  cropIds?: readonly number[];
  disabled?: boolean;
  error?: string;
  emptyLabel: string;
  placeholder?: string;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const t = useTranslations("cropFieldLayouts");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<MethodOption | null>(null);
  const cropKey = cropIds?.join(",");
  const selection = value
    ? ([selected, initialSelection].find(
        (option) => option && String(option.id) === value,
      ) ?? { id: Number(value), label: t("recordId", { id: value }) })
    : null;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        value={selection}
        by="id"
        disabled={disabled}
        immediate
        onChange={(next: MethodOption | null) => {
          setSelected(next?.id ? next : null);
          onChange(next?.id ? String(next.id) : "");
        }}
        onClose={() => setKeyword("")}
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            ref={inputRef}
            onBlur={onBlur}
            displayValue={(option: MethodOption | null) => option?.label ?? ""}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={placeholder ?? t("filters.searchMethods")}
            maxLength={150}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className="focus:border-brand-300 focus:ring-brand-500/20 aria-invalid:border-error-500 h-9 w-full rounded-lg border border-gray-300 bg-white ps-4 pe-10 text-sm text-gray-800 outline-none focus:ring-3 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <ComboboxButton
            aria-label={label}
            className="absolute inset-y-0 end-0 px-3 text-gray-500"
          >
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          className="shadow-theme-lg z-99999 max-h-72 w-(--input-width) overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          <ComboboxOption
            value={{ id: 0, label: emptyLabel }}
            className={optionClass}
          >
            {emptyLabel}
          </ComboboxOption>
          <MethodOptions
            key={JSON.stringify([keyword, cropKey])}
            keyword={keyword}
            cropKey={cropKey}
          />
        </ComboboxOptions>
      </Combobox>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
