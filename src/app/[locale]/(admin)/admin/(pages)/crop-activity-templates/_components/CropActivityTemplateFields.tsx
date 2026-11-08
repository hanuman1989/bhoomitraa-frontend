"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import {
  maxTemplateOffset,
  type CropActivityTemplateFormValues,
} from "@/types/admin/cropActivityTemplate";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropActivityTemplateFields({
  form,
  choices,
  selections,
  initialCrop,
  editing,
  busy,
}: {
  form: UseFormReturn<CropActivityTemplateFormValues>;
  choices: TimelineChoices;
  selections: TimelineSelections;
  initialCrop: string;
  editing: boolean;
  busy: boolean;
}) {
  const t = useTranslations("cropActivityTemplates");
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
  const days = (value: string) =>
    (value.trim() !== "" &&
      Number.isInteger(Number(value)) &&
      Number(value) >= 0 &&
      Number(value) <= maxTemplateOffset) ||
    t("validation.days");
  return (
    <>
      <ComponentCard title={t("form.basic")} className={cardClass}>
        <div className="grid gap-5 md:grid-cols-2">
          <Controller
            name="crop_id"
            control={control}
            rules={{ required: t("validation.selection"), validate: validId }}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="crop"
                id="template-crop"
                label={t("fields.crop")}
                value={field.value}
                inputRef={field.ref}
                onBlur={field.onBlur}
                onChange={(value) => {
                  if (busy || editing || field.value === value) return;
                  field.onChange(value);
                  setValue("crop_variety_id", "", { shouldDirty: true });
                  setValue("crop_stage_id", "", { shouldDirty: true });
                  clearErrors(["crop_variety_id", "crop_stage_id"]);
                }}
                initialPage={choices.crop}
                initialSelection={selections.crop}
                eligible
                required
                disabled={busy || editing}
                error={errors.crop_id?.message}
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
                id="template-variety"
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
                emptyLabel={t("allVarieties")}
              />
            )}
          />
          <Controller
            name="category_id"
            control={control}
            rules={{ required: t("validation.selection"), validate: validId }}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="category"
                id="template-category"
                label={t("fields.category")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                initialPage={choices.category}
                initialSelection={selections.category}
                eligible
                required
                disabled={busy}
                error={errors.category_id?.message}
              />
            )}
          />
          <Controller
            name="crop_stage_id"
            control={control}
            rules={{ validate: (value) => !value || validId(value) }}
            render={({ field }) => (
              <TimelineRelationSelect
                key={`stage-${crop}`}
                kind="stage"
                id="template-stage"
                label={t("fields.stage")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                cropId={cropId}
                eligible
                initialPage={sameCrop ? choices.stage : undefined}
                initialSelection={sameCrop ? selections.stage : null}
                disabled={busy || !crop}
                error={errors.crop_stage_id?.message}
              />
            )}
          />
          <Controller
            name="season_id"
            control={control}
            rules={{ required: t("validation.selection"), validate: validId }}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="season"
                id="template-season"
                label={t("fields.season")}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                initialPage={choices.season}
                initialSelection={selections.season}
                eligible
                required
                disabled={busy}
                error={errors.season_id?.message}
              />
            )}
          />
          <Controller
            name="source_id"
            control={control}
            rules={{ required: t("validation.selection"), validate: validId }}
            render={({ field }) => (
              <TimelineRelationSelect
                kind="source"
                id="template-source"
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
        </div>
        <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
          {t(editing ? "form.cropLocked" : "form.sourceHelp")}
        </p>
      </ComponentCard>
      <ComponentCard title={t("form.scheduling")} className={cardClass}>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <FilterSelect
              {...register("schedule_type", {
                required: t("validation.schedule"),
                validate: (value) =>
                  value === "after_sowing" || t("validation.schedule"),
              })}
              id="template-schedule"
              label={t("fields.schedule")}
              className="h-11"
              aria-required="true"
              aria-invalid={!!errors.schedule_type}
              aria-describedby="template-schedule-error"
            >
              <option value="after_sowing">{t("schedule.after_sowing")}</option>
            </FilterSelect>
            <p id="template-schedule-error" role="alert" className={errorClass}>
              {errors.schedule_type?.message}
            </p>
          </div>
          <div>
            <Label htmlFor="template-start">
              {t("fields.start")}{" "}
              <span aria-hidden="true" className="text-error-600">
                *
              </span>
            </Label>
            <Input
              {...register("start_offset_days", {
                required: t("validation.days"),
                validate: days,
                onBlur: () => void trigger("end_offset_days"),
              })}
              id="template-start"
              type="number"
              min={0}
              max={maxTemplateOffset}
              step={1}
              placeholder={t("form.startPlaceholder")}
              aria-required="true"
              aria-invalid={!!errors.start_offset_days}
              aria-describedby="template-start-error"
              error={!!errors.start_offset_days}
            />
            <p id="template-start-error" role="alert" className={errorClass}>
              {errors.start_offset_days?.message}
            </p>
          </div>
          <div>
            <Label htmlFor="template-end">
              {t("fields.end")}{" "}
              <span aria-hidden="true" className="text-error-600">
                *
              </span>
            </Label>
            <Input
              {...register("end_offset_days", {
                required: t("validation.days"),
                validate: {
                  integer: days,
                  range: (value) =>
                    Number(value) >= Number(getValues("start_offset_days")) ||
                    t("validation.range"),
                },
              })}
              id="template-end"
              type="number"
              min={0}
              max={maxTemplateOffset}
              step={1}
              placeholder={t("form.endPlaceholder")}
              aria-required="true"
              aria-invalid={!!errors.end_offset_days}
              aria-describedby="template-end-error"
              error={!!errors.end_offset_days}
            />
            <p id="template-end-error" role="alert" className={errorClass}>
              {errors.end_offset_days?.message}
            </p>
          </div>
        </div>
      </ComponentCard>
    </>
  );
}
