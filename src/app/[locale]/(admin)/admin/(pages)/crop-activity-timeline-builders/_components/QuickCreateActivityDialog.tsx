"use client";

import { useState } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { saveCropActivityTemplate } from "@/actions/admin/cropActivityTemplates";
import Label from "@/components/admin/form/Label";
import {
  templateActivityTypes,
  type CropActivityTemplate,
  type CropActivityTemplateListItem,
  type TemplateActivityType,
  type TemplateSelectionOption,
} from "@/types/admin/cropActivityTemplate";
import type { TimelineState } from "@/types/admin/cropStageTimeline";
import type {
  ActivityTiming,
  ApplicabilityValues,
  BuilderConfig,
  BuilderOption,
  BuilderWorkspace,
  DayWindow,
  ScheduleValues,
  TranslationValues,
} from "./types";
import BuilderDialog, { buttonClass, errorTarget } from "./BuilderDialog";
import ApplicabilityFields, {
  applicabilityComplete,
} from "./ApplicabilityFields";
import ScheduleFields, {
  scheduleError,
  schedulePayload,
} from "./ScheduleFields";
import TranslationFields, {
  emptyTranslations,
  translationPayload,
  visibleLocales,
} from "./TranslationFields";
import { TimingNote } from "./ActivityCard";

interface CreateValues {
  crop_stage_id: string;
  category_id: string;
  activity_type: TemplateActivityType;
  app: ApplicabilityValues;
  schedule: ScheduleValues;
  translations: TranslationValues;
}

const selectClass =
  "shadow-theme-xs h-9 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

/** Existing per-type feature defaults (information/observation/task). */
function featureDefaults(type: TemplateActivityType) {
  return {
    allow_status_update: type === "task",
    allow_expenses: false,
    allow_labour: false,
    allow_notes: type !== "information",
    allow_attachments: false,
    allow_rescheduling: false,
  };
}

export default function QuickCreateActivityDialog({
  config,
  configSources,
  workspace,
  states,
  varieties,
  seasons,
  stageId,
  categoryId,
  locales,
  stageWindows,
  assess,
  formatWindow,
  onClose,
  onCreated,
  onNext,
}: {
  config: BuilderConfig;
  configSources: TemplateSelectionOption[];
  workspace: BuilderWorkspace;
  states: TimelineState[];
  varieties: BuilderOption[];
  seasons: BuilderOption[];
  stageId: number | null;
  categoryId: number | null;
  locales: string[];
  stageWindows: Map<number, DayWindow[]>;
  assess: (
    item: Pick<
      CropActivityTemplateListItem,
      | "crop_stage_id"
      | "schedule_type"
      | "schedule_basis"
      | "start_offset_days"
      | "end_offset_days"
    >,
  ) => ActivityTiming;
  formatWindow: (window: DayWindow, harvest?: boolean) => string;
  onClose: () => void;
  onCreated: (record: CropActivityTemplate) => void;
  onNext: (stageId: number, categoryId: number | null) => void;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const locale = useLocale();
  const [failure, setFailure] = useState("");
  const [duplicateWarned, setDuplicateWarned] = useState(false);
  // Pickers learn option labels when mounted; remount them after a reset so
  // Common Configuration selections show names instead of bare IDs.
  const [resetKey, setResetKey] = useState(0);
  const stages = [...workspace.stages].sort((a, b) => a.sequence - b.sequence);
  const defaults = (
    stage: number | null,
    category: number | null,
  ): CreateValues => ({
    crop_stage_id: stage === null ? "" : String(stage),
    category_id: category === null ? "" : String(category),
    activity_type: "task",
    // Deep copy: editing this activity never changes the common defaults.
    app: structuredClone(config.app),
    schedule: {
      mode: stage !== null && stageWindows.has(stage) ? "stage" : "fixed",
      schedule_type: "after_sowing",
      start: "",
      end: "",
    },
    translations: emptyTranslations(),
  });
  const form = useForm<CreateValues>({
    defaultValues: defaults(stageId, categoryId),
    mode: "onTouched",
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = form;
  const stageValue = useWatch({ control, name: "crop_stage_id" });
  const scheduleValue = useWatch({ control, name: "schedule" });
  const currentStage = stageValue ? Number(stageValue) : null;
  const nextStage =
    currentStage === null
      ? stages[0]
      : stages[stages.findIndex(({ id }) => id === currentStage) + 1];

  async function save(values: CreateValues, then: "close" | "more" | "next") {
    setFailure("");
    const stage = values.crop_stage_id ? Number(values.crop_stage_id) : null;
    const title = values.translations[locale]?.title.trim().toLowerCase();
    const duplicate = workspace.templates.some(
      (item) =>
        item.crop_stage_id === stage &&
        String(item.category_id) === values.category_id &&
        !!title &&
        item.title?.trim().toLowerCase() === title,
    );
    if (duplicate && !duplicateWarned) {
      setDuplicateWarned(true);
      setFailure(t("create.duplicateWarning"));
      return;
    }
    const { app } = values;
    const result = await saveCropActivityTemplate(null, {
      crop_id: config.crop.id,
      category_id: Number(values.category_id),
      crop_stage_id: stage,
      variety_scope: app.variety_scope,
      crop_variety_ids: app.variety_scope === "all" ? [] : app.crop_variety_ids,
      season_scope: app.season_scope,
      season_ids: app.season_scope === "all" ? [] : app.season_ids,
      knowledge_source_ids: app.knowledge_source_ids,
      region_scope: app.region_scope,
      region_ids: app.region_scope === "all" ? [] : app.region_ids,
      ...schedulePayload(values.schedule),
      activity_type: values.activity_type,
      ...featureDefaults(values.activity_type),
      smart_actions: [],
      priority: "medium",
      translations: translationPayload(values.translations),
    });
    if (!result.success || !result.data) {
      const general: string[] = [];
      for (const [key, messages] of Object.entries(result.errors ?? {})) {
        const target = errorTarget(key);
        if (
          [
            "app",
            "schedule",
            "category_id",
            "crop_stage_id",
            "activity_type",
          ].includes(target) ||
          target.startsWith("translations.")
        )
          setError(target as Path<CreateValues>, {
            type: "server",
            message: messages[0],
          });
        else general.push(messages[0]);
      }
      const message = general[0] ?? result.message ?? t("feedback.saveFailed");
      setFailure(message);
      toast.error(message);
      return;
    }
    onCreated(result.data);
    toast.success(result.message || t("feedback.saved"));
    setDuplicateWarned(false);
    if (then === "close") onClose();
    else if (then === "more")
      reset(defaults(stage, Number(values.category_id)));
    else if (nextStage) onNext(nextStage.id, Number(values.category_id));
  }
  const submit = (then: "close" | "more" | "next") =>
    handleSubmit((values) => save(values, then));

  return (
    <BuilderDialog
      title={t("create.title")}
      description={t("create.description")}
      onClose={onClose}
      onSubmit={submit("close")}
      submitLabel={t("create.save")}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure}
      wide
      extraActions={
        <>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void submit("more")()}
            className={buttonClass}
          >
            {t("create.saveMore")}
          </button>
          <button
            type="button"
            disabled={isSubmitting || !nextStage}
            onClick={() => void submit("next")()}
            className={buttonClass}
          >
            {t("create.saveNext")}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="builder-create-stage">
            {tt("fields.stageOptional")}
          </Label>
          <select
            id="builder-create-stage"
            {...register("crop_stage_id", {
              onChange: (event) => {
                const next = event.target.value
                  ? Number(event.target.value)
                  : null;
                // Stage-based timing needs a stage with timing coverage.
                if (
                  scheduleValue.mode === "stage" &&
                  (next === null || !stageWindows.has(next))
                )
                  setValue("schedule", { ...scheduleValue, mode: "fixed" });
              },
            })}
            className={selectClass}
          >
            <option value="">{t("noStage")}</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.sequence}. {stage.name ?? stage.code}
              </option>
            ))}
          </select>
          <p role="alert" className={errorClass}>
            {errors.crop_stage_id?.message}
          </p>
        </div>
        <div>
          <Label htmlFor="builder-create-category">
            {tt("fields.category")}{" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </Label>
          <select
            id="builder-create-category"
            {...register("category_id", { required: t("validation.category") })}
            aria-invalid={!!errors.category_id}
            className={selectClass}
          >
            <option value="">{t("selectCategory")}</option>
            {workspace.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name ?? t("recordId", { id: category.id })}
              </option>
            ))}
          </select>
          <p role="alert" className={errorClass}>
            {errors.category_id?.message}
          </p>
        </div>
        <div>
          <Label htmlFor="builder-create-type">
            {tt("fields.activityType")}
          </Label>
          <select
            id="builder-create-type"
            {...register("activity_type")}
            className={selectClass}
          >
            {templateActivityTypes.map((type) => (
              <option key={type} value={type}>
                {tt(`activityTypes.${type}`)}
              </option>
            ))}
          </select>
          <p role="alert" className={errorClass}>
            {errors.activity_type?.message}
          </p>
        </div>
      </div>
      <details className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <summary className="text-brand-600 dark:text-brand-400 cursor-pointer text-sm font-semibold">
          {t("create.editApplicability")}
        </summary>
        <div className="mt-4">
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
                  idPrefix="builder-create"
                  value={field.value}
                  onChange={field.onChange}
                  cropId={config.crop.id}
                  varieties={varieties}
                  seasons={seasons}
                  sources={configSources}
                  states={states}
                  disabled={isSubmitting}
                  error={fieldState.error?.message}
                />
                <button
                  type="button"
                  onClick={() => {
                    field.onChange(structuredClone(config.app));
                    setResetKey((value) => value + 1);
                  }}
                  className={`mt-3 ${buttonClass}`}
                >
                  {t("resetToCommon")}
                </button>
              </>
            )}
          />
        </div>
      </details>
      {errors.app?.message && (
        <p role="alert" className={errorClass}>
          {errors.app.message}
        </p>
      )}
      <Controller
        name="schedule"
        control={control}
        rules={{
          validate: (value) => {
            const problem = scheduleError(value, currentStage);
            return !problem || t(`validation.schedule.${problem}`);
          },
        }}
        render={({ field, fieldState }) => (
          <ScheduleFields
            idPrefix="builder-create"
            value={field.value}
            onChange={field.onChange}
            hasStage={currentStage !== null}
            stageHasTiming={
              currentStage !== null && stageWindows.has(currentStage)
            }
            disabled={isSubmitting}
            error={fieldState.error?.message}
            preview={
              !scheduleError(field.value, currentStage) && (
                <TimingNote
                  timing={assess({
                    crop_stage_id: currentStage,
                    ...schedulePayload(field.value),
                  })}
                  formatWindow={formatWindow}
                />
              )
            }
          />
        )}
      />
      <TranslationFields form={form} locales={visibleLocales(locales)} />
    </BuilderDialog>
  );
}
