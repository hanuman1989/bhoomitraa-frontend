"use client";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import type {
  ActivityMutationData,
  NoteInput,
  TimelineActivity,
} from "@/types/account/cropTimeline";
import type { ActionResult } from "@/types/api";
import {
  CropField,
  CropNotice,
  cropButton,
  cropControl,
  cropFieldErrors,
  cropPrimary,
} from "../../crops/_components/CropUi";
import CropDateInput from "../../crops/_components/CropDateInput";
import TimelineDialogShell from "./TimelineDialogShell";
import { IconTile } from "./CategoryIcon";

/** Today's date from the farmer's local calendar (no UTC conversion). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Add a plain-text note (up to 1000 characters) with its date. */
export default function AddNoteDialog({
  activity,
  onClose,
  onSave,
}: {
  activity: TimelineActivity;
  onClose: () => void;
  onSave: (values: NoteInput) => Promise<ActionResult<ActivityMutationData>>;
}) {
  const t = useTranslations("farmerCropTimeline.noteDialog");
  const tc = useTranslations("farmerCropTimeline.confirm");
  const today = localToday();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput>({ defaultValues: { note: "", note_date: today } });
  const length = useWatch({ control, name: "note" })?.length ?? 0;
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
            form="timeline-note-form"
            disabled={isSubmitting}
            className={cropPrimary}
          >
            {t("save")}
          </button>
        </>
      }
    >
      <form
        id="timeline-note-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          const result = await onSave({
            note: values.note.trim(),
            note_date: values.note_date,
          });
          if (!result.success) cropFieldErrors(result, setError);
        })}
      >
        <p className="border-success-200 bg-success-50 text-success-800 dark:border-success-800 dark:bg-success-950 dark:text-success-200 rounded-lg border px-3 py-2 text-sm">
          {t("linked", { activity: activity.title ?? "" })}
        </p>
        <CropField
          id="timeline-note"
          label={t("note")}
          error={errors.note?.message}
          required
        >
          <textarea
            id="timeline-note"
            rows={4}
            maxLength={1000}
            placeholder={t("placeholder")}
            aria-invalid={!!errors.note}
            aria-describedby={`timeline-note-count${errors.note ? " timeline-note-error" : ""}`}
            {...register("note", {
              validate: (value) =>
                !value.trim()
                  ? t("required")
                  : value.trim().length > 1000
                    ? t("tooLong")
                    : true,
            })}
            className={`${cropControl} !h-auto min-h-28 resize-y py-2.5`}
          />
          <p
            id="timeline-note-count"
            className="text-theme-xs mt-1 text-end text-gray-500 dark:text-gray-400"
          >
            {t("counter", { count: length })}
          </p>
        </CropField>
        <div className="max-w-60">
          <CropField
            id="timeline-note-date"
            label={t("date")}
            error={errors.note_date?.message}
            required
          >
            <CropDateInput
              id="timeline-note-date"
              max={today}
              aria-invalid={!!errors.note_date}
              aria-describedby={
                errors.note_date ? "timeline-note-date-error" : undefined
              }
              {...register("note_date", {
                required: t("dateRequired"),
                validate: (value) => value <= today || t("futureDate"),
              })}
            />
          </CropField>
        </div>
        {errors.root?.message && (
          <CropNotice error>{errors.root.message}</CropNotice>
        )}
      </form>
    </TimelineDialogShell>
  );
}
