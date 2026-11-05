"use client";

import { useEffect, useState, type Ref } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { searchVarietyRelations } from "@/actions/admin/cropVarieties";
import { ChevronDownIcon, CheckLineIcon } from "@/icons";
import Label from "@/components/admin/form/Label";
import type {
  VarietyRelation,
  VarietyRelationPage,
} from "@/types/admin/cropVariety";

export default function VarietyRelationSelect({
  kind,
  id,
  label,
  value,
  onChange,
  onBlur,
  inputRef,
  disabled = false,
  required = false,
  eligible = false,
  initialPage,
  initialSelection,
  error,
  emptyLabel,
}: {
  kind: "crop" | "source";
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  required?: boolean;
  eligible?: boolean;
  initialPage: VarietyRelationPage;
  initialSelection: VarietyRelation | null;
  error?: string;
  emptyLabel?: string;
}) {
  const t = useTranslations("cropVarieties");
  const [search, setSearch] = useState({ keyword: "", page: 1, attempt: 0 });
  const requestKey = JSON.stringify(search);
  const [result, setResult] = useState<{
    key: string;
    page?: VarietyRelationPage;
    error?: string;
  }>({
    key: JSON.stringify({ keyword: "", page: 1, attempt: 0 }),
    page: initialPage,
  });
  const [selected, setSelected] = useState(initialSelection);
  const current = result.key === requestKey ? result : undefined;
  const options = current?.page?.data ?? [];
  const loading = !current;
  const selection =
    options.find((option) => String(option.id) === value) ??
    (selected && String(selected.id) === value ? selected : null);
  const labelFor = (option: VarietyRelation) =>
    "title" in option ? option.title : (option.name ?? option.slug);

  useEffect(() => {
    if (result.key === requestKey) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await searchVarietyRelations(
          kind,
          search.keyword,
          search.page,
          eligible,
        );
        if (active)
          setResult(
            response.success && response.data
              ? { key: requestKey, page: response.data }
              : {
                  key: requestKey,
                  error: response.message || t("feedback.loadFailed"),
                },
          );
      } catch {
        if (active)
          setResult({ key: requestKey, error: t("feedback.loadFailed") });
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    kind,
    eligible,
    search.keyword,
    search.page,
    search.attempt,
    requestKey,
    result.key,
    t,
  ]);

  const pagination = current?.page?.pagination;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-error-600">
            {" "}
            *
          </span>
        )}
      </Label>
      <Combobox
        value={value}
        disabled={disabled}
        immediate
        onChange={(next: string | null) => {
          setSelected(
            options.find((option) => String(option.id) === next) ?? null,
          );
          onChange(next ?? "");
        }}
        onClose={() => setSearch({ keyword: "", page: 1, attempt: 0 })}
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            ref={inputRef}
            onBlur={onBlur}
            displayValue={() =>
              selection
                ? labelFor(selection)
                : value
                  ? t("relations.missing", { id: value })
                  : ""
            }
            onChange={(event) =>
              setSearch({ keyword: event.target.value, page: 1, attempt: 0 })
            }
            placeholder={t(`relations.${kind}Placeholder`)}
            maxLength={150}
            autoComplete="off"
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className="focus:border-brand-300 focus:ring-brand-500/20 aria-invalid:border-error-500 shadow-theme-xs h-11 w-full rounded-lg border border-gray-300 bg-transparent ps-4 pe-10 text-sm text-gray-800 outline-none focus:ring-3 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <ComboboxButton
            aria-label={label}
            className="absolute inset-y-0 end-0 flex items-center px-3 text-gray-500"
          >
            <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          aria-busy={loading}
          className="shadow-theme-lg z-99999 max-h-72 w-(--input-width) overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          {!required && (
            <ComboboxOption
              value=""
              className="data-focus:bg-brand-50 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              {emptyLabel ?? t(`relations.${kind}None`)}
            </ComboboxOption>
          )}
          {options.map((option) => (
            <ComboboxOption
              key={option.id}
              value={String(option.id)}
              className="group data-focus:bg-brand-50 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-800 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              <span className="min-w-0 flex-1">
                {labelFor(option)}
                {!option.is_active && (
                  <span className="ms-2 text-xs text-gray-500">
                    {t("inactive")}
                  </span>
                )}
              </span>
              <CheckLineIcon
                aria-hidden="true"
                className="text-brand-500 invisible size-4 shrink-0 group-data-selected:visible"
              />
            </ComboboxOption>
          ))}
          {loading && (
            <p role="status" className="p-3 text-sm text-gray-500">
              {t("loading")}
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
          {!loading && !current?.error && options.length === 0 && (
            <p role="status" className="p-3 text-sm text-gray-500">
              {t(`relations.${kind}Empty`)}
            </p>
          )}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-2 text-sm dark:border-gray-800">
              <button
                type="button"
                disabled={loading || pagination.current_page <= 1}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSearch((previous) => ({
                    ...previous,
                    page: previous.page - 1,
                  }));
                }}
                className="text-brand-600 rounded px-2 py-1 disabled:opacity-40"
              >
                {t("previous")}
              </button>
              <span>
                {t("optionPage", {
                  page: pagination.current_page,
                  total: pagination.last_page,
                })}
              </span>
              <button
                type="button"
                disabled={
                  loading || pagination.current_page >= pagination.last_page
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSearch((previous) => ({
                    ...previous,
                    page: previous.page + 1,
                  }));
                }}
                className="text-brand-600 rounded px-2 py-1 disabled:opacity-40"
              >
                {t("next")}
              </button>
            </div>
          )}
        </ComboboxOptions>
      </Combobox>
      {value && !required && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setSelected(null);
            onChange("");
          }}
          className="text-brand-600 dark:text-brand-400 text-xs disabled:opacity-50"
        >
          {t("clearSelection")}
        </button>
      )}
      {value && !selection && (
        <p
          role="status"
          className="text-warning-700 dark:text-warning-400 text-xs"
        >
          {t("relations.missingWarning")}
        </p>
      )}
      {selection &&
        (!selection.is_active ||
          ("verification_status" in selection &&
            selection.verification_status !== "verified")) && (
          <p
            role="status"
            className="text-warning-700 dark:text-warning-400 text-xs"
          >
            {t(
              kind === "source"
                ? "relations.sourceWarning"
                : "relations.cropWarning",
            )}
          </p>
        )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
