"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { getLanguage, languages } from "@/i18n/languages";
import type { RegionFormValues } from "@/types/admin/region";

interface RegionNameFieldsProps {
  form: UseFormReturn<RegionFormValues>;
  children: ReactNode;
}

export default function RegionNameFields({
  form,
  children,
}: RegionNameFieldsProps) {
  const t = useTranslations("regions.form");
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <ComponentCard title={t("namesTitle")} desc={t("namesDescription")}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-start text-sm">
          <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th
                scope="col"
                className="w-1/4 border border-gray-200 px-4 py-3 text-start font-medium dark:border-gray-700"
              >
                {t("language")}
              </th>
              <th
                scope="col"
                className="border border-gray-200 px-4 py-3 text-start font-medium dark:border-gray-700"
              >
                {t("nameLabel")}
              </th>
            </tr>
          </thead>
          <tbody>
            {languages.map(({ id }) => {
              const language = getLanguage(id);
              const error = errors.translations?.[id]?.name;
              const required = t("nameRequired", { language: language.name });
              return (
                <tr key={id}>
                  <th
                    scope="row"
                    className="border border-gray-200 px-4 py-3 text-start font-medium text-gray-800 dark:border-gray-700 dark:text-gray-200"
                  >
                    <Label htmlFor={`region-name-${id}`} className="mb-0">
                      {language.name} ({id})
                    </Label>
                  </th>
                  <td className="border border-gray-200 px-3 py-2 dark:border-gray-700">
                    <Input
                      {...register(`translations.${id}.name`, {
                        required,
                        validate: (value) => Boolean(value.trim()) || required,
                        maxLength: { value: 150, message: t("nameMax") },
                      })}
                      id={`region-name-${id}`}
                      lang={id}
                      dir={language.dir}
                      maxLength={150}
                      placeholder={t("namePlaceholder", {
                        language: language.name,
                      })}
                      aria-required="true"
                      error={!!error}
                      aria-invalid={!!error}
                      aria-describedby={
                        error ? `region-name-${id}-error` : undefined
                      }
                    />
                    {error && (
                      <p
                        id={`region-name-${id}-error`}
                        role="alert"
                        className="text-theme-xs text-error-600 dark:text-error-400 mt-1"
                      >
                        {error.message}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {children}
    </ComponentCard>
  );
}
