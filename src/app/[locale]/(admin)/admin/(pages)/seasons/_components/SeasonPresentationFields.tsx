"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/admin/ui/badge/Badge";
import Label from "@/components/admin/form/Label";
import Select from "@/components/admin/form/Select";
import SeasonIcon from "@/components/admin/common/SeasonIcon";
import {
  formatSeasonPeriod,
  getMonthOptions,
  isValidMonth,
} from "@/lib/seasons/presentation";
import type { SeasonFormValues } from "@/types/admin/season";
import SeasonIconSelect from "./SeasonIconSelect";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function SeasonPresentationFields({
  form,
  locales,
  disabled,
}: {
  form: UseFormReturn<SeasonFormValues>;
  locales: string[];
  disabled: boolean;
}) {
  const t = useTranslations("seasons");
  const locale = useLocale();
  const { control, setValue, clearErrors, formState } = form;
  const [startMonth, endMonth, icon, translations] = useWatch({
    control,
    name: ["start_month", "end_month", "icon", "translations"],
  });
  const monthOptions = getMonthOptions(locale);
  const period = formatSeasonPeriod(startMonth, endMonth, locale);
  const previewName =
    translations?.[locale]?.name.trim() ||
    translations?.en?.name.trim() ||
    locales.map((id) => translations?.[id]?.name.trim()).find(Boolean) ||
    t("form.previewName");
  const validatePair = (_: number | null, values: SeasonFormValues) =>
    (values.start_month === null && values.end_month === null) ||
    (values.start_month !== null && values.end_month !== null) ||
    t("validation.monthPair");
  const toMonth = (value: string) => {
    const month = Number(value);
    return isValidMonth(month) ? month : null;
  };
  const clearPeriod = () => {
    setValue("start_month", null, { shouldDirty: true, shouldValidate: true });
    setValue("end_month", null, { shouldDirty: true, shouldValidate: true });
    clearErrors(["start_month", "end_month"]);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Controller
          name="start_month"
          control={control}
          rules={{
            validate: {
              valid: (value) =>
                value === null ||
                isValidMonth(value) ||
                t("validation.startMonth"),
              pair: validatePair,
            },
          }}
          render={({ field }) => (
            <div>
              <Label htmlFor="season-start-month">
                {t("fields.startMonth")}
              </Label>
              <Select
                id="season-start-month"
                ref={field.ref}
                value={field.value === null ? "" : String(field.value)}
                options={monthOptions}
                placeholder={t("form.startMonthPlaceholder")}
                onChange={(value) => field.onChange(toMonth(value))}
                onBlur={field.onBlur}
                aria-invalid={!!formState.errors.start_month}
                aria-describedby="season-start-month-error"
                className={
                  formState.errors.start_month ? "border-error-500" : ""
                }
              />
              <p
                id="season-start-month-error"
                role="alert"
                className={errorClass}
              >
                {formState.errors.start_month?.message}
              </p>
            </div>
          )}
        />
        <Controller
          name="end_month"
          control={control}
          rules={{
            validate: {
              valid: (value) =>
                value === null ||
                isValidMonth(value) ||
                t("validation.endMonth"),
              pair: validatePair,
            },
          }}
          render={({ field }) => (
            <div>
              <Label htmlFor="season-end-month">{t("fields.endMonth")}</Label>
              <Select
                id="season-end-month"
                ref={field.ref}
                value={field.value === null ? "" : String(field.value)}
                options={monthOptions}
                placeholder={t("form.endMonthPlaceholder")}
                onChange={(value) => field.onChange(toMonth(value))}
                onBlur={field.onBlur}
                aria-invalid={!!formState.errors.end_month}
                aria-describedby="season-end-month-error"
                className={formState.errors.end_month ? "border-error-500" : ""}
              />
              <p
                id="season-end-month-error"
                role="alert"
                className={errorClass}
              >
                {formState.errors.end_month?.message}
              </p>
            </div>
          )}
        />
        <Controller
          name="icon"
          control={control}
          rules={{
            validate: (value) =>
              value === null ||
              ["sprout", "sun", "leaf"].includes(value) ||
              t("validation.icon"),
          }}
          render={({ field, fieldState }) => (
            <SeasonIconSelect
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              disabled={disabled}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("form.presentationHelp")}
        </p>
        {(startMonth !== null || endMonth !== null) && (
          <button
            type="button"
            disabled={disabled}
            onClick={clearPeriod}
            className="text-brand-600 dark:text-brand-400 text-sm font-semibold hover:underline disabled:opacity-50"
          >
            {t("form.clearPeriod")}
          </button>
        )}
      </div>

      <div className="border-success-200 bg-success-50/70 dark:border-success-900 dark:bg-success-950 flex flex-wrap items-center gap-4 rounded-xl border p-4">
        <Badge color="success">{t("form.livePreview")}</Badge>
        <span className="h-8 border-s border-gray-300 dark:border-gray-700" />
        {icon ? (
          <SeasonIcon icon={icon} size={34} />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
            —
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">
            {previewName}
          </p>
          {period && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{period}</p>
          )}
        </div>
      </div>
    </div>
  );
}
