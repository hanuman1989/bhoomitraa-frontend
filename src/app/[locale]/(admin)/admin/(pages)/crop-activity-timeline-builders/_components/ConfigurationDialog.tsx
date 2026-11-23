"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import type { TemplateSelectionOption } from "@/types/admin/cropActivityTemplate";
import type { TimelineState } from "@/types/admin/cropStageTimeline";
import type {
  ApplicabilityValues,
  BuilderConfig,
  BuilderOption,
} from "./types";
import BuilderDialog from "./BuilderDialog";
import ApplicabilityFields, {
  applicabilityComplete,
} from "./ApplicabilityFields";

const emptyApplicability: ApplicabilityValues = {
  variety_scope: "all",
  crop_variety_ids: [],
  season_scope: "all",
  season_ids: [],
  region_scope: "all",
  region_ids: [],
  knowledge_source_ids: [],
};

/** Saves reusable defaults locally; it never creates a database record. */
export default function ConfigurationDialog({
  config,
  sources,
  states,
  varieties,
  seasons,
  onClose,
  onSave,
}: {
  config: BuilderConfig | null;
  sources: TemplateSelectionOption[];
  states: TimelineState[];
  varieties: BuilderOption[];
  seasons: BuilderOption[];
  onClose: () => void;
  onSave: (config: BuilderConfig) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const [crop, setCrop] = useState<TemplateSelectionOption | null>(
    config?.crop ?? null,
  );
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<{ crop_id: string; app: ApplicabilityValues }>({
    defaultValues: {
      crop_id: config ? String(config.crop.id) : "",
      app: config?.app ?? emptyApplicability,
    },
  });
  const cropValue = useWatch({ control, name: "crop_id" });
  const sameCrop = crop?.id === config?.crop.id;
  return (
    <BuilderDialog
      title={t("config.title")}
      description={t("config.description")}
      onClose={onClose}
      dirty={isDirty}
      wide
      submitLabel={t("config.save")}
      onSubmit={handleSubmit((values) => {
        if (!crop) return;
        onSave({
          crop: { id: Number(values.crop_id), label: crop.label },
          app: values.app,
        });
      })}
    >
      <Controller
        name="crop_id"
        control={control}
        rules={{ required: t("validation.crop") }}
        render={({ field }) => (
          <TimelineRelationSelect
            kind="crop"
            id="builder-config-crop"
            label={t("fields.crop")}
            value={field.value}
            inputRef={field.ref}
            onBlur={field.onBlur}
            onChange={(value) => {
              if (value === field.value) return;
              field.onChange(value);
              // Varieties belong to a crop; clear incompatible selections.
              setValue(
                "app",
                { ...getValues("app"), crop_variety_ids: [] },
                { shouldDirty: true },
              );
            }}
            onSelectionChange={(option) =>
              setCrop(option && { id: option.id, label: option.label })
            }
            initialSelection={
              config
                ? {
                    id: config.crop.id,
                    label: config.crop.label,
                    is_active: true,
                  }
                : null
            }
            eligible
            required
            error={errors.crop_id?.message}
          />
        )}
      />
      <Controller
        name="app"
        control={control}
        rules={{
          validate: (value) =>
            applicabilityComplete(value) || t("validation.applicability"),
        }}
        render={({ field, fieldState }) => (
          <ApplicabilityFields
            idPrefix="builder-config"
            value={field.value}
            onChange={field.onChange}
            cropId={cropValue ? Number(cropValue) : null}
            varieties={sameCrop ? varieties : []}
            seasons={seasons}
            sources={sources}
            states={states}
            disabled={false}
            error={fieldState.error?.message}
          />
        )}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("config.note")}
      </p>
    </BuilderDialog>
  );
}
