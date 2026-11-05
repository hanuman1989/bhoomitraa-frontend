"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type {
  StageTimelineFormValues,
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import TimelineRelationSelect from "./TimelineRelationSelect";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function StageTimelineFields({
  form,
  choices,
  selections,
  initialCrop,
  busy,
}: {
  form: UseFormReturn<StageTimelineFormValues>;
  choices: TimelineChoices;
  selections: TimelineSelections;
  initialCrop: string;
  busy: boolean;
}) {
  const t = useTranslations("stageTimelines");
  const {
    control,
    register,
    setValue,
    getValues,
    clearErrors,
    trigger,
    formState: { errors },
  } = form;
  const crop = useWatch({ control, name: "crop_id" });
  const cropId = crop ? Number(crop) : null;
  const sameCrop = crop === initialCrop;
  const validId = (value: string) =>
    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
    t("validation.selection");
  return (
    <div className="min-w-0 space-y-5">
      <ComponentCard title={t("form.basic")} className={cardClass}>
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="crop_id"
            control={control}
            rules={{ required: t("validation.crop"), validate: validId }}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="crop"
                id="timeline-crop"
                label={t("fields.crop")}
                value={field.value}
                onBlur={field.onBlur}
                inputRef={field.ref}
                onChange={(value) => {
                  if (busy || field.value === value) return;
                  field.onChange(value);
                  setValue("crop_stage_id", "", { shouldDirty: true });
                  setValue("crop_variety_id", "", { shouldDirty: true });
                  clearErrors(["crop_stage_id", "crop_variety_id"]);
                }}
                initialPage={choices.crop}
                initialSelection={selections.crop}
                eligible
                required
                disabled={busy}
                error={errors.crop_id?.message}
              />
            )}
          />
          <Controller
            name="crop_stage_id"
            control={control}
            rules={{ required: t("validation.stage"), validate: validId }}
            render={({ field }) => (
              <TimelineRelationSelect
                key={`stage-${crop}`}
                kind="stage"
                id="timeline-stage"
                label={t("fields.stage")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                cropId={cropId}
                eligible
                initialPage={sameCrop ? choices.stage : undefined}
                initialSelection={sameCrop ? selections.stage : null}
                required
                disabled={busy || !crop}
                error={errors.crop_stage_id?.message}
              />
            )}
          />
          <Controller
            name="crop_variety_id"
            control={control}
            rules={{ validate: (value) => !value || validId(value) }}
            render={({ field }) => (
              <TimelineRelationSelect
                key={`variety-${crop}`}
                kind="variety"
                id="timeline-variety"
                label={t("fields.variety")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                cropId={cropId}
                eligible
                initialPage={sameCrop ? choices.variety : undefined}
                initialSelection={sameCrop ? selections.variety : null}
                disabled={busy || !crop}
                error={errors.crop_variety_id?.message}
              />
            )}
          />
          <Controller
            name="season_id"
            control={control}
            rules={{ validate: (value) => !value || validId(value) }}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="season"
                id="timeline-season"
                label={t("fields.season")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                eligible
                initialPage={choices.season}
                initialSelection={selections.season}
                disabled={busy}
                error={errors.season_id?.message}
              />
            )}
          />
        </div>
      </ComponentCard>
      <ComponentCard title={t("form.details")} className={cardClass}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="timeline-min">
              {t("form.min")}{" "}
              <span aria-hidden="true" className="text-error-600">
                *
              </span>
            </Label>
            <Input
              {...register("days_after_sowing_min", {
                required: t("validation.days"),
                validate: (value) =>
                  (Number.isSafeInteger(Number(value)) &&
                    Number(value) >= 0 &&
                    Number(value) <= 4294967295) ||
                  t("validation.days"),
                onBlur: () => {
                  void trigger("days_after_sowing_max");
                },
              })}
              id="timeline-min"
              type="number"
              min={0}
              max={4294967295}
              step={1}
              aria-required="true"
              aria-invalid={!!errors.days_after_sowing_min}
              aria-describedby="timeline-min-error"
              error={!!errors.days_after_sowing_min}
            />
            <p id="timeline-min-error" role="alert" className={errorClass}>
              {errors.days_after_sowing_min?.message}
            </p>
          </div>
          <div>
            <Label htmlFor="timeline-max">
              {t("form.max")}{" "}
              <span aria-hidden="true" className="text-error-600">
                *
              </span>
            </Label>
            <Input
              {...register("days_after_sowing_max", {
                required: t("validation.days"),
                validate: {
                  integer: (value) =>
                    (Number.isSafeInteger(Number(value)) &&
                      Number(value) >= 0 &&
                      Number(value) <= 4294967295) ||
                    t("validation.days"),
                  range: (value) =>
                    Number(value) >=
                      Number(getValues("days_after_sowing_min")) ||
                    t("validation.range"),
                },
              })}
              id="timeline-max"
              type="number"
              min={0}
              max={4294967295}
              step={1}
              aria-required="true"
              aria-invalid={!!errors.days_after_sowing_max}
              aria-describedby="timeline-max-error"
              error={!!errors.days_after_sowing_max}
            />
            <p id="timeline-max-error" role="alert" className={errorClass}>
              {errors.days_after_sowing_max?.message}
            </p>
          </div>
        </div>
        <Controller
          name="source_id"
          control={control}
          rules={{ required: t("validation.source"), validate: validId }}
          render={({ field }) => (
            <TimelineRelationSelect
              kind="source"
              id="timeline-source"
              label={t("fields.source")}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              initialPage={choices.source}
              initialSelection={selections.source}
              required
              disabled={busy}
              error={errors.source_id?.message}
            />
          )}
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("form.sourceHelp")}
        </p>
      </ComponentCard>
    </div>
  );
}
