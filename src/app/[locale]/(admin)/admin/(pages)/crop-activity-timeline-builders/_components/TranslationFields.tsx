"use client";

import { useTranslations } from "next-intl";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { getLanguage, languages } from "@/i18n/languages";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { requiredTemplateLocales } from "@/types/admin/cropActivityTemplate";
import type { TranslationValues } from "./types";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
const textareaClass =
  "shadow-theme-xs focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:text-gray-100";

/** Visible locales: required ones always, then the admin's visible choices. */
export function visibleLocales(preferred: string[]) {
  return languages
    .map((language) => language.id)
    .filter(
      (id) =>
        requiredTemplateLocales.some((locale) => locale === id) ||
        preferred.includes(id),
    );
}

/** Empty draft values for every configured language. */
export function emptyTranslations(): TranslationValues {
  return Object.fromEntries(
    languages.map(({ id }) => [
      id,
      { title: "", description: "", instructions: "" },
    ]),
  );
}

/** Form values from saved translations; configured locales only. */
export function savedTranslations(
  saved: Record<
    string,
    { title: string; description: string | null; instructions: string | null }
  >,
): TranslationValues {
  const values = emptyTranslations();
  for (const locale of Object.keys(values)) {
    const record = saved[locale];
    if (record)
      values[locale] = {
        title: record.title,
        description: record.description ?? "",
        instructions: record.instructions ?? "",
      };
  }
  return values;
}

/**
 * Payload for Laravel: required locales always, optional locales only when
 * they contain content. Omitted saved locales are kept (updateOrCreate).
 */
export function translationPayload(values: TranslationValues) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(
        ([locale, value]) =>
          requiredTemplateLocales.some((id) => id === locale) ||
          value.title.trim() ||
          value.description.trim() ||
          value.instructions.trim(),
      )
      .map(([locale, value]) => [
        locale,
        {
          title: value.title.trim(),
          description: value.description.trim() || null,
          instructions: value.instructions.trim() || null,
        },
      ]),
  );
}

/**
 * Dynamic per-locale title/description/instructions driven by the shared
 * language catalog; hidden locales stay in form state and are still saved.
 */
export default function TranslationFields<
  T extends FieldValues & { translations: TranslationValues },
>({
  form,
  locales,
  savedLocales = [],
}: {
  form: UseFormReturn<T>;
  locales: string[];
  savedLocales?: string[];
}) {
  const t = useTranslations("cropActivityTemplates");
  const { register, getValues, trigger, getFieldState, formState } = form;
  return (
    <div className="space-y-3">
      {locales.map((locale) => {
        const language = getLanguage(locale);
        const required =
          requiredTemplateLocales.some((id) => id === locale) ||
          savedLocales.includes(locale);
        const path = (field: string) =>
          `translations.${locale}.${field}` as Path<T>;
        const titleError = getFieldState(path("title"), formState).error;
        const optionalText = () =>
          String(getValues(path("description")) ?? "").trim() ||
          String(getValues(path("instructions")) ?? "").trim();
        return (
          <section
            key={locale}
            aria-labelledby={`builder-language-${locale}`}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <h4
              id={`builder-language-${locale}`}
              className="bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
            >
              {language.name}
              <span className="text-xs font-normal">{locale}</span>
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor={`builder-${locale}-title`}>
                  {t("translations.titleLabel")}{" "}
                  {required && (
                    <span aria-hidden="true" className="text-error-600">
                      *
                    </span>
                  )}
                </Label>
                <Input
                  {...register(path("title"), {
                    validate: (value: unknown) =>
                      !!String(value ?? "").trim() ||
                      (!required && !optionalText()) ||
                      t("validation.titleRequired", {
                        language: language.name,
                      }),
                    maxLength: {
                      value: 200,
                      message: t("validation.max", { count: 200 }),
                    },
                  })}
                  id={`builder-${locale}-title`}
                  lang={locale}
                  dir={language.dir}
                  aria-required={required}
                  aria-invalid={!!titleError}
                  error={!!titleError}
                  aria-describedby={`builder-${locale}-title-error`}
                  placeholder={t("translations.titlePlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`builder-${locale}-title-error`}
                  role="alert"
                  className={errorClass}
                >
                  {titleError?.message}
                </p>
              </div>
              {(["description", "instructions"] as const).map((field) => {
                const fieldError = getFieldState(path(field), formState).error;
                return (
                  <div key={field}>
                    <Label htmlFor={`builder-${locale}-${field}`}>
                      {t(`translations.${field}`)}
                    </Label>
                    <textarea
                      {...register(path(field), {
                        onBlur: () => {
                          void trigger(path("title"));
                        },
                      })}
                      id={`builder-${locale}-${field}`}
                      lang={locale}
                      dir={language.dir}
                      rows={3}
                      aria-invalid={!!fieldError}
                      aria-describedby={`builder-${locale}-${field}-error`}
                      placeholder={t(`translations.${field}Placeholder`, {
                        language: language.name,
                      })}
                      className={textareaClass}
                    />
                    <p
                      id={`builder-${locale}-${field}-error`}
                      role="alert"
                      className={errorClass}
                    >
                      {fieldError?.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
