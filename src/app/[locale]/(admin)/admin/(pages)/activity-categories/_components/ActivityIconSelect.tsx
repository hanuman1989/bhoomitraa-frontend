"use client";

import { useState, type Ref } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { CheckLineIcon, ChevronDownIcon } from "@/icons";
import {
  activityCategoryIcons,
  isActivityCategoryIcon,
} from "@/icons/activityCategoryIcons";
import Label from "@/components/admin/form/Label";
import ActivityIconPreview from "./ActivityIconPreview";

export default function ActivityIconSelect({
  value,
  onChange,
  onBlur,
  inputRef,
  disabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: Ref<HTMLInputElement>;
  disabled: boolean;
  error?: string;
}) {
  const t = useTranslations("activityCategories");
  const [query, setQuery] = useState("");
  const labelFor = (value: string) =>
    isActivityCategoryIcon(value) ? t(`icons.${value}`) : value;
  const options = Object.keys(activityCategoryIcons).filter((id) =>
    `${id} ${labelFor(id)}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <div className="space-y-1.5">
      <Label htmlFor="activity-category-icon">{t("fields.icon")}</Label>
      <Combobox
        value={value}
        onChange={(selected: string | null) => {
          if (!disabled) onChange(selected ?? "");
        }}
        disabled={disabled}
        onClose={() => setQuery("")}
      >
        <div className="relative">
          <span className="pointer-events-none absolute start-1 top-1">
            <ActivityIconPreview value={value || null} />
          </span>
          <ComboboxInput
            id="activity-category-icon"
            ref={inputRef}
            onBlur={onBlur}
            displayValue={(selected: string) => labelFor(selected)}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("icons.placeholder")}
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby="activity-category-icon-help activity-category-icon-error"
            className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/20 aria-invalid:border-error-500 h-11 w-full rounded-lg border border-gray-300 bg-transparent ps-12 pe-10 text-sm text-gray-800 outline-none focus:ring-3 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <ComboboxButton
            aria-label={t("icons.open")}
            className="absolute inset-y-0 end-0 flex items-center px-3 text-gray-500"
          >
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          className="shadow-theme-lg z-99999 max-h-72 w-(--input-width) overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          <ComboboxOption
            value=""
            className="data-focus:bg-brand-50 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 dark:data-focus:bg-gray-800"
          >
            {t("icons.none")}
          </ComboboxOption>
          {options.map((id) => (
            <ComboboxOption
              key={id}
              value={id}
              className="group data-focus:bg-brand-50 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              <ActivityIconPreview value={id} />
              <span className="min-w-0 flex-1">
                <span className="block">{labelFor(id)}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {id}
                </span>
              </span>
              <CheckLineIcon
                aria-hidden="true"
                className="text-brand-500 invisible size-4 shrink-0 group-data-selected:visible"
              />
            </ComboboxOption>
          ))}
          {!options.length && (
            <p
              role="status"
              className="p-3 text-sm text-gray-500 dark:text-gray-400"
            >
              {t("icons.empty")}
            </p>
          )}
        </ComboboxOptions>
      </Combobox>
      <p
        id="activity-category-icon-help"
        className="text-xs text-gray-500 dark:text-gray-400"
      >
        {t("icons.help")}
      </p>
      {error && (
        <p
          id="activity-category-icon-error"
          role="alert"
          className="text-error-600 dark:text-error-400 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
