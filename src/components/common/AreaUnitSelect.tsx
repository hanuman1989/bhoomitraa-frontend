"use client";
import type { Ref, SelectHTMLAttributes } from "react";
import { useLocale, useTranslations } from "next-intl";
import Select from "@/components/admin/form/Select";
import useAreaUnits from "@/hooks/useAreaUnits";
import { getAreaUnitLabel, isSupportedAreaUnit } from "@/lib/areaUnits";

interface Props extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value" | "defaultValue"
> {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<HTMLSelectElement>;
  error?: string;
}

export default function AreaUnitSelect({
  id,
  value,
  onChange,
  disabled,
  error,
  ref,
  ...props
}: Props) {
  const t = useTranslations("areaUnits");
  const locale = useLocale();
  const metadata = useAreaUnits();
  const supported = isSupportedAreaUnit(value, metadata.config);
  const options: { value: string; label: string; disabled?: boolean }[] = (
    metadata.config?.units ?? []
  ).map((unit) => ({
    value: unit.value,
    label: `${getAreaUnitLabel(unit.value, metadata.config, locale)}${unit.definition ? ` (${unit.definition})` : ""}`,
  }));
  // Show the existing value without offering unresolved legacy codes as choices.
  if (value && !supported)
    options.unshift({ value, label: metadata.label(value), disabled: true });
  return (
    <div>
      <Select
        {...props}
        id={id}
        ref={ref}
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled || !metadata.config}
        placeholder={
          metadata.status === "loading" || metadata.status === "idle"
            ? t("loading")
            : t("choose")
        }
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
      />
      <div
        id={`${id}-help`}
        className="mt-1 text-xs text-gray-500 dark:text-gray-400"
      >
        {value && metadata.config && !supported && <p>{t("legacyHelp")}</p>}
        {metadata.status === "error" && (
          <p role="alert">
            {t("loadFailed")}{" "}
            <button
              type="button"
              disabled={disabled}
              onClick={metadata.retry}
              className="font-semibold underline"
            >
              {t("retry")}
            </button>
          </p>
        )}
      </div>
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
