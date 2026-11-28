"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { getLanguage, languages, type Language } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import TextArea from "@/components/admin/form/input/TextArea";
import Label from "@/components/admin/form/Label";
import {
  requiredSowingMethodTranslationFields,
  sowingMethodTranslationLimits,
  type SowingMethodFormValues,
  type SowingMethodTranslation,
} from "@/types/admin/sowingMethod";

function TranslationField({
  language,
  fieldName,
  readOnly,
}: {
  language: Language;
  fieldName: keyof SowingMethodTranslation;
  readOnly: boolean;
}) {
  const t = useTranslations("sowingMethods");
  const { control } = useFormContext<SowingMethodFormValues>();
  const { id, name, dir } = language;
  const fieldPath = `translations.${id}.${fieldName}` as const;
  const inputId = `method-${id}-${fieldName}`;
  const countId = `${inputId}-count`;
  const errorId = `${inputId}-error`;
  const limit = sowingMethodTranslationLimits[fieldName];
  const required =
    !readOnly && requiredSowingMethodTranslationFields.includes(fieldName);
  const showCount = fieldName === "short_description";
  const label = t(`fields.${fieldName}`);

  return (
    <Controller
      name={fieldPath}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const value = field.value ?? "";
        const props = {
          ...field,
          id: inputId,
          value,
          maxLength: limit,
          required,
          readOnly,
          lang: id,
          dir,
          error: Boolean(error),
          "aria-invalid": Boolean(error),
          "aria-describedby":
            [showCount ? countId : "", error ? errorId : ""]
              .filter(Boolean)
              .join(" ") || undefined,
          placeholder: t("translationPlaceholder", {
            field: label,
            language: name,
          }),
        };

        return (
          <div className="min-w-0">
            <Label htmlFor={inputId}>
              {label}
              {required && (
                <span aria-hidden="true" className="text-error-600">
                  {" "}
                  *
                </span>
              )}
            </Label>
            {fieldName === "title" ? (
              <Input {...props} />
            ) : (
              <TextArea
                {...props}
                rows={fieldName === "description" ? 3 : 2}
                className="aria-invalid:border-error-500 py-1.5 text-gray-800"
              />
            )}
            {showCount && (
              <p
                id={countId}
                className="text-end text-xs text-gray-500 dark:text-gray-400"
              >
                {t("characters", { count: value.length, max: limit })}
              </p>
            )}
            {error && (
              <p
                id={errorId}
                role="alert"
                className="text-error-600 dark:text-error-400 mt-1 text-xs"
              >
                {error}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

export default function MethodTranslationsStep({
  supportedLocaleIds,
}: {
  supportedLocaleIds: readonly string[];
}) {
  const t = useTranslations("sowingMethods");

  return (
    <ComponentCard title={t("step2")} desc={t("translationsHelp")}>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {languages.map(({ id }) => {
          const language = getLanguage(id);
          const readOnly = !supportedLocaleIds.includes(id);
          const fieldProps = { language, readOnly };

          return (
            <section
              key={id}
              aria-labelledby={`method-language-${id}`}
              className="min-w-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <h4
                id={`method-language-${id}`}
                className="bg-brand-50 dark:bg-brand-500/10 flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white"
              >
                <span
                  aria-hidden="true"
                  className="bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 rounded-full px-2 py-0.5 text-xs uppercase"
                >
                  {id}
                </span>
                {language.name}
              </h4>
              <div className="space-y-3 p-4">
                {readOnly && (
                  <p className="text-warning-700 dark:text-warning-400 text-xs">
                    {t("translationUnavailable")}
                  </p>
                )}
                <TranslationField {...fieldProps} fieldName="title" />
                <TranslationField
                  {...fieldProps}
                  fieldName="short_description"
                />
                <TranslationField {...fieldProps} fieldName="description" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TranslationField {...fieldProps} fieldName="advantages" />
                  <TranslationField {...fieldProps} fieldName="disadvantages" />
                  <TranslationField
                    {...fieldProps}
                    fieldName="suitable_conditions"
                  />
                  <TranslationField
                    {...fieldProps}
                    fieldName="resource_requirements"
                  />
                  <TranslationField
                    {...fieldProps}
                    fieldName="economic_considerations"
                  />
                  <TranslationField
                    {...fieldProps}
                    fieldName="important_considerations"
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </ComponentCard>
  );
}
