"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { getLanguage, languages } from "@/i18n/languages";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type { SeasonFormValues } from "@/types/admin/season";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function SeasonTranslations({
  form,
  locales,
}: {
  form: UseFormReturn<SeasonFormValues>;
  locales: string[];
}) {
  const t = useTranslations("seasons");
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-4">
      {locales.map((locale) => {
        const configured = languages.some((language) => language.id === locale);
        const language = configured
          ? getLanguage(locale)
          : { name: locale, dir: "ltr" as const };
        const translationErrors = errors.translations?.[locale];
        return (
          <section
            key={locale}
            aria-labelledby={`season-language-${locale}`}
            className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3
                id={`season-language-${locale}`}
                className="bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300 rounded-full px-3 py-1 text-sm font-semibold"
              >
                {t("translations.language", {
                  language: language.name,
                  locale,
                })}
              </h3>
            </div>
            {!configured && (
              <p className="text-warning-700 dark:text-warning-400 mb-3 text-xs">
                {t("translations.legacy")}
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label htmlFor={`season-${locale}-name`}>
                  {t("translations.name")}{" "}
                  {configured && (
                    <span aria-hidden="true" className="text-error-600">
                      *
                    </span>
                  )}
                </Label>
                <Input
                  {...register(`translations.${locale}.name`, {
                    required: configured
                      ? t("validation.nameRequired", {
                          language: language.name,
                        })
                      : false,
                    validate: (value) =>
                      !configured ||
                      !!value.trim() ||
                      t("validation.nameRequired", { language: language.name }),
                    maxLength: configured
                      ? {
                          value: 255,
                          message: t("validation.max", { count: 255 }),
                        }
                      : undefined,
                  })}
                  id={`season-${locale}-name`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  aria-required={configured}
                  aria-invalid={!!translationErrors?.name}
                  aria-describedby={`season-${locale}-name-error`}
                  error={!!translationErrors?.name}
                  placeholder={t("translations.namePlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`season-${locale}-name-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.name?.message}
                </p>
              </div>
              <div>
                <Label htmlFor={`season-${locale}-description`}>
                  {t("translations.description")}
                </Label>
                <textarea
                  {...register(`translations.${locale}.description`)}
                  id={`season-${locale}-description`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  rows={3}
                  aria-invalid={!!translationErrors?.description}
                  aria-describedby={`season-${locale}-description-error`}
                  placeholder={t("translations.descriptionPlaceholder", {
                    language: language.name,
                  })}
                  className="shadow-theme-xs focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:text-gray-100"
                />
                <p
                  id={`season-${locale}-description-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.description?.message}
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
