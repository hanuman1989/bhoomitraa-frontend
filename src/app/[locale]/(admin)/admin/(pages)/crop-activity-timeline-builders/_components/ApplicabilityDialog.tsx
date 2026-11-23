"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import type {
  CropActivityTemplate,
  TemplateSelectionOption,
} from "@/types/admin/cropActivityTemplate";
import type { TimelineState } from "@/types/admin/cropStageTimeline";
import type {
  ApplicabilityValues,
  BuilderConfig,
  BuilderOption,
  SaveSection,
} from "./types";
import BuilderDialog, { applyServerErrors, buttonClass } from "./BuilderDialog";
import ApplicabilityFields, {
  applicabilityComplete,
} from "./ApplicabilityFields";

interface Props {
  record?: CropActivityTemplate;
  config: BuilderConfig;
  configSources: TemplateSelectionOption[];
  sources: TemplateSelectionOption[];
  states: TimelineState[];
  varieties: BuilderOption[];
  seasons: BuilderOption[];
  onClose: () => void;
  onSave: SaveSection;
}

function ApplicabilityForm({
  record,
  config,
  configSources,
  sources,
  states,
  varieties,
  seasons,
  onClose,
  onSave,
}: Props & { record: CropActivityTemplate }) {
  const t = useTranslations("timelineBuilder");
  const [failure, setFailure] = useState("");
  // Pickers learn option labels when mounted; remount them after a reset so
  // Common Configuration selections show names instead of bare IDs.
  const [resetKey, setResetKey] = useState(0);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, isDirty },
  } = useForm<{ app: ApplicabilityValues }>({
    defaultValues: {
      app: {
        variety_scope: record.variety_scope,
        crop_variety_ids: [...record.crop_variety_ids],
        season_scope: record.season_scope,
        season_ids: [...record.season_ids],
        region_scope: record.region_scope,
        region_ids: [...record.region_ids],
        knowledge_source_ids: [...record.knowledge_source_ids],
      },
    },
  });
  // Common defaults only apply to this crop's templates.
  const canReset = config.crop.id === record.crop_id;
  return (
    <BuilderDialog
      title={t("edit.applicability")}
      description={t("applicabilityDialog.description", {
        crop: record.crop_name ?? t("recordId", { id: record.crop_id }),
      })}
      onClose={onClose}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure}
      wide
      onSubmit={handleSubmit(async ({ app }) => {
        setFailure("");
        const result = await onSave(record, {
          variety_scope: app.variety_scope,
          crop_variety_ids:
            app.variety_scope === "all" ? [] : app.crop_variety_ids,
          season_scope: app.season_scope,
          season_ids: app.season_scope === "all" ? [] : app.season_ids,
          region_scope: app.region_scope,
          region_ids: app.region_scope === "all" ? [] : app.region_ids,
          knowledge_source_ids: app.knowledge_source_ids,
        });
        if (result.success) return;
        const message = applyServerErrors(
          result,
          (target, text) => {
            if (target !== "app") return false;
            setError("app", { type: "server", message: text });
            return true;
          },
          t("feedback.saveFailed"),
        );
        setFailure(message);
        toast.error(message);
      })}
    >
      <Controller
        name="app"
        control={control}
        rules={{
          validate: (value) =>
            applicabilityComplete(value) || t("validation.applicability"),
        }}
        render={({ field, fieldState }) => (
          <>
            <ApplicabilityFields
              key={resetKey}
              idPrefix="builder-applicability"
              value={field.value}
              onChange={field.onChange}
              cropId={record.crop_id}
              varieties={varieties}
              seasons={seasons}
              sources={[...sources, ...configSources]}
              states={states}
              disabled={isSubmitting}
              error={fieldState.error?.message}
            />
            {canReset && (
              <button
                type="button"
                onClick={() => {
                  field.onChange(structuredClone(config.app));
                  setResetKey((value) => value + 1);
                }}
                className={buttonClass}
              >
                {t("resetToCommon")}
              </button>
            )}
          </>
        )}
      />
      <p className="bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300 rounded-lg p-3 text-xs">
        {t("applicabilityDialog.revalidate")}
      </p>
    </BuilderDialog>
  );
}

export default function ApplicabilityDialog(props: Props) {
  const t = useTranslations("timelineBuilder");
  const { record } = props;
  return record ? (
    <ApplicabilityForm {...props} record={record} />
  ) : (
    <BuilderDialog
      title={t("edit.applicability")}
      onClose={props.onClose}
      loading
    />
  );
}
