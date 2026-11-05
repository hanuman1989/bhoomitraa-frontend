"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { getLanguage, languages } from "@/i18n/languages";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import {
  requiredStageLocales,
  type CropStageFormValues,
} from "@/types/admin/cropStage";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropStageTranslations({
  form,
  locales,
  savedLocales,
}: {
  form: UseFormReturn<CropStageFormValues>;
  locales: string[];
  savedLocales: string[];
}) {
  const t = useTranslations("cropStages");
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
          (requiredStageLocales.some((required) => required === locale) ||
            savedLocales.includes(locale));
        const translationErrors = errors.translations?.[locale];
        return (
          <section
            key={locale}
            aria-labelledby={`stage-language-${locale}`}
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <div className="grid gap-4 p-4 lg:grid-cols-7">
              <div className="bg-brand-50 dark:bg-brand-950 rounded-lg p-3 lg:col-span-1">
                <h3
                  id={`stage-language-${locale}`}
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  {language.name}
                </h3>
                <span className="bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300 mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold">
                  {locale}
                </span>
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`stage-${locale}-name`}>
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
                          value: 255,
                          message: t("validation.max", { count: 255 }),
                        }
                      : undefined,
                  })}
                  id={`stage-${locale}-name`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  aria-required={required}
                  aria-invalid={!!translationErrors?.name}
                  aria-describedby={`stage-${locale}-name-error`}
                  error={!!translationErrors?.name}
                  placeholder={t("translations.namePlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`stage-${locale}-name-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.name?.message}
                </p>
              </div>
              <div className="lg:col-span-3">
                <Label htmlFor={`stage-${locale}-description`}>
                  {t("translations.description")}
                </Label>
                <textarea
                  {...register(`translations.${locale}.description`, {
                    onBlur: () => {
                      if (configured)
                        void trigger(`translations.${locale}.name`);
                    },
                  })}
                  id={`stage-${locale}-description`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  rows={3}
                  aria-invalid={!!translationErrors?.description}
                  aria-describedby={`stage-${locale}-description-error`}
                  placeholder={t("translations.descriptionPlaceholder", {
                    language: language.name,
                  })}
                  className="shadow-theme-xs focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:text-gray-100"
                />
                <p
                  id={`stage-${locale}-description-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.description?.message}
                </p>
              </div>
            </div>
            {!configured && (
              <p className="text-warning-700 dark:text-warning-400 px-4 pb-3 text-xs">
                {t("translations.legacy")}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
