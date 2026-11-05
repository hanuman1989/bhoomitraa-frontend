"use client";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Switch from "@/components/admin/form/switch/Switch";
import { DocsIcon, InfoIcon } from "@/icons";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import type {
  CropVarietyFormValues,
  VarietyRelationPage,
} from "@/types/admin/cropVariety";
import VarietyRelationSelect from "./VarietyRelationSelect";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropVarietySettings({
  form,
  sourceOptions,
  initialSource,
  formVersion,
  isSubmitting,
}: {
  form: UseFormReturn<CropVarietyFormValues>;
  sourceOptions: VarietyRelationPage;
  initialSource: KnowledgeSource | null;
  formVersion: number;
  isSubmitting: boolean;
}) {
  const t = useTranslations("cropVarieties");
  const {
    control,
    getValues,
    formState: { errors },
  } = form;
  return (
    <aside className="min-w-0 space-y-5">
      <ComponentCard
        title={t("form.sourceTitle")}
        className="rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
      >
        <Controller
          name="source_id"
          control={control}
          rules={{
            validate: (value) =>
              !getValues("is_active") ||
              (!getValues("maturity_days_min") &&
                !getValues("maturity_days_max")) ||
              !!value ||
              t("validation.source"),
          }}
          render={({ field }) => (
            <VarietyRelationSelect
              key={`source-${formVersion}`}
              kind="source"
              id="variety-source"
              label={t("fields.source")}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              initialPage={sourceOptions}
              initialSelection={initialSource}
              eligible
              disabled={isSubmitting}
              error={errors.source_id?.message}
            />
          )}
        />
        <p className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("form.sourceHelp")}
        </p>
      </ComponentCard>
      <ComponentCard
        title={t("form.publication")}
        className="rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
      >
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <div
              ref={field.ref}
              role="switch"
              aria-checked={field.value}
              aria-label={t("fields.status")}
              aria-invalid={!!errors.is_active}
              aria-describedby="variety-active-error"
              aria-disabled={isSubmitting}
              tabIndex={isSubmitting ? -1 : 0}
              onBlur={field.onBlur}
              onKeyDown={(event) => {
                if (!isSubmitting && [" ", "Enter"].includes(event.key)) {
                  event.preventDefault();
                  field.onChange(!field.value);
                }
              }}
              className="focus-visible:outline-brand-500 inline-flex rounded-lg p-1 focus-visible:outline-2"
            >
              <Switch
                key={String(field.value)}
                defaultChecked={field.value}
                disabled={isSubmitting}
                onChange={field.onChange}
                label={field.value ? t("active") : t("inactive")}
              />
            </div>
          )}
        />
        <p id="variety-active-error" role="alert" className={errorClass}>
          {errors.is_active?.message}
        </p>
      </ComponentCard>
      <ComponentCard
        title={t("form.guidelines")}
        className="rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
      >
        <DocsIcon aria-hidden="true" className="text-success-600 size-6" />
        <ul className="list-disc space-y-3 ps-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
          <li>{t("form.guideCrop")}</li>
          <li>{t("form.guideSlug")}</li>
          <li>{t("form.guideNames")}</li>
          <li>{t("form.guideMaturity")}</li>
          <li>{t("form.guideSource")}</li>
          <li>{t("form.guideHistory")}</li>
        </ul>
      </ComponentCard>
    </aside>
  );
}
