"use client";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { getLanguage, languages } from "@/i18n/languages";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type { CropVarietyFormValues } from "@/types/admin/cropVariety";

const textarea =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-none aria-invalid:border-error-500 dark:border-gray-700 dark:text-gray-100";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropVarietyTranslations({
  form,
  locales,
}: {
  form: UseFormReturn<CropVarietyFormValues>;
  locales: string[];
}) {
  const t = useTranslations("cropVarieties");
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
            aria-labelledby={`variety-language-${locale}`}
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <h3
                id={`variety-language-${locale}`}
                className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"
              >
                <span className="bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300 rounded-lg px-2 py-1 text-sm uppercase">
                  {locale}
                </span>
                {language.name}
              </h3>
            </div>
            {!configured && (
              <p className="text-warning-700 dark:text-warning-400 px-4 pt-3 text-xs">
                {t("translations.legacy")}
              </p>
            )}
            <div className="grid gap-4 p-4 lg:grid-cols-3">
              <div>
                <Label htmlFor={`variety-${locale}-name`}>
                  {t("translations.name")}{" "}
                  <span aria-hidden="true" className="text-error-600">
                    *
                  </span>
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
                  id={`variety-${locale}-name`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  aria-required={configured}
                  aria-invalid={!!translationErrors?.name}
                  aria-describedby={`variety-${locale}-name-error`}
                  error={!!translationErrors?.name}
                  placeholder={t("translations.namePlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`variety-${locale}-name-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.name?.message}
                </p>
              </div>
              <div>
                <Label htmlFor={`variety-${locale}-description`}>
                  {t("translations.description")}
                </Label>
                <textarea
                  {...register(`translations.${locale}.description`)}
                  id={`variety-${locale}-description`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  rows={3}
                  aria-invalid={!!translationErrors?.description}
                  aria-describedby={`variety-${locale}-description-error`}
                  placeholder={t("translations.descriptionPlaceholder", {
                    language: language.name,
                  })}
                  className={textarea}
                />
                <p
                  id={`variety-${locale}-description-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.description?.message}
                </p>
              </div>
              <div>
                <Label htmlFor={`variety-${locale}-region-notes`}>
                  {t("translations.regionNotes")}
                </Label>
                <textarea
                  {...register(`translations.${locale}.region_notes`, {
                    maxLength: configured
                      ? {
                          value: 255,
                          message: t("validation.max", { count: 255 }),
                        }
                      : undefined,
                  })}
                  id={`variety-${locale}-region-notes`}
                  lang={locale}
                  dir={language.dir}
                  readOnly={!configured}
                  rows={3}
                  aria-invalid={!!translationErrors?.region_notes}
                  aria-describedby={`variety-${locale}-region-notes-error`}
                  placeholder={t("translations.notesPlaceholder", {
                    language: language.name,
                  })}
                  className={textarea}
                />
                <p
                  id={`variety-${locale}-region-notes-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.region_notes?.message}
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
