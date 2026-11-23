"use client";

import type { Ref } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { CheckLineIcon, ChevronDownIcon } from "@/icons";
import Label from "@/components/admin/form/Label";
import SeasonIcon from "@/components/admin/common/SeasonIcon";
import { seasonIconOptions } from "@/lib/seasons/presentation";
import type { SeasonIcon as SeasonIconValue } from "@/types/season";

export default function SeasonIconSelect({
  value,
  onChange,
  onBlur,
  inputRef,
  disabled,
  error,
}: {
  value: SeasonIconValue | null;
  onChange: (value: SeasonIconValue | null) => void;
  onBlur: () => void;
  inputRef: Ref<HTMLButtonElement>;
  disabled: boolean;
  error?: string;
}) {
  const t = useTranslations("seasons");
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="season-icon">{t("fields.icon")}</Label>
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="text-brand-600 dark:text-brand-400 text-xs font-medium hover:underline disabled:opacity-50"
          >
            {t("form.clearIcon")}
          </button>
        )}
      </div>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <ListboxButton
            id="season-icon"
            ref={inputRef}
            onBlur={onBlur}
            aria-invalid={!!error}
            aria-describedby="season-icon-error"
            className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/20 aria-invalid:border-error-500 flex h-9 w-full items-center gap-3 rounded-lg border border-gray-300 bg-transparent px-4 pe-11 text-start text-sm text-gray-800 outline-none focus:ring-3 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {value ? (
              <>
                <SeasonIcon icon={value} className="size-5" />
                <span>{t(`icons.${value}`)}</span>
              </>
            ) : (
              <span className="text-gray-400">{t("form.iconPlaceholder")}</span>
            )}
            <ChevronDownIcon
              aria-hidden="true"
              className="absolute inset-e-3 size-4 text-gray-500"
            />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            className="shadow-theme-lg z-99999 w-(--button-width) rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
          >
            {seasonIconOptions.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                className="group data-focus:bg-brand-50 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 dark:data-focus:bg-gray-800"
              >
                <SeasonIcon icon={option.value} className="size-5" />
                <span className="min-w-0 flex-1">
                  {t(`icons.${option.value}`)}
                </span>
                <CheckLineIcon
                  aria-hidden="true"
                  className="text-brand-500 invisible size-4 group-data-selected:visible"
                />
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
      {error && (
        <p
          id="season-icon-error"
          role="alert"
          className="text-error-600 dark:text-error-400 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
