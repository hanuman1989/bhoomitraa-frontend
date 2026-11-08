"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { getLanguage, languages } from "@/i18n/languages";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import {
  requiredActivityCategoryLocales,
  type ActivityCategoryFormValues,
} from "@/types/admin/activityCategory";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function ActivityCategoryTranslations({
  form,
  locales,
  savedLocales,
}: {
  form: UseFormReturn<ActivityCategoryFormValues>;
  locales: string[];
  savedLocales: string[];
}) {
  const t = useTranslations("activityCategories");
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
          (requiredActivityCategoryLocales.some(
            (required) => required === locale,
          ) ||
            savedLocales.includes(locale));
        const translationErrors = errors.translations?.[locale];
        return (
          <section
            key={locale}
            aria-labelledby={`activity-category-language-${locale}`}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <h4
              id={`activity-category-language-${locale}`}
              className="bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
            >
              {language.name}
              <span className="text-xs font-normal">{locale}</span>
            </h4>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <Label htmlFor={`activity-category-${locale}-name`}>
                  {t("translations.name")}{" "}
                  {required && (
                    <span aria-hidden="true" className="text-error-600">
                      *
                    </span>
                  )}
                </Label>
                <Input
                  {...register(`translations.${locale}.name`, {
                    required: required
                      ? t("validation.nameRequired", {
                          language: language.name,
                        })
                      : false,
                    validate: (value) =>
                      !configured ||
                      !!value.trim() ||
                      (!required &&
                        !getValues(
                          `translations.${locale}.description`,
                        ).trim()) ||
                      t("validation.nameRequired", { language: language.name }),
                    maxLength: configured
                      ? {
                          value: 150,
                          message: t("validation.max", { count: 150 }),
                        }
                      : undefined,
                  })}
                  id={`activity-category-${locale}-name`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  aria-required={required}
                  aria-invalid={!!translationErrors?.name}
                  aria-describedby={`activity-category-${locale}-name-error`}
                  error={!!translationErrors?.name}
                  placeholder={t("translations.namePlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`activity-category-${locale}-name-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.name?.message}
                </p>
              </div>
              <div className="md:col-span-3">
                <Label htmlFor={`activity-category-${locale}-description`}>
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
                        void trigger(`translations.${locale}.name`);
                    },
                  })}
                  id={`activity-category-${locale}-description`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  rows={2}
                  aria-invalid={!!translationErrors?.description}
                  aria-describedby={`activity-category-${locale}-description-error`}
                  placeholder={t("translations.descriptionPlaceholder", {
                    language: language.name,
                  })}
                  className="shadow-theme-xs focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:text-gray-100"
                />
                <p
                  id={`activity-category-${locale}-description-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.description?.message}
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
