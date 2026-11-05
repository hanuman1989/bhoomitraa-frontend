"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { getLanguage, languages } from "@/i18n/languages";
import type { CropCategoryFormValues } from "@/types/admin/cropCategory";

const row =
  "grid items-start gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,2fr)] dark:border-gray-700";
const textarea =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 aria-invalid:border-error-500 dark:border-gray-700 dark:text-gray-100";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function CropCategoryTranslationFields({
  form,
}: {
  form: UseFormReturn<CropCategoryFormValues>;
}) {
  const t = useTranslations("cropCategories.form");
  const {
    register,
    formState: { errors },
  } = form;
  const maxName = { value: 255, message: t("nameMax") };
  const maxDescription = { value: 65535, message: t("descriptionMax") };
  return (
    <section
      aria-labelledby="category-translations"
      className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800"
    >
      <div>
        <h2
          id="category-translations"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          {t("translationsTitle")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("translationsHelp")}
        </p>
      </div>
      {languages.map(({ id }) => {
        const language = getLanguage(id);
        const translationErrors = errors.translations?.[id];
        const required = t("nameRequired", { language: language.name });
        return (
          <section
            key={id}
            aria-labelledby={`category-language-${id}`}
            className={row}
          >
            <h3
              id={`category-language-${id}`}
              className="flex items-center gap-1 font-semibold text-gray-900 sm:col-span-2 lg:col-span-1 lg:pt-7 dark:text-white"
            >
              <span
                aria-hidden="true"
                className="bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 rounded-lg px-2 py-2 text-sm uppercase"
              >
                {id}
              </span>
              {language.name}
              <span aria-hidden="true" className="text-error-600">
                *
              </span>
            </h3>
            <div>
              <Label htmlFor={`category-${id}-name`}>
                {t("name")}{" "}
                <span aria-hidden="true" className="text-error-600">
                  *
                </span>
              </Label>
              <Input
                {...register(`translations.${id}.name`, {
                  required,
                  validate: (value) => !!value.trim() || required,
                  maxLength: maxName,
                })}
                id={`category-${id}-name`}
                lang={id}
                dir={language.dir}
                aria-required="true"
                aria-invalid={!!translationErrors?.name}
                aria-describedby={`category-${id}-name-error`}
                error={!!translationErrors?.name}
                placeholder={t("namePlaceholder", { language: language.name })}
              />
              <p
                id={`category-${id}-name-error`}
                role="alert"
                className={errorClass}
              >
                {translationErrors?.name?.message}
              </p>
            </div>
            <div>
              <Label htmlFor={`category-${id}-description`}>
                {t("description")}
              </Label>
              <textarea
                {...register(`translations.${id}.description`, {
                  maxLength: maxDescription,
                })}
                id={`category-${id}-description`}
                lang={id}
                dir={language.dir}
                rows={3}
                aria-invalid={!!translationErrors?.description}
                aria-describedby={`category-${id}-description-error`}
                placeholder={t("descriptionPlaceholder", {
                  language: language.name,
                })}
                className={textarea}
              />
              <p
                id={`category-${id}-description-error`}
                role="alert"
                className={errorClass}
              >
                {translationErrors?.description?.message}
              </p>
            </div>
          </section>
        );
      })}
    </section>
  );
}
