"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { getLanguage, languages, type Language } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import TextArea from "@/components/admin/form/input/TextArea";
import Label from "@/components/admin/form/Label";
import {
  fieldLayoutTranslationLimits,
  type CropFieldLayoutFormValues,
  type CropFieldLayoutOptions,
} from "@/types/admin/cropFieldLayout";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

function TranslationTextarea({
  language,
  name,
  label,
  readOnly,
  required,
  disabled,
}: {
  language: Language;
  name: "description" | "important_considerations";
  label: string;
  readOnly: boolean;
  required?: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("cropFieldLayouts.translations");
  const { control } = useFormContext<CropFieldLayoutFormValues>();
  const id = `field-layout-${language.id}-${name}`;

  return (
    <Controller
      name={`translations.${language.id}.${name}`}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;

        return (
          <div>
            <Label htmlFor={id}>
              {label}
              {required && (
                <span aria-hidden="true" className="text-error-600">
                  {" "}
                  *
                </span>
              )}
            </Label>
            <TextArea
              {...field}
              id={id}
              value={field.value ?? ""}
              lang={language.id}
              dir={language.dir}
              rows={3}
              maxLength={fieldLayoutTranslationLimits[name]}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              placeholder={t("placeholder", {
                field: label,
                language: language.name,
              })}
              className="aria-invalid:border-error-500 text-gray-800"
              error={Boolean(error)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            {error && (
              <p id={`${id}-error`} role="alert" className={errorClass}>
                {error}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

export default function TranslationsStep({
  options,
  busy,
}: {
  options: CropFieldLayoutOptions;
  busy: boolean;
}) {
  const t = useTranslations("cropFieldLayouts.translations");
  const {
    register,
    formState: { errors },
  } = useFormContext<CropFieldLayoutFormValues>();

  return (
    <ComponentCard title={t("title")} desc={t("help")}>
      <div className="space-y-4">
        {languages.map(({ id }) => {
          const language = getLanguage(id);
          const supported = options.supported_locales.find(
            ({ value }) => value === id,
          );
          const required = supported?.required === true;
          const languageHeadingId = `field-layout-language-${id}`;
          const titleId = `field-layout-${id}-title`;
          const titleError = errors.translations?.[id]?.title?.message;

          return (
            <section
              key={id}
              aria-labelledby={languageHeadingId}
              className="grid min-w-0 gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-4 dark:border-gray-700"
            >
              <div className="space-y-2">
                <h4
                  id={languageHeadingId}
                  aria-label={t("language", {
                    language: language.name,
                    locale: id,
                  })}
                  className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
                >
                  <span
                    aria-hidden="true"
                    className="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 rounded-full px-2 py-0.5 text-xs uppercase"
                  >
                    {id}
                  </span>
                  {language.name}
                </h4>
                {!supported && (
                  <p className="text-warning-700 dark:text-warning-400 text-xs">
                    {t("unavailable")}
                  </p>
                )}
              </div>

              <div className="min-w-0 space-y-4 sm:col-span-3">
                <div>
                  <Label htmlFor={titleId}>
                    {t("name")}
                    {required && (
                      <span aria-hidden="true" className="text-error-600">
                        {" "}
                        *
                      </span>
                    )}
                  </Label>
                  <Input
                    {...register(`translations.${id}.title`)}
                    id={titleId}
                    lang={id}
                    dir={language.dir}
                    maxLength={fieldLayoutTranslationLimits.title}
                    disabled={busy}
                    readOnly={!supported}
                    required={required}
                    placeholder={t("placeholder", {
                      field: t("name"),
                      language: language.name,
                    })}
                    error={Boolean(titleError)}
                    aria-invalid={Boolean(titleError)}
                    aria-describedby={
                      titleError ? `${titleId}-error` : undefined
                    }
                  />
                  {titleError && (
                    <p
                      id={`${titleId}-error`}
                      role="alert"
                      className={errorClass}
                    >
                      {titleError}
                    </p>
                  )}
                </div>
                <TranslationTextarea
                  language={language}
                  name="description"
                  label={t("description")}
                  readOnly={!supported}
                  required={required}
                  disabled={busy}
                />
                <TranslationTextarea
                  language={language}
                  name="important_considerations"
                  label={t("importantConsiderations")}
                  readOnly={!supported}
                  disabled={busy}
                />
              </div>
            </section>
          );
        })}
      </div>
    </ComponentCard>
  );
}
