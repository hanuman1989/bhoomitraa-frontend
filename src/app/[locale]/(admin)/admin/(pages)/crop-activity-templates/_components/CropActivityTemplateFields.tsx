"use client";

import type { ChangeEvent, ComponentType, SVGProps } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Switch from "@/components/admin/form/switch/Switch";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import CropActivityTemplateMultiSelect from "./CropActivityTemplateMultiSelect";
import {
  applicabilityScopes,
  maxTemplateOffset,
  templateActivityTypes,
  templateScheduleBases,
  templateScheduleTypes,
  templateSmartActions,
  type CropActivityTemplateFormValues,
  type TemplateActivityType,
  type TemplateSelectionOption,
  type TemplateSmartAction,
} from "@/types/admin/cropActivityTemplate";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import {
  AgricultureIcon,
  BotIcon,
  CalenderIcon,
  ChatIcon,
  ClipboardCheckIcon,
  DollarLineIcon,
  FertilizerIcon,
  FileIcon,
  GroupIcon,
  HarvestingIcon,
  LeafIcon,
  SeedIcon,
  WeatherIcon,
} from "@/icons";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
const featureNames = [
  "allow_status_update",
  "allow_expenses",
  "allow_labour",
  "allow_notes",
  "allow_attachments",
  "allow_rescheduling",
] as const;
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const smartActionGroups: {
  name: string;
  Icon: IconComponent;
  actions: TemplateSmartAction[];
}[] = [
  {
    name: "crop",
    Icon: LeafIcon,
    actions: ["crop_details", "crop_planning", "crop_completion"],
  },
  {
    name: "inputs",
    Icon: SeedIcon,
    actions: [
      "soil_assessment",
      "soil_test",
      "seed_calculator",
      "seed_record",
      "sowing_record",
    ],
  },
  {
    name: "care",
    Icon: FertilizerIcon,
    actions: [
      "fertilizer_recommendation",
      "fertilizer_record",
      "irrigation_recommendation",
      "irrigation_record",
      "water_management",
    ],
  },
  {
    name: "monitoring",
    Icon: WeatherIcon,
    actions: [
      "weather_forecast",
      "weather_alerts",
      "crop_observation",
      "growth_stage_tracking",
      "pest_monitoring",
      "disease_monitoring",
    ],
  },
  {
    name: "expert",
    Icon: BotIcon,
    actions: [
      "ai_crop_doctor",
      "ask_agricultural_expert",
      "knowledge_reference",
    ],
  },
  {
    name: "harvest",
    Icon: HarvestingIcon,
    actions: [
      "yield_estimation",
      "actual_yield_record",
      "harvest_record",
      "produce_quality",
      "storage_record",
      "transport_record",
    ],
  },
  {
    name: "operations",
    Icon: AgricultureIcon,
    actions: [
      "market_prices",
      "produce_sale",
      "income_estimation",
      "financial_summary",
      "expense_summary",
      "crop_profitability",
      "machinery_usage",
      "labour_assignment",
    ],
  },
];

function FeatureToggle({
  label,
  Icon,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  Icon: IconComponent;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        checked
          ? "border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950"
          : "border-gray-200 dark:border-gray-700"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {/* Icon and label lead the row; order-first keeps every switch aligned
          at the end regardless of label length, and the whole row toggles. */}
      <Switch
        label={
          <span className="order-first flex min-w-0 flex-1 items-center gap-3">
            <Icon
              aria-hidden="true"
              className="text-brand-600 dark:text-brand-400 size-5 shrink-0"
            />
            <span className="min-w-0 break-words">{label}</span>
          </span>
        }
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

export default function CropActivityTemplateFields({
  form,
  choices,
  selections,
  multiSelections,
  initialCrop,
  editing,
  busy,
}: {
  form: UseFormReturn<CropActivityTemplateFormValues>;
  choices: TimelineChoices;
  selections: TimelineSelections;
  multiSelections: {
    varieties: TemplateSelectionOption[];
    seasons: TemplateSelectionOption[];
    knowledgeSources: TemplateSelectionOption[];
  };
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
  const scheduleType = useWatch({ control, name: "schedule_type" });
  const scheduleBasis = useWatch({ control, name: "schedule_basis" });
  const activityType = useWatch({ control, name: "activity_type" });
  const varietyScope = useWatch({ control, name: "variety_scope" });
  const seasonScope = useWatch({ control, name: "season_scope" });
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
  const featureDisabled = activityType === "information";
  const statusDisabled = featureDisabled || activityType === "observation";

  function applyActivityType(type: TemplateActivityType) {
    if (type === "information") {
      for (const feature of featureNames) {
        setValue(feature, false, { shouldDirty: true, shouldValidate: true });
      }
    } else if (type === "observation") {
      setValue("allow_status_update", false, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("allow_notes", true, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setValue("allow_status_update", true, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue("allow_expenses", false, { shouldDirty: true });
      setValue("allow_labour", false, { shouldDirty: true });
      setValue("allow_notes", true, { shouldDirty: true });
      setValue("allow_attachments", false, { shouldDirty: true });
      setValue("allow_rescheduling", false, { shouldDirty: true });
    }
    clearErrors(featureNames);
  }

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
                  setValue("crop_variety_ids", [], { shouldDirty: true });
                  setValue("crop_stage_id", "", { shouldDirty: true });
                  clearErrors(["crop_variety_ids", "crop_stage_id"]);
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
            rules={{
              required:
                scheduleBasis === "growth_stage"
                  ? t("validation.growthStageRequired")
                  : false,
              validate: (value) => !value || validId(value),
            }}
            render={({ field }) => (
              <TimelineRelationSelect
                key={`stage-${crop}`}
                kind="stage"
                id="template-stage"
                label={t(
                  scheduleBasis === "growth_stage"
                    ? "fields.stage"
                    : "fields.stageOptional",
                )}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                cropId={cropId}
                eligible
                initialPage={sameCrop ? choices.stage : undefined}
                initialSelection={sameCrop ? selections.stage : null}
                disabled={busy || !crop}
                required={scheduleBasis === "growth_stage"}
                error={errors.crop_stage_id?.message}
              />
            )}
          />
          <Controller
            name="activity_type"
            control={control}
            rules={{
              required: t("validation.activityType"),
              validate: (value) =>
                templateActivityTypes.includes(value) ||
                t("validation.activityType"),
            }}
            render={({ field }) => (
              <div>
                <FilterSelect
                  id="template-activity-type"
                  label={t("fields.activityType")}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  className="h-9"
                  disabled={busy}
                  aria-required="true"
                  aria-invalid={!!errors.activity_type}
                  aria-describedby="template-activity-type-error"
                  onBlur={field.onBlur}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    const next =
                      templateActivityTypes.find(
                        (type) => type === event.target.value,
                      ) ?? "task";
                    field.onChange(next);
                    applyActivityType(next);
                  }}
                >
                  {templateActivityTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`activityTypes.${type}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p
                  id="template-activity-type-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.activity_type?.message}
                </p>
              </div>
            )}
          />
          <div>
            <Controller
              name="variety_scope"
              control={control}
              rules={{ required: t("validation.scope") }}
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("fields.varietyApplicability")}{" "}
                    <span aria-hidden="true" className="text-error-600">
                      *
                    </span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
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
                                shouldValidate: true,
                              });
                              clearErrors("crop_variety_ids");
                            } else {
                              void trigger("crop_variety_ids");
                            }
                          }}
                          aria-describedby="template-variety-scope-error"
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
                    id="template-variety-scope-error"
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
                    ids.length > 0 ||
                    t("validation.varietiesRequired"),
                }}
                render={({ field }) => (
                  <CropActivityTemplateMultiSelect
                    key={`variety-${crop}`}
                    kind="variety"
                    id="template-varieties"
                    label={t("fields.variety")}
                    placeholder={t("placeholders.varieties")}
                    value={field.value}
                    onChange={field.onChange}
                    cropId={cropId}
                    initialPage={sameCrop ? choices.variety : undefined}
                    initialSelected={multiSelections.varieties}
                    disabled={busy || !crop}
                    error={errors.crop_variety_ids?.message}
                    inputRef={field.ref}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}
          </div>
          <div>
            <Controller
              name="season_scope"
              control={control}
              rules={{ required: t("validation.scope") }}
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("fields.seasonApplicability")}{" "}
                    <span aria-hidden="true" className="text-error-600">
                      *
                    </span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
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
                              setValue("season_ids", [], {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              clearErrors("season_ids");
                            } else {
                              void trigger("season_ids");
                            }
                          }}
                          aria-describedby="template-season-scope-error"
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
                    id="template-season-scope-error"
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
                    ids.length > 0 ||
                    t("validation.seasonsRequired"),
                }}
                render={({ field }) => (
                  <CropActivityTemplateMultiSelect
                    kind="season"
                    id="template-seasons"
                    label={t("fields.season")}
                    placeholder={t("placeholders.seasons")}
                    value={field.value}
                    onChange={field.onChange}
                    initialPage={choices.season}
                    initialSelected={multiSelections.seasons}
                    disabled={busy}
                    error={errors.season_ids?.message}
                    inputRef={field.ref}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}
          </div>
          <div className="md:col-span-2">
            <Controller
              name="knowledge_source_ids"
              control={control}
              render={({ field }) => (
                <CropActivityTemplateMultiSelect
                  kind="source"
                  id="template-knowledge-sources"
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
              {t("form.knowledgeSourcesHelp")}
            </p>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard title={t("form.scheduling")} className={cardClass}>
        <div className="grid gap-5 md:grid-cols-2">
          <Controller
            name="schedule_type"
            control={control}
            rules={{
              required: t("validation.schedule"),
              validate: (value) =>
                templateScheduleTypes.includes(value) ||
                t("validation.schedule"),
            }}
            render={({ field }) => (
              <div>
                <FilterSelect
                  id="template-schedule"
                  label={t("fields.schedule")}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  className="h-9"
                  disabled={busy}
                  aria-required="true"
                  aria-invalid={!!errors.schedule_type}
                  aria-describedby="template-schedule-error"
                  onBlur={field.onBlur}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    const next =
                      templateScheduleTypes.find(
                        (schedule) => schedule === event.target.value,
                      ) ?? "after_sowing";
                    field.onChange(next);
                    if (
                      scheduleBasis === "growth_stage" &&
                      next !== "after_sowing"
                    ) {
                      setValue("schedule_basis", "fixed_offsets", {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("start_offset_days", "0", {
                        shouldDirty: true,
                      });
                      setValue("end_offset_days", "0", {
                        shouldDirty: true,
                      });
                      clearErrors([
                        "schedule_basis",
                        "start_offset_days",
                        "end_offset_days",
                      ]);
                    }
                    void trigger(["schedule_type", "schedule_basis"]);
                  }}
                >
                  {templateScheduleTypes.map((schedule) => (
                    <option key={schedule} value={schedule}>
                      {t(`schedule.${schedule}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p
                  id="template-schedule-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.schedule_type?.message}
                </p>
              </div>
            )}
          />
          <Controller
            name="schedule_basis"
            control={control}
            rules={{
              required: t("validation.scheduleBasis"),
              validate: (value) =>
                templateScheduleBases.includes(value) ||
                t("validation.scheduleBasis"),
            }}
            render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("fields.scheduleBasis")}{" "}
                  <span aria-hidden="true" className="text-error-600">
                    *
                  </span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {templateScheduleBases.map((basis) => {
                    const disabled =
                      busy ||
                      (basis === "growth_stage" &&
                        scheduleType !== "after_sowing");
                    return (
                      <label
                        key={basis}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                          field.value === basis
                            ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                            : "border-gray-200 dark:border-gray-700"
                        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <input
                          ref={field.ref}
                          name={field.name}
                          type="radio"
                          value={basis}
                          checked={field.value === basis}
                          disabled={disabled}
                          onBlur={field.onBlur}
                          onChange={() => {
                            field.onChange(basis);
                            if (basis === "growth_stage") {
                              setValue("start_offset_days", "", {
                                shouldDirty: true,
                              });
                              setValue("end_offset_days", "", {
                                shouldDirty: true,
                              });
                              clearErrors([
                                "start_offset_days",
                                "end_offset_days",
                              ]);
                              void trigger("crop_stage_id");
                            } else {
                              setValue("start_offset_days", "0", {
                                shouldDirty: true,
                              });
                              setValue("end_offset_days", "0", {
                                shouldDirty: true,
                              });
                              clearErrors("crop_stage_id");
                              void trigger([
                                "start_offset_days",
                                "end_offset_days",
                              ]);
                            }
                          }}
                          aria-describedby="template-schedule-basis-error"
                          className="accent-brand-600 mt-0.5 size-4 shrink-0"
                        />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {t(`scheduleBases.${basis}`)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p
                  id="template-schedule-basis-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.schedule_basis?.message}
                </p>
              </fieldset>
            )}
          />
          {scheduleBasis === "fixed_offsets" ? (
            <>
              <div>
                <Label htmlFor="template-start">
                  {t("fields.start", {
                    schedule: t(`schedule.${scheduleType}`),
                  })}{" "}
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
                  disabled={busy}
                  placeholder={t("form.startPlaceholder")}
                  aria-required="true"
                  aria-invalid={!!errors.start_offset_days}
                  aria-describedby="template-start-error"
                  error={!!errors.start_offset_days}
                />
                <p
                  id="template-start-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.start_offset_days?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="template-end">
                  {t("fields.end", {
                    schedule: t(`schedule.${scheduleType}`),
                  })}{" "}
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
                        Number(value) >=
                          Number(getValues("start_offset_days")) ||
                        t("validation.range"),
                    },
                  })}
                  id="template-end"
                  type="number"
                  min={0}
                  max={maxTemplateOffset}
                  step={1}
                  disabled={busy}
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
            </>
          ) : (
            <p className="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 rounded-lg p-3 text-sm md:col-span-2">
              {t("form.growthStageScheduleHelp")}
            </p>
          )}
        </div>
      </ComponentCard>

      <ComponentCard
        title={t("form.activityConfiguration")}
        desc={t("form.activityConfigurationHelp")}
        className={cardClass}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Controller
            name="allow_status_update"
            control={control}
            render={({ field }) => (
              <FeatureToggle
                label={t("features.statusUpdate")}
                Icon={ClipboardCheckIcon}
                checked={field.value}
                disabled={busy || statusDisabled}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="allow_expenses"
            control={control}
            render={({ field }) => (
              <FeatureToggle
                label={t("features.expenses")}
                Icon={DollarLineIcon}
                checked={field.value}
                disabled={busy || featureDisabled}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="allow_labour"
            control={control}
            render={({ field }) => (
              <FeatureToggle
                label={t("features.labour")}
                Icon={GroupIcon}
                checked={field.value}
                disabled={busy || featureDisabled}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="allow_notes"
            control={control}
            render={({ field }) => (
              <FeatureToggle
                label={t("features.notes")}
                Icon={ChatIcon}
                checked={field.value}
                disabled={busy || featureDisabled}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="allow_attachments"
            control={control}
            render={({ field }) => (
              <FeatureToggle
                label={t("features.attachments")}
                Icon={FileIcon}
                checked={field.value}
                disabled={busy || featureDisabled}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="allow_rescheduling"
            control={control}
            render={({ field }) => (
              <FeatureToggle
                label={t("features.rescheduling")}
                Icon={CalenderIcon}
                checked={field.value}
                disabled={busy || featureDisabled}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </ComponentCard>

      <ComponentCard
        title={t("form.smartActions")}
        desc={t("form.smartActionsHelp")}
        className={cardClass}
      >
        <Controller
          name="smart_actions"
          control={control}
          rules={{
            validate: (actions) =>
              actions.every((action) =>
                templateSmartActions.some((supported) => supported === action),
              ) || t("validation.smartActions"),
          }}
          render={({ field }) => (
            <div className="space-y-3">
              {smartActionGroups.map(({ name, Icon, actions }) => (
                <details
                  key={name}
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    <Icon
                      aria-hidden="true"
                      className="text-brand-600 dark:text-brand-400 size-5"
                    />
                    {t(`smartActions.groups.${name}`)}
                    <span className="ms-auto text-xs font-normal text-gray-500">
                      {t("smartActions.selectedCount", {
                        count: actions.filter((action) =>
                          field.value.includes(action),
                        ).length,
                      })}
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {actions.map((action) => {
                      const checked = field.value.includes(action);
                      return (
                        <label
                          key={action}
                          className={`focus-within:ring-brand-500/30 flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm focus-within:ring-2 ${
                            checked
                              ? "border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950"
                              : "border-gray-200 dark:border-gray-700"
                          } ${busy ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={(event) =>
                              field.onChange(
                                event.target.checked
                                  ? [...field.value, action]
                                  : field.value.filter(
                                      (selected) => selected !== action,
                                    ),
                              )
                            }
                            className="accent-brand-600 size-4 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            {t(`smartActions.items.${action}`)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              ))}
              <p
                role="alert"
                className="text-error-600 dark:text-error-400 text-xs"
              >
                {errors.smart_actions?.message}
              </p>
            </div>
          )}
        />
      </ComponentCard>
    </>
  );
}
