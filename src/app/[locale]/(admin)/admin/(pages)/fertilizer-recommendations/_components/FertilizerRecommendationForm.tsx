"use client";

import { useRef, useState, useTransition } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { saveFertilizerRecommendation } from "@/actions/admin/fertilizerRecommendations";
import ComponentCard from "@/components/admin/common/ComponentCard";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import TextArea from "@/components/admin/form/input/TextArea";
import Label from "@/components/admin/form/Label";
import Switch from "@/components/admin/form/switch/Switch";
import RegionScopeSelector, {
  validDistrictSelection,
} from "@/components/admin/common/RegionScopeSelector";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import SeedConfirmDialog from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog";
import {
  PlusIcon,
  TrashBinIcon,
  CheckLineIcon,
  BoxCubeIcon,
  FlaskConicalIcon,
  DocsIcon,
  KnowledgeSourcesIcon,
} from "@/icons";
import type {
  FertilizerRecommendation,
  FertilizerRecommendationFormValues,
  FertilizerRecommendationPayload,
  FertilizerRecommendationOptions,
} from "@/types/admin/fertilizerRecommendation";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";

const card =
  "rounded-xl shadow-theme-xs [&>div:first-child]:py-4 [&_h3]:text-xl [&_h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function FertilizerRecommendationForm({
  recommendation,
  options,
  choices,
  selections,
  states,
  canReview,
  maxReferenceYear,
}: {
  recommendation: FertilizerRecommendation | null;
  options: FertilizerRecommendationOptions;
  choices: TimelineChoices;
  selections: TimelineSelections;
  states: TimelineState[];
  canReview: boolean;
  maxReferenceYear: number;
}) {
  const t = useTranslations("fertilizerRecommendations"),
    router = useRouter(),
    saving = useRef(false);
  const [pending, startTransition] = useTransition(),
    [record, setRecord] = useState(recommendation),
    [failure, setFailure] = useState(""),
    [removing, setRemoving] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FertilizerRecommendationFormValues>({
    defaultValues: {
      crop_id: recommendation ? String(recommendation.crop_id) : "",
      crop_variety_id: recommendation?.crop_variety_id
        ? String(recommendation.crop_variety_id)
        : "",
      season_id: recommendation?.season_id
        ? String(recommendation.season_id)
        : "",
      recommendation_type:
        recommendation?.recommendation_type ??
        options.recommendation_types[0]?.value ??
        "",
      irrigation_condition: recommendation?.irrigation_condition ?? "",
      soil_condition: recommendation?.soil_condition ?? "",
      application_method: recommendation?.application_method ?? "",
      reference_code: recommendation?.reference_code ?? "",
      nutrients: recommendation
        ? recommendation.nutrients.map(
            ({
              nutrient_code,
              recommended_quantity,
              unit_code,
              area_unit_code,
            }) => ({
              nutrient_code,
              recommended_quantity,
              unit_code,
              area_unit_code,
            }),
          )
        : [
            {
              nutrient_code: "",
              recommended_quantity: "",
              unit_code: options.unit_codes[0]?.value ?? "",
              area_unit_code: options.area_unit_codes[0]?.value ?? "",
            },
          ],
      basal_dose_notes: recommendation?.basal_dose_notes ?? "",
      top_dressing_notes: recommendation?.top_dressing_notes ?? "",
      general_advisory: recommendation?.general_advisory ?? "",
      notes: recommendation?.notes ?? "",
      source_id: recommendation ? String(recommendation.source_id) : "",
      reference_year:
        recommendation?.reference_year === null ||
        recommendation?.reference_year === undefined
          ? ""
          : String(recommendation.reference_year),
      region_scope: recommendation?.region_scope ?? "all",
      region_ids: recommendation?.region_ids ?? [],
      is_active: recommendation?.is_active ?? canReview,
    },
    mode: "onTouched",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "nutrients",
    rules: {
      minLength: { value: 1, message: t("validation.nutrientsRequired") },
      maxLength: {
        value: options.nutrient_codes.length,
        message: t("validation.nutrientCount", {
          count: options.nutrient_codes.length,
        }),
      },
      validate: (rows) => rows.length > 0 || t("validation.nutrientsRequired"),
    },
  });
  const busy = pending || isSubmitting,
    locked = !!record?.is_active && !canReview;
  const crop = useWatch({ control, name: "crop_id" }),
    scope = useWatch({ control, name: "region_scope" }),
    notes = useWatch({ control, name: "notes" }),
    rows = useWatch({ control, name: "nutrients" });
  const sameCrop =
    crop === (recommendation ? String(recommendation.crop_id) : "");
  const validId = (value: string) =>
    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
    t("validation.selection");
  function back() {
    if (!saving.current) router.push("/admin/fertilizer-recommendations");
  }
  function submit(values: FertilizerRecommendationFormValues) {
    if (saving.current || locked) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const result = await saveFertilizerRecommendation(record?.id ?? null, {
          crop_id: Number(values.crop_id),
          crop_variety_id: values.crop_variety_id
            ? Number(values.crop_variety_id)
            : null,
          season_id: values.season_id ? Number(values.season_id) : null,
          recommendation_type: values.recommendation_type,
          irrigation_condition: values.irrigation_condition || null,
          soil_condition: values.soil_condition || null,
          application_method: values.application_method || null,
          reference_code: values.reference_code.trim() || null,
          nutrients:
            values.nutrients as FertilizerRecommendationPayload["nutrients"],
          basal_dose_notes: values.basal_dose_notes.trim() || null,
          top_dressing_notes: values.top_dressing_notes.trim() || null,
          general_advisory: values.general_advisory.trim() || null,
          notes: values.notes.trim() || null,
          source_id: Number(values.source_id),
          reference_year: values.reference_year
            ? Number(values.reference_year)
            : null,
          is_active: values.is_active,
          region_scope: values.region_scope,
          region_ids: values.region_scope === "all" ? [] : values.region_ids,
        });
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            if (field === "region_ids" || field.startsWith("region_ids."))
              setError("region_ids", { type: "server", message: messages[0] });
            else if (
              Object.hasOwn(values, field) ||
              /^nutrients\.\d+\.(nutrient_code|recommended_quantity|unit_code|area_unit_code)$/.test(
                field,
              )
            )
              setError(field as FieldPath<FertilizerRecommendationFormValues>, {
                type: "server",
                message: messages[0],
              });
          }
          const message = result.message || t("feedback.failed");
          setFailure(message);
          toast.error(message);
          return;
        }
        setRecord(result.data);
        reset({ ...values, is_active: result.data.is_active });
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/fertilizer-recommendations");
      } catch {
        setFailure(t("feedback.failed"));
        toast.error(t("feedback.failed"));
      } finally {
        saving.current = false;
      }
    });
  }
  return (
    <>
      <form
        onSubmit={(event) => {
          void handleSubmit(submit)(event);
        }}
        noValidate
        aria-busy={busy}
        className="space-y-5"
      >
        {failure && (
          <p
            role="alert"
            className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-4 text-sm"
          >
            {failure}
          </p>
        )}
        {locked && (
          <p
            role="status"
            className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 rounded-xl p-4 text-sm"
          >
            {t("form.locked")}
          </p>
        )}
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-5">
          <fieldset
            disabled={busy || locked}
            className="min-w-0 space-y-5 xl:col-span-3"
          >
            <legend className="sr-only">{t("form.cropDetails")}</legend>
            <ComponentCard
              className={card}
              title={
                <span className="flex items-center gap-3">
                  <BoxCubeIcon
                    aria-hidden="true"
                    className="text-brand-500 size-6"
                  />
                  {t("form.cropDetails")}
                </span>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Controller
                  name="crop_id"
                  control={control}
                  rules={{
                    required: t("validation.required"),
                    validate: validId,
                  }}
                  render={({ field }) => (
                    <TimelineRelationSelect
                      kind="crop"
                      id="recommendation-crop"
                      label={t("fields.crop_id")}
                      value={field.value}
                      onChange={(value) => {
                        if (saving.current || value === field.value) return;
                        field.onChange(value);
                        setValue("crop_variety_id", "", { shouldDirty: true });
                        clearErrors("crop_variety_id");
                      }}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      initialPage={choices.crop}
                      initialSelection={selections.crop}
                      disabled={busy || locked}
                      eligible
                      required
                      clearable
                      placeholder={t("form.selectCrop")}
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
                      id="recommendation-variety"
                      label={t("fields.crop_variety_id")}
                      value={field.value}
                      onChange={field.onChange}
                      cropId={crop ? Number(crop) : null}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      initialPage={sameCrop ? choices.variety : undefined}
                      initialSelection={sameCrop ? selections.variety : null}
                      disabled={busy || locked || !crop}
                      eligible
                      placeholder={t("form.selectVariety")}
                      emptyLabel={t("allVarieties")}
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
                      id="recommendation-season"
                      label={t("fields.season_id")}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      initialPage={choices.season}
                      initialSelection={selections.season}
                      disabled={busy || locked}
                      eligible
                      placeholder={t("form.selectSeason")}
                      emptyLabel={t("allSeasons")}
                      error={errors.season_id?.message}
                    />
                  )}
                />

                <div>
                  <FilterSelect
                    {...register("recommendation_type", {
                      required: t("validation.required"),
                      validate: (value) =>
                        options.recommendation_types.some(
                          (option) => option.value === value,
                        ) || t("validation.selection"),
                    })}
                    id="recommendation-type"
                    label={t("fields.recommendation_type") + " *"}
                    disabled={!options.recommendation_types.length}
                    aria-required="true"
                    aria-invalid={!!errors.recommendation_type}
                    aria-describedby="recommendation-type-error"
                  >
                    <option value="">{t("form.selectType")}</option>
                    {options.recommendation_types.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FilterSelect>
                  <p
                    id="recommendation-type-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.recommendation_type?.message}
                  </p>
                </div>
                <div>
                  <FilterSelect
                    {...register("irrigation_condition", {
                      validate: (value) =>
                        !value ||
                        options.irrigation_conditions.some(
                          (option) => option.value === value,
                        ) ||
                        t("validation.selection"),
                    })}
                    id="recommendation-irrigation"
                    label={t("fields.irrigation_condition")}
                    disabled={!options.irrigation_conditions.length}
                    aria-invalid={!!errors.irrigation_condition}
                    aria-describedby="recommendation-irrigation-error"
                  >
                    <option value="">{t("notRestricted")}</option>
                    {options.irrigation_conditions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FilterSelect>
                  <p
                    id="recommendation-irrigation-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.irrigation_condition?.message}
                  </p>
                </div>
                <div>
                  <FilterSelect
                    {...register("soil_condition", {
                      validate: (value) =>
                        !value ||
                        options.soil_conditions.some(
                          (option) => option.value === value,
                        ) ||
                        t("validation.selection"),
                    })}
                    id="recommendation-soil"
                    label={t("fields.soil_condition")}
                    disabled={!options.soil_conditions.length}
                    aria-invalid={!!errors.soil_condition}
                    aria-describedby="recommendation-soil-error recommendation-soil-help"
                  >
                    <option value="">{t("notRestricted")}</option>
                    {options.soil_conditions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FilterSelect>
                  <p
                    id="recommendation-soil-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.soil_condition?.message}
                  </p>
                  <p
                    id="recommendation-soil-help"
                    className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {options.soil_condition_definition}
                  </p>
                </div>
                <div>
                  <FilterSelect
                    {...register("application_method", {
                      validate: (value) =>
                        !value ||
                        options.application_methods.some(
                          (option) => option.value === value,
                        ) ||
                        t("validation.selection"),
                    })}
                    id="recommendation-method"
                    label={t("fields.application_method")}
                    disabled={!options.application_methods.length}
                    aria-invalid={!!errors.application_method}
                    aria-describedby="recommendation-method-error"
                  >
                    <option value="">{t("notRestricted")}</option>
                    {options.application_methods.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FilterSelect>
                  <p
                    id="recommendation-method-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.application_method?.message}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="recommendation-code">
                    {t("fields.reference_code")}
                  </Label>
                  <Input
                    {...register("reference_code", {
                      maxLength: {
                        value: 100,
                        message: t("validation.max", { count: 100 }),
                      },
                    })}
                    id="recommendation-code"
                    maxLength={100}
                    placeholder={t("form.codePlaceholder")}
                    error={!!errors.reference_code}
                    aria-invalid={!!errors.reference_code}
                    aria-describedby="recommendation-code-error"
                  />
                  <p
                    id="recommendation-code-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.reference_code?.message}
                  </p>
                </div>
              </div>
            </ComponentCard>
            <ComponentCard
              className={card}
              title={
                <span className="flex items-center gap-3">
                  <FlaskConicalIcon
                    aria-hidden="true"
                    className="text-brand-500 size-6"
                  />
                  {t("form.nutrientTargets")}
                </span>
              }
              desc={t("form.nutrientDescription")}
            >
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid items-start gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-12 dark:border-gray-800"
                  >
                    <p className="text-sm font-medium text-gray-700 sm:col-span-1 sm:pt-8 dark:text-gray-300">
                      {index + 1}
                    </p>
                    <div className="min-w-0 sm:col-span-4">
                      <FilterSelect
                        {...register(`nutrients.${index}.nutrient_code`, {
                          required: t("validation.required"),
                          validate: {
                            supported: (value) =>
                              options.nutrient_codes.some(
                                (option) => option.value === value,
                              ) || t("validation.selection"),
                            unique: (value) =>
                              getValues("nutrients").filter(
                                (row) => row.nutrient_code === value,
                              ).length <= 1 ||
                              t("validation.duplicateNutrient"),
                          },
                        })}
                        id={`target-${field.id}-code`}
                        label={t("nutrients.nutrient") + " *"}
                        aria-required="true"
                        aria-invalid={
                          !!errors.nutrients?.[index]?.nutrient_code
                        }
                        aria-describedby={`target-${field.id}-code-error`}
                      >
                        <option value="">
                          {t("nutrients.selectNutrient")}
                        </option>
                        {options.nutrient_codes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FilterSelect>
                      <p
                        id={`target-${field.id}-code-error`}
                        role="alert"
                        className={errorClass}
                      >
                        {errors.nutrients?.[index]?.nutrient_code?.message}
                      </p>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <Label htmlFor={`target-${field.id}-quantity`}>
                        {t("nutrients.quantity")} *
                      </Label>
                      <Input
                        {...register(
                          `nutrients.${index}.recommended_quantity`,
                          {
                            required: t("validation.required"),
                            validate: (value) =>
                              (/^\d+(?:\.\d{1,4})?$/.test(value) &&
                                value.split(".")[0].replace(/^0+/, "").length <=
                                  10 &&
                                /[1-9]/.test(value)) ||
                              t("validation.quantity"),
                          },
                        )}
                        id={`target-${field.id}-quantity`}
                        inputMode="decimal"
                        placeholder={t("nutrients.quantityPlaceholder")}
                        error={
                          !!errors.nutrients?.[index]?.recommended_quantity
                        }
                        aria-required="true"
                        aria-invalid={
                          !!errors.nutrients?.[index]?.recommended_quantity
                        }
                        aria-describedby={`target-${field.id}-quantity-error`}
                      />
                      <p
                        id={`target-${field.id}-quantity-error`}
                        role="alert"
                        className={errorClass}
                      >
                        {
                          errors.nutrients?.[index]?.recommended_quantity
                            ?.message
                        }
                      </p>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <FilterSelect
                        {...register(`nutrients.${index}.unit_code`, {
                          required: t("validation.required"),
                          validate: (value) =>
                            options.unit_codes.some(
                              (option) => option.value === value,
                            ) || t("validation.selection"),
                        })}
                        id={`target-${field.id}-unit`}
                        label={t("nutrients.unit") + " *"}
                        aria-required="true"
                        aria-invalid={!!errors.nutrients?.[index]?.unit_code}
                        aria-describedby={`target-${field.id}-unit-error`}
                      >
                        <option value="">{t("nutrients.selectUnit")}</option>
                        {options.unit_codes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FilterSelect>
                      <p
                        id={`target-${field.id}-unit-error`}
                        role="alert"
                        className={errorClass}
                      >
                        {errors.nutrients?.[index]?.unit_code?.message}
                      </p>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <FilterSelect
                        {...register(`nutrients.${index}.area_unit_code`, {
                          required: t("validation.required"),
                          validate: (value) =>
                            options.area_unit_codes.some(
                              (option) => option.value === value,
                            ) || t("validation.selection"),
                        })}
                        id={`target-${field.id}-area`}
                        label={t("nutrients.areaUnit") + " *"}
                        aria-required="true"
                        aria-invalid={
                          !!errors.nutrients?.[index]?.area_unit_code
                        }
                        aria-describedby={`target-${field.id}-area-error`}
                      >
                        <option value="">{t("nutrients.selectArea")}</option>
                        {options.area_unit_codes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FilterSelect>
                      <p
                        id={`target-${field.id}-area-error`}
                        role="alert"
                        className={errorClass}
                      >
                        {errors.nutrients?.[index]?.area_unit_code?.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy || locked}
                      onClick={() => {
                        if (saving.current) return;
                        const row = getValues(`nutrients.${index}`);
                        if (row.nutrient_code || row.recommended_quantity)
                          setRemoving(field.id);
                        else remove(index);
                      }}
                      aria-label={t("nutrients.removeRow", {
                        number: index + 1,
                      })}
                      className="border-error-200 text-error-600 dark:border-error-800 dark:text-error-400 flex items-center justify-center rounded-lg border p-2 sm:mt-7 sm:justify-self-end"
                    >
                      <TrashBinIcon aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p role="alert" className={errorClass}>
                {errors.nutrients?.root?.message ?? errors.nutrients?.message}
              </p>
              <button
                type="button"
                disabled={
                  busy ||
                  locked ||
                  fields.length >= options.nutrient_codes.length
                }
                onClick={() => {
                  if (
                    !saving.current &&
                    fields.length < options.nutrient_codes.length
                  )
                    append({
                      nutrient_code: "",
                      recommended_quantity: "",
                      unit_code: options.unit_codes[0]?.value ?? "",
                      area_unit_code: options.area_unit_codes[0]?.value ?? "",
                    });
                }}
                className="border-brand-400 text-brand-500 dark:border-brand-700 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm font-semibold disabled:opacity-50"
              >
                <PlusIcon aria-hidden="true" className="size-5" />
                {t("nutrients.add")}
              </button>
              <p className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 rounded-lg p-3 text-sm">
                {t("nutrients.help")}
              </p>
            </ComponentCard>
            <ComponentCard
              className={card}
              title={
                <span className="flex items-center gap-3">
                  <DocsIcon
                    aria-hidden="true"
                    className="text-brand-500 size-6"
                  />
                  {t("form.guidance")}
                </span>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="recommendation-basal">
                    {t("fields.basal_dose_notes")}
                  </Label>
                  <Controller
                    name="basal_dose_notes"
                    control={control}
                    rules={{
                      maxLength: {
                        value: 65535,
                        message: t("validation.max", { count: 65535 }),
                      },
                    }}
                    render={({ field }) => (
                      <TextArea
                        {...field}
                        id="recommendation-basal"
                        rows={5}
                        maxLength={65535}
                        disabled={busy || locked}
                        error={!!errors.basal_dose_notes}
                        aria-invalid={!!errors.basal_dose_notes}
                        aria-describedby="recommendation-basal-error"
                        placeholder={t("form.basalPlaceholder")}
                      />
                    )}
                  />
                  <p
                    id="recommendation-basal-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.basal_dose_notes?.message}
                  </p>
                </div>
                <div>
                  <Label htmlFor="recommendation-top">
                    {t("fields.top_dressing_notes")}
                  </Label>
                  <Controller
                    name="top_dressing_notes"
                    control={control}
                    rules={{
                      maxLength: {
                        value: 65535,
                        message: t("validation.max", { count: 65535 }),
                      },
                    }}
                    render={({ field }) => (
                      <TextArea
                        {...field}
                        id="recommendation-top"
                        rows={5}
                        maxLength={65535}
                        disabled={busy || locked}
                        error={!!errors.top_dressing_notes}
                        aria-invalid={!!errors.top_dressing_notes}
                        aria-describedby="recommendation-top-error"
                        placeholder={t("form.topPlaceholder")}
                      />
                    )}
                  />
                  <p
                    id="recommendation-top-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.top_dressing_notes?.message}
                  </p>
                </div>
                <div>
                  <Label htmlFor="recommendation-advisory">
                    {t("fields.general_advisory")}
                  </Label>
                  <Controller
                    name="general_advisory"
                    control={control}
                    rules={{
                      maxLength: {
                        value: 65535,
                        message: t("validation.max", { count: 65535 }),
                      },
                    }}
                    render={({ field }) => (
                      <TextArea
                        {...field}
                        id="recommendation-advisory"
                        rows={5}
                        maxLength={65535}
                        disabled={busy || locked}
                        error={!!errors.general_advisory}
                        aria-invalid={!!errors.general_advisory}
                        aria-describedby="recommendation-advisory-error"
                        placeholder={t("form.advisoryPlaceholder")}
                      />
                    )}
                  />
                  <p
                    id="recommendation-advisory-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.general_advisory?.message}
                  </p>
                </div>
              </div>
            </ComponentCard>
            <ComponentCard className={card} title={t("fields.notes")}>
              <div>
                <Label htmlFor="recommendation-notes" className="sr-only">
                  {t("fields.notes")}
                </Label>
                <Controller
                  name="notes"
                  control={control}
                  rules={{
                    maxLength: {
                      value: 500,
                      message: t("validation.max", { count: 500 }),
                    },
                  }}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      id="recommendation-notes"
                      rows={3}
                      maxLength={500}
                      disabled={busy || locked}
                      error={!!errors.notes}
                      aria-invalid={!!errors.notes}
                      aria-describedby="recommendation-notes-error recommendation-notes-count"
                      placeholder={t("form.notesPlaceholder")}
                    />
                  )}
                />
                <p
                  id="recommendation-notes-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.notes?.message}
                </p>
                <p
                  id="recommendation-notes-count"
                  className="mt-1 text-end text-xs text-gray-500 dark:text-gray-400"
                >
                  {t("form.count", { count: notes.length, max: 500 })}
                </p>
              </div>
            </ComponentCard>
          </fieldset>
          <aside className="min-w-0 space-y-5 xl:col-span-2">
            <Controller
              name="region_ids"
              control={control}
              rules={{
                validate: (ids) =>
                  getValues("region_scope") === "all" ||
                  validDistrictSelection(
                    ids,
                    states,
                    record?.region_ids ?? [],
                  ) ||
                  t("validation.districts"),
              }}
              render={({ field }) => (
                <RegionScopeSelector
                  scope={scope}
                  scopeInput={register("region_scope", {
                    required: t("validation.required"),
                    validate: (value) =>
                      value === "all" ||
                      value === "specific" ||
                      t("validation.selection"),
                    onChange: (event) => {
                      if (event.target.value === "all") {
                        setValue("region_ids", [], { shouldDirty: true });
                        clearErrors("region_ids");
                      }
                    },
                  })}
                  states={states}
                  selectedIds={field.value}
                  onChange={field.onChange}
                  districtRef={field.ref}
                  busy={busy || locked}
                  scopeError={errors.region_scope?.message}
                  districtError={errors.region_ids?.message}
                />
              )}
            />

            <ComponentCard
              className={card}
              title={
                <span className="flex items-center gap-3">
                  <KnowledgeSourcesIcon
                    aria-hidden="true"
                    className="text-brand-500 size-6"
                  />
                  {t("form.publication")}
                </span>
              }
            >
              <fieldset
                disabled={busy || locked}
                className="grid gap-5 sm:grid-cols-2"
              >
                <legend className="sr-only">{t("form.publication")}</legend>
                <Controller
                  name="source_id"
                  control={control}
                  rules={{
                    required: t("validation.required"),
                    validate: validId,
                  }}
                  render={({ field }) => (
                    <TimelineRelationSelect
                      kind="source"
                      id="recommendation-source"
                      label={t("fields.source_id")}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      initialPage={choices.source}
                      initialSelection={selections.source}
                      disabled={busy || locked}
                      eligible
                      required
                      clearable
                      placeholder={t("form.selectSource")}
                      error={errors.source_id?.message}
                    />
                  )}
                />

                <div>
                  <Label htmlFor="recommendation-year">
                    {t("fields.reference_year")}
                  </Label>
                  <Input
                    {...register("reference_year", {
                      validate: (value) =>
                        !value ||
                        (/^\d{4}$/.test(value) &&
                          Number(value) >= 1000 &&
                          Number(value) <= maxReferenceYear) ||
                        t("validation.year", { year: maxReferenceYear }),
                    })}
                    id="recommendation-year"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={t("form.yearPlaceholder")}
                    error={!!errors.reference_year}
                    aria-invalid={!!errors.reference_year}
                    aria-describedby="recommendation-year-error"
                  />
                  <p
                    id="recommendation-year-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.reference_year?.message}
                  </p>
                </div>
                <div
                  role="group"
                  aria-label={t("fields.is_active")}
                  aria-describedby="recommendation-active-error"
                >
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        label={t("active")}
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={busy || locked || !canReview}
                      />
                    )}
                  />
                  <p
                    id="recommendation-active-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.is_active?.message}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {t(canReview ? "form.activeHelp" : "form.reviewHelp")}
                  </p>
                </div>
              </fieldset>
            </ComponentCard>
            <ComponentCard title={t("form.guidelines")} className={card}>
              <ul className="list-disc space-y-3 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <li>{t("form.guideSource")}</li>
                <li>{t("form.guideNutrients")}</li>
                <li>{t("form.guideRegions")}</li>
                <li>{t("form.guideVariety")}</li>
              </ul>
            </ComponentCard>
          </aside>
        </div>
        <div className="shadow-theme-xs flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={back}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
          >
            {t("back")}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={back}
              disabled={busy}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={
                busy ||
                locked ||
                !options.recommendation_types.length ||
                !options.nutrient_codes.length
              }
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckLineIcon aria-hidden="true" className="size-5" />
              {t(busy ? "form.saving" : "form.save")}
            </button>
          </div>
        </div>
      </form>
      {removing && (
        <SeedConfirmDialog
          title={t("nutrients.removeTitle")}
          description={t("nutrients.removeConfirm", {
            name:
              options.nutrient_codes.find(
                (option) =>
                  option.value ===
                  rows[fields.findIndex((field) => field.id === removing)]
                    ?.nutrient_code,
              )?.label ?? t("nutrients.nutrient"),
          })}
          confirmLabel={t("nutrients.remove")}
          busy={busy}
          destructive
          onClose={() => {
            if (!saving.current) setRemoving(null);
          }}
          onConfirm={() => {
            if (saving.current) return;
            const index = fields.findIndex((field) => field.id === removing);
            if (index >= 0) remove(index);
            setRemoving(null);
          }}
        />
      )}
    </>
  );
}
