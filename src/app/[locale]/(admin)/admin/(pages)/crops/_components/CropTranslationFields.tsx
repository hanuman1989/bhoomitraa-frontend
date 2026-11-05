"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { getLanguage, languages } from "@/i18n/languages";
import type { CropFormValues } from "@/types/admin/crop";

const panel =
  "grid gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-4 dark:border-gray-700";
const textArea =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 aria-invalid:border-error-500 dark:border-gray-700 dark:text-gray-100";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function CropTranslationFields({
  form,
}: {
  form: UseFormReturn<CropFormValues>;
}) {
  const t = useTranslations("crops");
  const {
    register,
    formState: { errors },
  } = form;
  const nameRules = {
    required: t("validation.required"),
    validate: (value: string) => !!value.trim() || t("validation.required"),
    maxLength: { value: 255, message: t("validation.max", { count: 255 }) },
  };
  const descriptionRules = {
    maxLength: { value: 65535, message: t("validation.max", { count: 65535 }) },
  };
  return (
    <section
      aria-labelledby="crop-translations"
      className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800"
    >
      <div>
        <h2
          id="crop-translations"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          {t("form.translationsTitle")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("form.translationsHelp")}
        </p>
      </div>
      {languages.map(({ id }) => {
        const language = getLanguage(id);
        const translationErrors = errors.translations?.[id];
        return (
          <section
            key={id}
            aria-labelledby={`crop-language-${id}`}
            className={panel}
          >
            <h3
              id={`crop-language-${id}`}
              className="flex items-center gap-1 self-start font-semibold text-gray-900 md:pt-7 dark:text-white"
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
            <div className="space-y-4 md:col-span-3">
              <div>
                <Label htmlFor={`crop-${id}-name`}>
                  {t("form.name")}{" "}
                  <span aria-hidden="true" className="text-error-600">
                    *
                  </span>
                </Label>
                <Input
                  {...register(`translations.${id}.name`, nameRules)}
                  id={`crop-${id}-name`}
                  lang={id}
                  dir={language.dir}
                  aria-required="true"
                  aria-invalid={!!translationErrors?.name}
                  aria-describedby={`crop-${id}-name-error`}
                  error={!!translationErrors?.name}
                  placeholder={t("form.namePlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`crop-${id}-name-error`}
                  role="alert"
                  className={errorClass}
                >
                  {translationErrors?.name?.message}
                </p>
              </div>
              <div>
                <Label htmlFor={`crop-${id}-description`}>
                  {t("form.description")}
                </Label>
                <textarea
                  {...register(
                    `translations.${id}.description`,
                    descriptionRules,
                  )}
                  id={`crop-${id}-description`}
                  lang={id}
                  dir={language.dir}
                  rows={3}
                  aria-invalid={!!translationErrors?.description}
                  aria-describedby={`crop-${id}-description-error`}
                  className={textArea}
                  placeholder={t("form.descriptionPlaceholder", {
                    language: language.name,
                  })}
                />
                <p
                  id={`crop-${id}-description-error`}
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
    </section>
  );
}
