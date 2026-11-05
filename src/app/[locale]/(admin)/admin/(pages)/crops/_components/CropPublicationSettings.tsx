"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Switch from "@/components/admin/form/switch/Switch";
import type { CropFormValues } from "@/types/admin/crop";
import type { CropCategory } from "@/types/admin/cropCategory";

export default function CropPublicationSettings({
  form,
  busy,
  canManageAI,
  categories,
}: {
  form: UseFormReturn<CropFormValues>;
  busy: boolean;
  canManageAI: boolean;
  categories: CropCategory[];
}) {
  const t = useTranslations("crops");
  const {
    control,
    formState: { errors },
  } = form;
  return (
    <ComponentCard
      title={t("form.publicationTitle")}
      className="shadow-theme-xs rounded-xl"
    >
      <div>
        <Controller
          name="is_active"
          control={control}
          rules={{
            validate: (value) =>
              !value ||
              categories.some(
                (category) =>
                  category.id === Number(form.getValues("category_id")) &&
                  category.is_active,
              ) ||
              t("validation.activeCategory"),
          }}
          render={({ field }) => (
            <div
              ref={field.ref}
              role="switch"
              aria-checked={field.value}
              aria-disabled={busy}
              aria-label={t("active")}
              aria-describedby="crop-active-help crop-active-error"
              aria-invalid={!!errors.is_active}
              tabIndex={busy ? -1 : 0}
              onBlur={field.onBlur}
              onKeyDown={(event) => {
                if (!busy && (event.key === " " || event.key === "Enter")) {
                  event.preventDefault();
                  field.onChange(!field.value);
                }
              }}
              className="focus-visible:outline-brand-500 inline-flex rounded-lg p-1 focus-visible:outline-2"
            >
              <Switch
                key={String(field.value)}
                defaultChecked={field.value}
                onChange={field.onChange}
                disabled={busy}
                label={t("active")}
              />
            </div>
          )}
        />
        <p
          id="crop-active-help"
          className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400"
        >
          {t("form.activeHelp")}
        </p>
        <p
          id="crop-active-error"
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1 text-xs"
        >
          {errors.is_active?.message}
        </p>
      </div>
      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <Controller
          name="ai_diagnosis_enabled"
          control={control}
          render={({ field }) => (
            <div
              ref={field.ref}
              role="switch"
              aria-checked={field.value}
              aria-disabled={busy || !canManageAI}
              aria-label={t("form.aiDiagnosis")}
              aria-describedby="crop-ai-help crop-ai-error"
              aria-invalid={!!errors.ai_diagnosis_enabled}
              tabIndex={busy || !canManageAI ? -1 : 0}
              onBlur={field.onBlur}
              onKeyDown={(event) => {
                if (
                  !busy &&
                  canManageAI &&
                  (event.key === " " || event.key === "Enter")
                ) {
                  event.preventDefault();
                  field.onChange(!field.value);
                }
              }}
              className="focus-visible:outline-brand-500 inline-flex rounded-lg p-1 focus-visible:outline-2"
            >
              <Switch
                key={String(field.value)}
                defaultChecked={field.value}
                onChange={field.onChange}
                disabled={busy || !canManageAI}
                label={t("form.aiDiagnosis")}
              />
            </div>
          )}
        />
        <p
          id="crop-ai-help"
          className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400"
        >
          {canManageAI ? t("form.aiHelp") : t("form.aiReadOnly")}
        </p>
        <p
          id="crop-ai-error"
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1 text-xs"
        >
          {errors.ai_diagnosis_enabled?.message}
        </p>
      </div>
    </ComponentCard>
  );
}
