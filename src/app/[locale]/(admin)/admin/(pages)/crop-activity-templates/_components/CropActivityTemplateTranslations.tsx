"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { getLanguage, languages } from "@/i18n/languages";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import {
  requiredTemplateLocales,
  type CropActivityTemplateFormValues,
} from "@/types/admin/cropActivityTemplate";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
const textareaClass =
  "shadow-theme-xs focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:text-gray-100";
export default function CropActivityTemplateTranslations({
  form,
  locales,
  savedLocales,
}: {
  form: UseFormReturn<CropActivityTemplateFormValues>;
  locales: string[];
  savedLocales: string[];
}) {
  const t = useTranslations("cropActivityTemplates");
  const {
    register,
    getValues,
    trigger,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-3">
      {locales.map((locale) => {
        const configured = languages.some((language) => language.id === locale);
        const language = configured
          ? getLanguage(locale)
          : { name: locale, dir: "ltr" as const };
        const required =
          configured &&
          (requiredTemplateLocales.some((id) => id === locale) ||
            savedLocales.includes(locale));
        const error = errors.translations?.[locale];
        return (
          <section
            key={locale}
            aria-labelledby={`template-language-${locale}`}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <h4
              id={`template-language-${locale}`}
              className="bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
            >
              {language.name}
              <span className="text-xs font-normal">{locale}</span>
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor={`template-${locale}-title`}>
                  {t("translations.titleLabel")}{" "}
                  {required && (
                    <span aria-hidden="true" className="text-error-600">
                      *
                    </span>
                  )}
                </Label>
                <Input
                  {...register(`translations.${locale}.title`, {
                    required: required
                      ? t("validation.titleRequired", {
                          language: language.name,
                        })
                      : false,
                    validate: (value) =>
                      !configured ||
                      !!value.trim() ||
                      (!required &&
                        !getValues(
                          `translations.${locale}.description`,
                        ).trim() &&
                        !getValues(
                          `translations.${locale}.instructions`,
                        ).trim()) ||
                      t("validation.titleRequired", {
                        language: language.name,
                      }),
                    maxLength: configured
                      ? {
                          value: 200,
                          message: t("validation.max", { count: 200 }),
                        }
                      : undefined,
                  })}
                  id={`template-${locale}-title`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  aria-required={required}
                  aria-invalid={!!error?.title}
                  error={!!error?.title}
                  aria-describedby={`template-${locale}-title-error`}
                  placeholder={t("translations.titlePlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`template-${locale}-title-error`}
                  role="alert"
                  className={errorClass}
                >
                  {error?.title?.message}
                </p>
              </div>
              <div>
                <Label htmlFor={`template-${locale}-description`}>
                  {t("translations.description")}
                </Label>
                <textarea
                  {...register(`translations.${locale}.description`, {
                    maxLength: configured
                      ? {
                          value: 65535,
                          message: t("validation.max", { count: 65535 }),
                        }
                      : undefined,
                    onBlur: () => {
                      if (configured)
                        void trigger(`translations.${locale}.title`);
                    },
                  })}
                  id={`template-${locale}-description`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  rows={3}
                  aria-invalid={!!error?.description}
                  aria-describedby={`template-${locale}-description-error`}
                  placeholder={t("translations.descriptionPlaceholder", {
                    language: language.name,
                  })}
                  className={textareaClass}
                />
                <p
                  id={`template-${locale}-description-error`}
                  role="alert"
                  className={errorClass}
                >
                  {error?.description?.message}
                </p>
              </div>
              <div>
                <Label htmlFor={`template-${locale}-instructions`}>
                  {t("translations.instructions")}
                </Label>
                <textarea
                  {...register(`translations.${locale}.instructions`, {
                    maxLength: configured
                      ? {
                          value: 65535,
                          message: t("validation.max", { count: 65535 }),
                        }
                      : undefined,
                    onBlur: () => {
                      if (configured)
                        void trigger(`translations.${locale}.title`);
                    },
                  })}
                  id={`template-${locale}-instructions`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  rows={3}
                  aria-invalid={!!error?.instructions}
                  aria-describedby={`template-${locale}-instructions-error`}
                  placeholder={t("translations.instructionsPlaceholder", {
                    language: language.name,
                  })}
                  className={textareaClass}
                />
                <p
                  id={`template-${locale}-instructions-error`}
                  role="alert"
                  className={errorClass}
                >
                  {error?.instructions?.message}
                </p>
              </div>
            </div>
            {!configured && (
              <p className="text-warning-700 dark:text-warning-400 mt-2 text-xs">
                {t("translations.legacy")}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
