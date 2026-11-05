"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Switch from "@/components/admin/form/switch/Switch";
import type { CropStageFormValues } from "@/types/admin/cropStage";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
export default function CropStageSettings({
  form,
  busy,
}: {
  form: UseFormReturn<CropStageFormValues>;
  busy: boolean;
}) {
  const t = useTranslations("cropStages");
  const {
    control,
    formState: { errors },
  } = form;
  return (
    <aside className="min-w-0 space-y-5">
      <ComponentCard title={t("form.publication")} className={cardClass}>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <div
              ref={field.ref}
              role="switch"
              aria-label={t("form.activeLabel")}
              aria-checked={field.value}
              aria-invalid={!!errors.is_active}
              aria-describedby="stage-active-help stage-active-error"
              aria-disabled={busy}
              tabIndex={busy ? -1 : 0}
              onBlur={field.onBlur}
              onKeyDown={(event) => {
                if (!busy && [" ", "Enter"].includes(event.key)) {
                  event.preventDefault();
                  field.onChange(!field.value);
                }
              }}
              className="focus-visible:outline-brand-500 inline-flex rounded-lg p-1 focus-visible:outline-2"
            >
              <Switch
                key={String(field.value)}
                defaultChecked={field.value}
                disabled={busy}
                onChange={field.onChange}
                label={t("form.activeLabel")}
              />
            </div>
          )}
        />
        <p
          id="stage-active-help"
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {t("form.activeHelp")}
        </p>
        <p
          id="stage-active-error"
          role="alert"
          className="text-error-600 dark:text-error-400 text-xs"
        >
          {errors.is_active?.message}
        </p>
      </ComponentCard>
      <ComponentCard title={t("form.guidelines")} className={cardClass}>
        <ul className="marker:text-brand-500 list-disc space-y-3 ps-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
          <li>{t("form.guideCode")}</li>
          <li>{t("form.guideSequence")}</li>
          <li>{t("form.guideLanguages")}</li>
          <li>{t("form.guideHistory")}</li>
        </ul>
      </ComponentCard>
    </aside>
  );
}
