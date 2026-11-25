"use client";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import type {
  ActivityMutationData,
  RescheduleInput,
  TimelineActivity,
} from "@/types/account/cropTimeline";
import type { ActionResult } from "@/types/api";
import {
  CropField,
  CropNotice,
  cropButton,
  cropFieldErrors,
  cropPrimary,
} from "../../crops/_components/CropUi";
import CropDateInput from "../../crops/_components/CropDateInput";
import TimelineDialogShell from "./TimelineDialogShell";
import { IconTile } from "./CategoryIcon";

type RescheduleForm = { start_date: string; end_date: string };

/** Move only this activity, or return it to its planned dates. */
export default function RescheduleDialog({
  activity,
  onClose,
  onSave,
}: {
  activity: TimelineActivity;
  onClose: () => void;
  onSave: (
    values: RescheduleInput,
  ) => Promise<ActionResult<ActivityMutationData>>;
}) {
  const t = useTranslations("farmerCropTimeline.rescheduleDialog");
  const tc = useTranslations("farmerCropTimeline.confirm");
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RescheduleForm>({
    defaultValues: {
      start_date: activity.start_date,
      end_date: activity.end_date,
    },
  });
  const save = async (values: RescheduleInput) => {
    const result = await onSave(values);
    if (!result.success) cropFieldErrors(result, setError);
  };
  return (
    <TimelineDialogShell
      title={t("title")}
      subtitle={activity.title ?? undefined}
      icon={
        <IconTile
          icon={activity.category?.icon}
          tone={activity.category?.tone}
          className="size-9 rounded-lg"
          iconClassName="size-4.5"
        />
      }
      busy={isSubmitting}
      onClose={onClose}
      footer={
        <>
          {activity.is_rescheduled && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(() => save({ reset: true }))}
              className={`${cropButton} me-auto`}
            >
              {t("backToPlanned")}
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className={cropButton}
          >
            {tc("cancel")}
          </button>
          <button
            type="submit"
            form="timeline-reschedule-form"
            disabled={isSubmitting}
            className={cropPrimary}
          >
            {t("save")}
          </button>
        </>
      }
    >
      <form
        id="timeline-reschedule-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          save({ start_date: values.start_date, end_date: values.end_date }),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CropField
            id="timeline-start-date"
            label={t("startDate")}
            error={errors.start_date?.message}
            required
          >
            <CropDateInput
              id="timeline-start-date"
              aria-invalid={!!errors.start_date}
              aria-describedby={
                errors.start_date ? "timeline-start-date-error" : undefined
              }
              {...register("start_date", { required: t("required") })}
            />
          </CropField>
          <CropField
            id="timeline-end-date"
            label={t("endDate")}
            error={errors.end_date?.message}
            required
          >
            <CropDateInput
              id="timeline-end-date"
              aria-invalid={!!errors.end_date}
              aria-describedby={
                errors.end_date ? "timeline-end-date-error" : undefined
              }
              {...register("end_date", {
                required: t("required"),
                validate: (value) =>
                  value >= getValues("start_date") || t("endBeforeStart"),
              })}
            />
          </CropField>
        </div>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("planned", { dates: activity.planned_range_label })}
        </p>
        {errors.root?.message && (
          <CropNotice error>{errors.root.message}</CropNotice>
        )}
      </form>
    </TimelineDialogShell>
  );
}
