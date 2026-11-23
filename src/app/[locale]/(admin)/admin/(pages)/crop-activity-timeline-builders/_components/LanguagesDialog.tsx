"use client";

import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { languages } from "@/i18n/languages";
import { requiredTemplateLocales } from "@/types/admin/cropActivityTemplate";
import BuilderDialog from "./BuilderDialog";

/**
 * Chooses which configured translation sections are shown by default.
 * Display-only: hidden locales keep their saved content.
 */
export default function LanguagesDialog({
  locales,
  onClose,
  onSave,
}: {
  locales: string[];
  onClose: () => void;
  onSave: (locales: string[]) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const required = (id: string) =>
    requiredTemplateLocales.some((locale) => locale === id);
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<{ locales: string[] }>({
    defaultValues: { locales: locales.filter((id) => !required(id)) },
  });
  return (
    <BuilderDialog
      title={t("languages.title")}
      description={t("languages.description")}
      onClose={onClose}
      dirty={isDirty}
      onSubmit={handleSubmit((values) => onSave(values.locales))}
    >
      {languages.map(({ id, name }) => (
        <label
          key={id}
          className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          {required(id) ? (
            <input type="checkbox" checked disabled className="size-4" />
          ) : (
            <input
              type="checkbox"
              value={id}
              {...register("locales")}
              className="accent-brand-600 size-4"
            />
          )}
          <span className="flex-1">
            {name} <span className="text-xs text-gray-500">{id}</span>
          </span>
          {required(id) && (
            <span className="text-xs text-gray-500">
              {t("languages.required")}
            </span>
          )}
        </label>
      ))}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("languages.note")}
      </p>
    </BuilderDialog>
  );
}
