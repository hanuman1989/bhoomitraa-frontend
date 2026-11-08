"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { saveCropYieldBenchmark } from "@/actions/admin/cropYieldBenchmarks";
import ComponentCard from "@/components/admin/common/ComponentCard";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import Switch from "@/components/admin/form/switch/Switch";
import Badge from "@/components/admin/ui/badge/Badge";
import RegionScopeSelector, {
  validDistrictSelection,
} from "@/components/admin/common/RegionScopeSelector";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import {
  BoxCubeIcon,
  CheckLineIcon,
  DocsIcon,
  SproutIcon,
  InfoIcon,
  KnowledgeSourcesIcon,
  ChevronLeftIcon,
} from "@/icons";
import {
  yieldBenchmarkTypes,
  type CropYieldBenchmark,
  type CropYieldBenchmarkFormValues,
  type CropYieldBenchmarkPayload,
} from "@/types/admin/cropYieldBenchmark";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";

const card =
  "rounded-xl shadow-theme-xs [&>div:first-child]:py-4 [&_h3]:text-xl [&_h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropYieldBenchmarkForm({
  benchmark,
  choices,
  selections,
  states,
  canReview,
  maxReferenceYear,
}: {
  benchmark: CropYieldBenchmark | null;
  choices: TimelineChoices;
  selections: TimelineSelections;
  states: TimelineState[];
  canReview: boolean;
  maxReferenceYear: number;
}) {
  const t = useTranslations("cropYieldBenchmarks"),
    router = useRouter(),
    saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [record, setRecord] = useState(benchmark),
    [failure, setFailure] = useState("");
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
  } = useForm<CropYieldBenchmarkFormValues>({
    defaultValues: {
      crop_id: benchmark ? String(benchmark.crop_id) : "",
      crop_variety_id: benchmark?.crop_variety_id
        ? String(benchmark.crop_variety_id)
        : "",
      season_id: benchmark?.season_id ? String(benchmark.season_id) : "",
      yield_min_kg_ha: benchmark?.yield_min_kg_ha ?? "",
      yield_avg_kg_ha: benchmark?.yield_avg_kg_ha ?? "",
      yield_max_kg_ha: benchmark?.yield_max_kg_ha ?? "",
      benchmark_type: benchmark?.benchmark_type ?? "research_trial",
      reference_year:
        benchmark?.reference_year === null ||
        benchmark?.reference_year === undefined
          ? ""
          : String(benchmark.reference_year),
      source_id: benchmark ? String(benchmark.source_id) : "",
      notes: benchmark?.notes ?? "",
      is_active: benchmark?.is_active ?? canReview,
      region_scope: benchmark?.region_scope ?? "all",
      region_ids: benchmark?.region_ids ?? [],
    },
    mode: "onTouched",
  });
  const busy = pending || isSubmitting,
    locked = !!record?.is_active && !canReview;
  const crop = useWatch({ control, name: "crop_id" }),
    notes = useWatch({ control, name: "notes" }),
    scope = useWatch({ control, name: "region_scope" });
  const sameCrop = crop === (benchmark ? String(benchmark.crop_id) : "");
  const validId = (value: string) =>
    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
    t("validation.selection");
  function decimal(value: string, zero: boolean) {
    return (
      (/^\d+(?:\.\d{1,3})?$/.test(value) &&
        value.split(".")[0].replace(/^0+/, "").length <= 9 &&
        (zero || /[1-9]/.test(value))) ||
      t(zero ? "validation.bound" : "validation.average")
    );
  }
  function submit(values: CropYieldBenchmarkFormValues) {
    if (saving.current || locked) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const result = await saveCropYieldBenchmark(record?.id ?? null, {
          crop_id: Number(values.crop_id),
          crop_variety_id: values.crop_variety_id
            ? Number(values.crop_variety_id)
            : null,
          season_id: values.season_id ? Number(values.season_id) : null,
          yield_min_kg_ha: values.yield_min_kg_ha || null,
          yield_avg_kg_ha: values.yield_avg_kg_ha,
          yield_max_kg_ha: values.yield_max_kg_ha || null,
          benchmark_type:
            values.benchmark_type as CropYieldBenchmarkPayload["benchmark_type"],
          reference_year: values.reference_year
            ? Number(values.reference_year)
            : null,
          source_id: Number(values.source_id),
          notes: values.notes.trim() || null,
          is_active: values.is_active,
          region_scope: values.region_scope,
          region_ids: values.region_scope === "all" ? [] : values.region_ids,
        });
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            if (field === "region_ids" || field.startsWith("region_ids."))
              setError("region_ids", { type: "server", message: messages[0] });
            else if (Object.hasOwn(values, field))
              setError(field as keyof CropYieldBenchmarkFormValues, {
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
        router.push("/admin/crop-yield-benchmarks");
      } catch {
        setFailure(t("feedback.failed"));
        toast.error(t("feedback.failed"));
      } finally {
        saving.current = false;
      }
    });
  }
  function back() {
    if (!saving.current) router.push("/admin/crop-yield-benchmarks");
  }
  return (
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
            desc={t("form.cropDescription")}
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
                    id="benchmark-crop"
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
                    id="benchmark-variety"
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
                    id="benchmark-season"
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
            </div>
          </ComponentCard>
          <ComponentCard
            className={card}
            title={
              <span className="flex items-center gap-3">
                <SproutIcon
                  aria-hidden="true"
                  className="text-brand-500 size-6"
                />
                {t("form.yields")}
              </span>
            }
            desc={t("form.yieldsDescription")}
          >
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <div>
                <Label htmlFor="benchmark-unit">{t("fields.yield_unit")}</Label>
                <Input
                  id="benchmark-unit"
                  value="kg/ha"
                  readOnly
                  aria-describedby="benchmark-unit-help"
                />
              </div>
              <div>
                <Label htmlFor="benchmark-min">
                  {t("fields.yield_min_kg_ha")}
                </Label>
                <Input
                  {...register("yield_min_kg_ha", {
                    validate: {
                      decimal: (value) => !value || decimal(value, true),
                      range: (value) =>
                        !value ||
                        !getValues("yield_avg_kg_ha") ||
                        Number(value) <= Number(getValues("yield_avg_kg_ha")) ||
                        t("validation.minimumRange"),
                    },
                  })}
                  id="benchmark-min"
                  inputMode="decimal"
                  placeholder={t("form.minimumPlaceholder")}
                  error={!!errors.yield_min_kg_ha}
                  aria-invalid={!!errors.yield_min_kg_ha}
                  aria-describedby="benchmark-min-error"
                />
                <p id="benchmark-min-error" role="alert" className={errorClass}>
                  {errors.yield_min_kg_ha?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="benchmark-average">
                  {t("fields.yield_avg_kg_ha")}{" "}
                  <span className="text-error-600">*</span>
                </Label>
                <Input
                  {...register("yield_avg_kg_ha", {
                    required: t("validation.required"),
                    validate: (value) => decimal(value, false),
                    deps: ["yield_min_kg_ha", "yield_max_kg_ha"],
                  })}
                  id="benchmark-average"
                  inputMode="decimal"
                  placeholder={t("form.averagePlaceholder")}
                  error={!!errors.yield_avg_kg_ha}
                  aria-required="true"
                  aria-invalid={!!errors.yield_avg_kg_ha}
                  aria-describedby="benchmark-average-error"
                />
                <p
                  id="benchmark-average-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.yield_avg_kg_ha?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="benchmark-max">
                  {t("fields.yield_max_kg_ha")}
                </Label>
                <Input
                  {...register("yield_max_kg_ha", {
                    validate: {
                      decimal: (value) => !value || decimal(value, true),
                      range: (value) =>
                        !value ||
                        !getValues("yield_avg_kg_ha") ||
                        Number(value) >= Number(getValues("yield_avg_kg_ha")) ||
                        t("validation.maximumRange"),
                    },
                  })}
                  id="benchmark-max"
                  inputMode="decimal"
                  placeholder={t("form.maximumPlaceholder")}
                  error={!!errors.yield_max_kg_ha}
                  aria-invalid={!!errors.yield_max_kg_ha}
                  aria-describedby="benchmark-max-error"
                />
                <p id="benchmark-max-error" role="alert" className={errorClass}>
                  {errors.yield_max_kg_ha?.message}
                </p>
              </div>
            </div>
            <p
              id="benchmark-unit-help"
              className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 flex items-center gap-3 rounded-lg p-3 text-sm"
            >
              <InfoIcon aria-hidden="true" className="size-5 shrink-0" />
              {t("form.unitHelp")}
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
                {t("form.information")}
              </span>
            }
            desc={t("form.informationDescription")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FilterSelect
                  {...register("benchmark_type", {
                    required: t("validation.required"),
                    validate: (value) =>
                      yieldBenchmarkTypes.some((type) => type === value) ||
                      t("validation.selection"),
                  })}
                  id="benchmark-type"
                  label={`${t("fields.benchmark_type")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.benchmark_type}
                  aria-describedby="benchmark-type-error"
                >
                  <option value="">{t("form.selectType")}</option>
                  {yieldBenchmarkTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p
                  id="benchmark-type-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.benchmark_type?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="benchmark-year">
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
                  id="benchmark-year"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("form.yearPlaceholder")}
                  error={!!errors.reference_year}
                  aria-invalid={!!errors.reference_year}
                  aria-describedby="benchmark-year-error"
                />
                <p
                  id="benchmark-year-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.reference_year?.message}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {yieldBenchmarkTypes.map((type) => (
                <Badge key={type} size="sm">
                  {t(`types.${type}`)}
                </Badge>
              ))}
            </div>
            <div>
              <Label htmlFor="benchmark-notes">{t("fields.notes")}</Label>
              <textarea
                {...register("notes", {
                  maxLength: { value: 65535, message: t("validation.notes") },
                })}
                id="benchmark-notes"
                rows={4}
                maxLength={65535}
                placeholder={t("form.notesPlaceholder")}
                aria-invalid={!!errors.notes}
                aria-describedby="benchmark-notes-error benchmark-notes-count"
                className={`focus:border-brand-300 focus:ring-brand-500/20 w-full rounded-lg border bg-transparent p-3 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:bg-gray-900 dark:text-white/90 ${errors.notes ? "border-error-500" : "border-gray-300 dark:border-gray-700"}`}
              />
              <p id="benchmark-notes-error" role="alert" className={errorClass}>
                {errors.notes?.message}
              </p>
              <p
                id="benchmark-notes-count"
                className="mt-1 text-end text-xs text-gray-500 dark:text-gray-400"
              >
                {t("form.count", { count: notes.length, max: 65535 })}
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
                validDistrictSelection(ids, states, record?.region_ids ?? []) ||
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
              className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
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
                    id="benchmark-source"
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
              <div
                role="group"
                aria-label={t("fields.is_active")}
                aria-describedby="benchmark-active-help benchmark-active-error"
              >
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      label={t("fields.is_active")}
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={busy || locked || !canReview}
                    />
                  )}
                />
                <p
                  id="benchmark-active-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.is_active?.message}
                </p>
                <p
                  id="benchmark-active-help"
                  className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400"
                >
                  {t(canReview ? "form.activeHelp" : "form.reviewHelp")}
                </p>
              </div>
            </fieldset>
          </ComponentCard>
        </aside>
      </div>
      <div className="shadow-theme-xs flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={back}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
        >
          <ChevronLeftIcon
            aria-hidden="true"
            className="size-4 rtl:rotate-180"
          />
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
            disabled={busy || locked}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <CheckLineIcon aria-hidden="true" className="size-5" />
            {t(busy ? "form.saving" : "form.save")}
          </button>
        </div>
      </div>
    </form>
  );
}
