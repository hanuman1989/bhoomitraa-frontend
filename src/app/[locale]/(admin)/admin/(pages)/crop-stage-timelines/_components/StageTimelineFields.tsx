"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import CropActivityTemplateMultiSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-activity-templates/_components/CropActivityTemplateMultiSelect";
import { applicabilityScopes } from "@/types/admin/cropActivityTemplate";
import type {
  StageTimelineFormValues,
  StageTimelineMultiSelections,
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import TimelineRelationSelect from "./TimelineRelationSelect";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
const distinct = (ids: number[]) => new Set(ids).size === ids.length;
// Remount a multi-select only when its server-provided chip labels change.
const ids = (options: { id: number }[]) =>
  options.map((option) => option.id).join(",");
export default function StageTimelineFields({
  form,
  choices,
  selections,
  multiSelections = { varieties: [], seasons: [], knowledgeSources: [] },
  initialCrop,
  busy,
}: {
  form: UseFormReturn<StageTimelineFormValues>;
  choices: TimelineChoices;
  selections: TimelineSelections;
  multiSelections?: StageTimelineMultiSelections;
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
  const varietyScope = useWatch({ control, name: "variety_scope" });
  const seasonScope = useWatch({ control, name: "season_scope" });
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
                  // Varieties and stages belong to a crop; seasons do not.
                  setValue("crop_stage_id", "", { shouldDirty: true });
                  setValue("crop_variety_ids", [], { shouldDirty: true });
                  clearErrors(["crop_stage_id", "crop_variety_ids"]);
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
        </div>
        <div className="space-y-3">
          <Controller
            name="variety_scope"
            control={control}
            rules={{ required: t("validation.applicability") }}
            render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("fields.varietyApplicability")}{" "}
                  <span aria-hidden="true" className="text-error-600">
                    *
                  </span>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {applicabilityScopes.map((scope) => (
                    <label
                      key={scope}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                        field.value === scope
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <input
                        ref={field.ref}
                        name={field.name}
                        type="radio"
                        value={scope}
                        checked={field.value === scope}
                        onBlur={field.onBlur}
                        onChange={() => {
                          field.onChange(scope);
                          if (scope === "all") {
                            setValue("crop_variety_ids", [], {
                              shouldDirty: true,
                            });
                            clearErrors("crop_variety_ids");
                          }
                        }}
                        aria-describedby="timeline-variety-scope-error"
                        className="accent-brand-600 mt-0.5 size-4 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {t(`applicability.${scope}Varieties`)}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {t(`applicability.${scope}VarietiesHelp`)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p
                  id="timeline-variety-scope-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.variety_scope?.message}
                </p>
              </fieldset>
            )}
          />
          {varietyScope === "specific" && (
            <Controller
              name="crop_variety_ids"
              control={control}
              rules={{
                validate: (ids) =>
                  getValues("variety_scope") === "all" ||
                  (ids.length > 0 && distinct(ids)) ||
                  t("validation.varieties"),
              }}
              render={({ field }) => (
                <CropActivityTemplateMultiSelect
                  key={`variety-${crop}-${ids(multiSelections.varieties)}`}
                  kind="variety"
                  id="timeline-varieties"
                  label={t("fields.varieties")}
                  placeholder={t("placeholders.varieties")}
                  value={field.value}
                  onChange={field.onChange}
                  cropId={cropId}
                  initialPage={sameCrop ? choices.variety : undefined}
                  initialSelected={sameCrop ? multiSelections.varieties : []}
                  required
                  disabled={busy || !crop}
                  error={errors.crop_variety_ids?.message}
                  inputRef={field.ref}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </div>
        <div className="space-y-3">
          <Controller
            name="season_scope"
            control={control}
            rules={{ required: t("validation.applicability") }}
            render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("fields.seasonApplicability")}{" "}
                  <span aria-hidden="true" className="text-error-600">
                    *
                  </span>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {applicabilityScopes.map((scope) => (
                    <label
                      key={scope}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                        field.value === scope
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <input
                        ref={field.ref}
                        name={field.name}
                        type="radio"
                        value={scope}
                        checked={field.value === scope}
                        onBlur={field.onBlur}
                        onChange={() => {
                          field.onChange(scope);
                          if (scope === "all") {
                            setValue("season_ids", [], { shouldDirty: true });
                            clearErrors("season_ids");
                          }
                        }}
                        aria-describedby="timeline-season-scope-error"
                        className="accent-brand-600 mt-0.5 size-4 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {t(`applicability.${scope}Seasons`)}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {t(`applicability.${scope}SeasonsHelp`)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p
                  id="timeline-season-scope-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.season_scope?.message}
                </p>
              </fieldset>
            )}
          />
          {seasonScope === "specific" && (
            <Controller
              name="season_ids"
              control={control}
              rules={{
                validate: (ids) =>
                  getValues("season_scope") === "all" ||
                  (ids.length > 0 && distinct(ids)) ||
                  t("validation.seasons"),
              }}
              render={({ field }) => (
                <CropActivityTemplateMultiSelect
                  key={`season-${ids(multiSelections.seasons)}`}
                  kind="season"
                  id="timeline-seasons"
                  label={t("fields.seasons")}
                  placeholder={t("placeholders.seasons")}
                  value={field.value}
                  onChange={field.onChange}
                  initialPage={choices.season}
                  initialSelected={multiSelections.seasons}
                  required
                  disabled={busy}
                  error={errors.season_ids?.message}
                  inputRef={field.ref}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
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
        <div>
          <Controller
            name="knowledge_source_ids"
            control={control}
            rules={{
              validate: (ids) => distinct(ids) || t("validation.selection"),
            }}
            render={({ field }) => (
              <CropActivityTemplateMultiSelect
                key={`source-${ids(multiSelections.knowledgeSources)}`}
                kind="source"
                id="timeline-knowledge-sources"
                label={t("fields.knowledgeSources")}
                placeholder={t("placeholders.knowledgeSources")}
                value={field.value}
                onChange={field.onChange}
                initialPage={choices.source}
                initialSelected={multiSelections.knowledgeSources}
                disabled={busy}
                error={errors.knowledge_source_ids?.message}
                inputRef={field.ref}
                onBlur={field.onBlur}
              />
            )}
          />
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            {t("form.sourceHelp")}
          </p>
        </div>
      </ComponentCard>
    </div>
  );
}
