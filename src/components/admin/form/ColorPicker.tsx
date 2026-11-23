"use client";

import { useId, useState, type Ref } from "react";
import { useTranslations } from "next-intl";
import ColorSwatch, { isHexColor } from "@/components/admin/common/ColorSwatch";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";

interface ColorPickerProps {
  id?: string;
  name?: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  allowClear?: boolean;
}

export default function ColorPicker({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  ref,
  error,
  disabled = false,
  placeholder = "#FFC107",
  helperText,
  allowClear = true,
}: ColorPickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const t = useTranslations("ui.colorPicker");
  const [selection, setSelection] = useState({
    draft: value,
    color: isHexColor(value) ? value : null,
  });
  // Keep partial text editable without changing the last valid preview. Sync
  // external resets too, including a reset to null after a successful create.
  if (selection.draft !== value) {
    setSelection({
      draft: value,
      color:
        value === null ? null : isHexColor(value) ? value : selection.color,
    });
  }
  const preview =
    value === null ? null : isHexColor(value) ? value : selection.color;
  const describedBy =
    [helperText && `${inputId}-help`, error && `${inputId}-error`]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        <label className="focus-within:ring-brand-500/20 relative flex h-9 shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-within:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <span aria-hidden="true">{t("select")}</span>
          <input
            type="color"
            value={preview ?? "#000000"}
            aria-label={t("selectFor", { label })}
            aria-describedby={describedBy}
            disabled={disabled}
            onBlur={onBlur}
            onChange={(event) => {
              if (!disabled && isHexColor(event.target.value))
                onChange(event.target.value);
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </label>
        <div className="min-w-36 flex-1">
          <Input
            ref={ref}
            id={inputId}
            name={name}
            value={value ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            aria-invalid={!!error}
            aria-describedby={describedBy}
            error={!!error}
            onBlur={onBlur}
            onChange={(event) => {
              if (!disabled)
                onChange(event.target.value === "" ? null : event.target.value);
            }}
          />
        </div>
        {allowClear && (
          <button
            type="button"
            disabled={disabled || value === null}
            onClick={() => {
              if (!disabled) onChange(null);
            }}
            className="focus-visible:outline-brand-500 h-9 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("clear")}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("preview")}
        </span>
        <ColorSwatch value={preview} />
      </div>
      {helperText && (
        <p
          id={`${inputId}-help`}
          className="mt-2 text-xs text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
