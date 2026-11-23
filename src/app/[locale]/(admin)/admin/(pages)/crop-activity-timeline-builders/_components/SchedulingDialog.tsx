"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import type {
  CropActivityTemplate,
  CropActivityTemplateListItem,
} from "@/types/admin/cropActivityTemplate";
import type {
  ActivityTiming,
  DayWindow,
  SaveSection,
  ScheduleValues,
} from "./types";
import BuilderDialog, { applyServerErrors } from "./BuilderDialog";
import ScheduleFields, {
  scheduleError,
  schedulePayload,
  scheduleValues,
} from "./ScheduleFields";
import { TimingNote } from "./ActivityCard";

type Assess = (
  item: Pick<
    CropActivityTemplateListItem,
    | "crop_stage_id"
    | "schedule_type"
    | "schedule_basis"
    | "start_offset_days"
    | "end_offset_days"
  >,
) => ActivityTiming;

function ScheduleForm({
  record,
  stageWindows,
  assess,
  formatWindow,
  onClose,
  onSave,
}: {
  record: CropActivityTemplate;
  stageWindows: Map<number, DayWindow[]>;
  assess: Assess;
  formatWindow: (window: DayWindow, harvest?: boolean) => string;
  onClose: () => void;
  onSave: SaveSection;
}) {
  const t = useTranslations("timelineBuilder");
  const [failure, setFailure] = useState("");
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, isDirty },
  } = useForm<{ schedule: ScheduleValues }>({
    defaultValues: { schedule: scheduleValues(record) },
  });
  const stageId = record.crop_stage_id;
  return (
    <BuilderDialog
      title={t("edit.schedule")}
      description={record.title ?? undefined}
      onClose={onClose}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure}
      onSubmit={handleSubmit(async ({ schedule }) => {
        setFailure("");
        const result = await onSave(record, schedulePayload(schedule));
        if (result.success) return;
        const message = applyServerErrors(
          result,
          (target, text) => {
            if (target !== "schedule" && target !== "crop_stage_id")
              return false;
            setError("schedule", { type: "server", message: text });
            return true;
          },
          t("feedback.saveFailed"),
        );
        setFailure(message);
        toast.error(message);
      })}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {record.crop_stage_name
          ? t("schedule.stageInfo", { stage: record.crop_stage_name })
          : t("schedule.independent")}
      </p>
      <Controller
        name="schedule"
        control={control}
        rules={{
          validate: (value) => {
            const problem = scheduleError(value, stageId);
            return !problem || t(`validation.schedule.${problem}`);
          },
        }}
        render={({ field, fieldState }) => (
          <ScheduleFields
            idPrefix="builder-schedule"
            value={field.value}
            onChange={field.onChange}
            hasStage={stageId !== null}
            stageHasTiming={stageId !== null && stageWindows.has(stageId)}
            disabled={isSubmitting}
            error={fieldState.error?.message}
            preview={
              !scheduleError(field.value, stageId) && (
                <TimingNote
                  timing={assess({
                    crop_stage_id: stageId,
                    ...schedulePayload(field.value),
                  })}
                  formatWindow={formatWindow}
                />
              )
            }
          />
        )}
      />
      <p className="bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-950 dark:text-blue-light-300 rounded-lg p-3 text-xs">
        {t("schedule.justificationUnavailable")}
      </p>
    </BuilderDialog>
  );
}

export default function SchedulingDialog(props: {
  record?: CropActivityTemplate;
  stageWindows: Map<number, DayWindow[]>;
  assess: Assess;
  formatWindow: (window: DayWindow, harvest?: boolean) => string;
  onClose: () => void;
  onSave: SaveSection;
}) {
  const t = useTranslations("timelineBuilder");
  const { record } = props;
  return record ? (
    <ScheduleForm {...props} record={record} />
  ) : (
    <BuilderDialog title={t("edit.schedule")} onClose={props.onClose} loading />
  );
}
