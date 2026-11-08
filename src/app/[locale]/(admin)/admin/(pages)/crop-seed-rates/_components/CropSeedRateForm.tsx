"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { saveCropSeedRate } from "@/actions/admin/cropSeedRates";
import ComponentCard from "@/components/admin/common/ComponentCard";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import Switch from "@/components/admin/form/switch/Switch";
import RegionScopeSelector, {
  validDistrictSelection,
} from "@/components/admin/common/RegionScopeSelector";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import {
  BoxCubeIcon,
  CheckLineIcon,
  DocsIcon,
  SproutIcon,
  ListIcon,
} from "@/icons";
import { materialTypes } from "@/types/admin/seed";
import {
  rateSowingMethods,
  rateIrrigationConditions,
  rateAreaUnits,
  type CropSeedRate,
  type CropSeedRateFormValues,
  type CropSeedRatePayload,
} from "@/types/admin/cropSeedRate";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";

const card =
  "rounded-xl shadow-theme-xs [&>div:first-child]:py-4 [&_h3]:text-xl [&_h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function CropSeedRateForm({
  rate,
  choices,
  selections,
  states,
  canReview,
}: {
  rate: CropSeedRate | null;
  choices: TimelineChoices;
  selections: TimelineSelections;
  states: TimelineState[];
  canReview: boolean;
}) {
  const t = useTranslations("cropSeedRates"),
    ts = useTranslations("seeds"),
    tr = useTranslations("stageTimelines"),
    router = useRouter(),
    saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [record, setRecord] = useState(rate),
    [failure, setFailure] = useState("");
  const [selectedSeed, setSelectedSeed] = useState<CropSeedRate["seed"]>(
    rate?.seed ?? null,
  );
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
  } = useForm<CropSeedRateFormValues>({
    defaultValues: {
      crop_id: rate ? String(rate.crop_id) : "",
      crop_variety_id: rate?.crop_variety_id
        ? String(rate.crop_variety_id)
        : "",
      seed_id: rate?.seed_id ? String(rate.seed_id) : "",
      season_id: rate?.season_id ? String(rate.season_id) : "",
      material_type: rate?.material_type ?? "",
      sowing_method: rate?.sowing_method ?? "",
      irrigation_condition: rate?.irrigation_condition ?? "",
      rate_basis: rate?.rate_basis ?? "per_area",
      rate_min: rate?.rate_min ?? "",
      rate_recommended: rate?.rate_recommended ?? "",
      rate_max: rate?.rate_max ?? "",
      rate_unit_code: rate?.rate_unit_code ?? "",
      area_unit_code: rate?.area_unit_code ?? "",
      spacing_row_cm: rate?.spacing_row_cm ?? "",
      spacing_plant_cm: rate?.spacing_plant_cm ?? "",
      region_scope: rate?.region_scope ?? "all",
      region_ids: rate?.region_ids ?? [],
      source_id: rate ? String(rate.source_id) : "",
      notes: rate?.notes ?? "",
      is_active: rate?.is_active ?? false,
    },
    mode: "onTouched",
  });
  const busy = pending || isSubmitting,
    locked = !!record?.is_active && !canReview;
  const crop = useWatch({ control, name: "crop_id" }),
    variety = useWatch({ control, name: "crop_variety_id" }),
    seedId = useWatch({ control, name: "seed_id" }),
    material = useWatch({ control, name: "material_type" }),
    scope = useWatch({ control, name: "region_scope" }),
    notes = useWatch({ control, name: "notes" });
  const sameCrop = crop === (rate ? String(rate.crop_id) : ""),
    seed = selectedSeed?.id === Number(seedId) ? selectedSeed : null;
  const units = [
    "seed",
    "tuber",
    "bulb",
    "clove",
    "rhizome",
    "sett",
    "corm",
    "other",
  ].includes(material)
    ? ["g", "kg", "piece"]
    : material
      ? ["piece", "plant"]
      : ["g", "kg", "piece", "plant"];
  const validId = (value: string) =>
    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
    t("validation.selection");
  function decimal(
    value: string,
    places: number,
    digits: number,
    zero: boolean,
  ) {
    return (
      (new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(value) &&
        value.split(".")[0].replace(/^0+/, "").length <= digits &&
        (zero || /[1-9]/.test(value))) ||
      t(
        places === 2
          ? "validation.spacing"
          : zero
            ? "validation.bound"
            : "validation.recommended",
      )
    );
  }
  function submit(values: CropSeedRateFormValues) {
    if (saving.current || locked) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const result = await saveCropSeedRate(record?.id ?? null, {
          crop_id: Number(values.crop_id),
          crop_variety_id: values.crop_variety_id
            ? Number(values.crop_variety_id)
            : null,
          seed_id: values.seed_id ? Number(values.seed_id) : null,
          season_id: values.season_id ? Number(values.season_id) : null,
          material_type:
            values.material_type as CropSeedRatePayload["material_type"],
          sowing_method: (values.sowing_method ||
            null) as CropSeedRatePayload["sowing_method"],
          irrigation_condition: (values.irrigation_condition ||
            null) as CropSeedRatePayload["irrigation_condition"],
          rate_basis: values.rate_basis as "per_area",
          rate_min: values.rate_min || null,
          rate_recommended: values.rate_recommended,
          rate_max: values.rate_max || null,
          rate_unit_code:
            values.rate_unit_code as CropSeedRatePayload["rate_unit_code"],
          area_unit_code:
            values.area_unit_code as CropSeedRatePayload["area_unit_code"],
          spacing_row_cm: values.spacing_row_cm || null,
          spacing_plant_cm: values.spacing_plant_cm || null,
          notes: values.notes.trim() || null,
          source_id: Number(values.source_id),
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
              setError(field as keyof CropSeedRateFormValues, {
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
        setSelectedSeed(result.data.seed);
        reset({ ...values, is_active: result.data.is_active });
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/crop-seed-rates");
      } catch {
        setFailure(t("feedback.failed"));
        toast.error(t("feedback.failed"));
      } finally {
        saving.current = false;
      }
    });
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
            <div className="grid gap-4 md:grid-cols-2">
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
                    id="rate-crop"
                    label={t("fields.crop_id")}
                    value={field.value}
                    onChange={(value) => {
                      if (saving.current || value === field.value) return;
                      field.onChange(value);
                      setValue("crop_variety_id", "", { shouldDirty: true });
                      setValue("seed_id", "", { shouldDirty: true });
                      setSelectedSeed(null);
                      clearErrors(["crop_variety_id", "seed_id"]);
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
                    id="rate-variety"
                    label={t("fields.crop_variety_id")}
                    value={field.value}
                    onChange={(value) => {
                      if (saving.current || value === field.value) return;
                      field.onChange(value);
                      if (
                        seedId &&
                        (!seed ||
                          (value &&
                            seed.crop_variety_id !== null &&
                            seed.crop_variety_id !== Number(value)))
                      ) {
                        setValue("seed_id", "", { shouldDirty: true });
                        setSelectedSeed(null);
                        clearErrors("seed_id");
                      }
                    }}
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
                name="seed_id"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!value) return true;
                    if (validId(value) !== true)
                      return t("validation.selection");
                    if (
                      seed &&
                      (seed.crop_id !== Number(getValues("crop_id")) ||
                        (getValues("crop_variety_id") &&
                          seed.crop_variety_id !== null &&
                          seed.crop_variety_id !==
                            Number(getValues("crop_variety_id"))))
                    )
                      return t("validation.seed");
                    return true;
                  },
                }}
                render={({ field }) => (
                  <TimelineRelationSelect
                    key={`seed-${crop}-${variety}`}
                    kind="seed"
                    id="rate-seed"
                    label={t("fields.seed_id")}
                    value={field.value}
                    onChange={field.onChange}
                    onSelectionChange={(option) => {
                      setSelectedSeed(option?.seed ?? null);
                      if (option?.seed && !getValues("material_type"))
                        setValue("material_type", option.seed.material_type, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                    }}
                    cropId={crop ? Number(crop) : null}
                    seedVarietyId={variety ? Number(variety) : null}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    initialPage={sameCrop ? choices.seed : undefined}
                    initialSelection={sameCrop ? selections.seed : null}
                    disabled={busy || locked || !crop}
                    eligible
                    placeholder={t("form.selectSeed")}
                    emptyLabel={t("general")}
                    error={errors.seed_id?.message}
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
                    id="rate-season"
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
            <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
              {t("form.seedHelp")}
            </p>
          </ComponentCard>
          <ComponentCard
            className={card}
            title={
              <span className="flex items-center gap-3">
                <SproutIcon
                  aria-hidden="true"
                  className="text-brand-500 size-6"
                />
                {t("form.cultivation")}
              </span>
            }
            desc={t("form.cultivationDescription")}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FilterSelect
                  {...register("material_type", {
                    required: t("validation.required"),
                    deps: "rate_unit_code",
                    validate: {
                      supported: (value) =>
                        materialTypes.some((type) => type === value) ||
                        t("validation.selection"),
                      seed: (value) =>
                        !seed ||
                        seed.material_type === value ||
                        t("validation.material"),
                    },
                    onChange: (event) => {
                      const value = event.target.value;
                      const allowed = [
                        "seed",
                        "tuber",
                        "bulb",
                        "clove",
                        "rhizome",
                        "sett",
                        "corm",
                        "other",
                      ].includes(value)
                        ? ["g", "kg", "piece"]
                        : ["piece", "plant"];
                      if (!allowed.includes(getValues("rate_unit_code")))
                        setValue("rate_unit_code", "", { shouldDirty: true });
                    },
                  })}
                  id="rate-material"
                  label={`${t("fields.material_type")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.material_type}
                  aria-describedby="rate-material-error"
                >
                  <option value="">{t("form.selectMaterial")}</option>
                  {materialTypes.map((type) => (
                    <option key={type} value={type}>
                      {ts(`materials.${type}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p id="rate-material-error" role="alert" className={errorClass}>
                  {errors.material_type?.message}
                </p>
              </div>
              <div>
                <FilterSelect
                  {...register("sowing_method", {
                    validate: (value) =>
                      !value ||
                      rateSowingMethods.some((method) => method === value) ||
                      t("validation.selection"),
                  })}
                  id="rate-sowing"
                  label={t("fields.sowing_method")}
                  aria-invalid={!!errors.sowing_method}
                  aria-describedby="rate-sowing-error"
                >
                  <option value="">{t("form.selectSowing")}</option>
                  {rateSowingMethods.map((method) => (
                    <option key={method} value={method}>
                      {t(`sowing.${method}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p id="rate-sowing-error" role="alert" className={errorClass}>
                  {errors.sowing_method?.message}
                </p>
              </div>
              <div>
                <FilterSelect
                  {...register("irrigation_condition", {
                    validate: (value) =>
                      !value ||
                      rateIrrigationConditions.some(
                        (condition) => condition === value,
                      ) ||
                      t("validation.selection"),
                  })}
                  id="rate-irrigation"
                  label={t("fields.irrigation_condition")}
                  aria-invalid={!!errors.irrigation_condition}
                  aria-describedby="rate-irrigation-error"
                >
                  <option value="">{t("form.selectIrrigation")}</option>
                  {rateIrrigationConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {t(`irrigation.${condition}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p
                  id="rate-irrigation-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.irrigation_condition?.message}
                </p>
              </div>
            </div>
          </ComponentCard>
          <ComponentCard
            className={card}
            title={
              <span className="flex items-center gap-3">
                <ListIcon
                  aria-hidden="true"
                  className="text-brand-500 size-6"
                />
                {t("form.recommendation")}
              </span>
            }
            desc={t("form.recommendationDescription")}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FilterSelect
                  {...register("rate_basis", {
                    validate: (value) =>
                      value === "per_area" || t("validation.selection"),
                  })}
                  id="rate-basis"
                  label={t("fields.rate_basis")}
                  aria-invalid={!!errors.rate_basis}
                  aria-describedby="rate-basis-error"
                >
                  <option value="per_area">{t("perArea")}</option>
                </FilterSelect>
                <p id="rate-basis-error" role="alert" className={errorClass}>
                  {errors.rate_basis?.message}
                </p>
              </div>
              <div>
                <FilterSelect
                  {...register("area_unit_code", {
                    required: t("validation.required"),
                    validate: (value) =>
                      rateAreaUnits.some((unit) => unit === value) ||
                      t("validation.selection"),
                  })}
                  id="rate-area"
                  label={`${t("fields.area_unit_code")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.area_unit_code}
                  aria-describedby="rate-area-error"
                >
                  <option value="">{t("form.selectArea")}</option>
                  {rateAreaUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {t(`areaUnits.${unit}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p id="rate-area-error" role="alert" className={errorClass}>
                  {errors.area_unit_code?.message}
                </p>
              </div>
              <div>
                <FilterSelect
                  {...register("rate_unit_code", {
                    required: t("validation.required"),
                    validate: (value) =>
                      units.includes(value) || t("validation.unit"),
                  })}
                  id="rate-unit"
                  label={`${t("fields.rate_unit_code")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.rate_unit_code}
                  aria-describedby="rate-unit-error"
                >
                  <option value="">{t("form.selectUnit")}</option>
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {ts(`units.${unit}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p id="rate-unit-error" role="alert" className={errorClass}>
                  {errors.rate_unit_code?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="rate-min">{t("fields.rate_min")}</Label>
                <Input
                  {...register("rate_min", {
                    validate: {
                      decimal: (value) => !value || decimal(value, 4, 10, true),
                      order: (value) =>
                        !value ||
                        !getValues("rate_recommended") ||
                        Number(value) <=
                          Number(getValues("rate_recommended")) ||
                        t("validation.minimum"),
                    },
                  })}
                  id="rate-min"
                  inputMode="decimal"
                  placeholder={t("form.minPlaceholder")}
                  aria-invalid={!!errors.rate_min}
                  aria-describedby="rate-min-error"
                  error={!!errors.rate_min}
                />
                <p id="rate-min-error" role="alert" className={errorClass}>
                  {errors.rate_min?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="rate-recommended">
                  {t("fields.rate_recommended")} *
                </Label>
                <Input
                  {...register("rate_recommended", {
                    required: t("validation.required"),
                    deps: ["rate_min", "rate_max"],
                    validate: (value) => decimal(value, 4, 10, false),
                  })}
                  id="rate-recommended"
                  inputMode="decimal"
                  placeholder={t("form.recommendedPlaceholder")}
                  aria-required="true"
                  aria-invalid={!!errors.rate_recommended}
                  aria-describedby="rate-recommended-error"
                  error={!!errors.rate_recommended}
                />
                <p
                  id="rate-recommended-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.rate_recommended?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="rate-max">{t("fields.rate_max")}</Label>
                <Input
                  {...register("rate_max", {
                    validate: {
                      decimal: (value) => !value || decimal(value, 4, 10, true),
                      order: (value) =>
                        !value ||
                        !getValues("rate_recommended") ||
                        Number(value) >=
                          Number(getValues("rate_recommended")) ||
                        t("validation.maximum"),
                    },
                  })}
                  id="rate-max"
                  inputMode="decimal"
                  placeholder={t("form.maxPlaceholder")}
                  aria-invalid={!!errors.rate_max}
                  aria-describedby="rate-max-error"
                  error={!!errors.rate_max}
                />
                <p id="rate-max-error" role="alert" className={errorClass}>
                  {errors.rate_max?.message}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="rate-row-spacing">
                  {t("fields.spacing_row_cm")}
                </Label>
                <Input
                  {...register("spacing_row_cm", {
                    validate: (value) => !value || decimal(value, 2, 8, false),
                  })}
                  id="rate-row-spacing"
                  inputMode="decimal"
                  placeholder={t("form.rowPlaceholder")}
                  aria-invalid={!!errors.spacing_row_cm}
                  aria-describedby="rate-row-spacing-error"
                  error={!!errors.spacing_row_cm}
                />
                <p
                  id="rate-row-spacing-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.spacing_row_cm?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="rate-plant-spacing">
                  {t("fields.spacing_plant_cm")}
                </Label>
                <Input
                  {...register("spacing_plant_cm", {
                    validate: (value) => !value || decimal(value, 2, 8, false),
                  })}
                  id="rate-plant-spacing"
                  inputMode="decimal"
                  placeholder={t("form.plantPlaceholder")}
                  aria-invalid={!!errors.spacing_plant_cm}
                  aria-describedby="rate-plant-spacing-error"
                  error={!!errors.spacing_plant_cm}
                />
                <p
                  id="rate-plant-spacing-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.spacing_plant_cm?.message}
                </p>
              </div>
            </div>
          </ComponentCard>
          <ComponentCard
            className={card}
            title={
              <span className="flex items-center gap-3">
                <DocsIcon
                  aria-hidden="true"
                  className="text-brand-500 size-6"
                />
                {t("fields.notes")}
              </span>
            }
            desc={t("form.notesDescription")}
          >
            <Label htmlFor="rate-notes" className="sr-only">
              {t("fields.notes")}
            </Label>
            <textarea
              {...register("notes", {
                maxLength: {
                  value: 65535,
                  message: t("validation.max", { count: 65535 }),
                },
              })}
              id="rate-notes"
              maxLength={65535}
              rows={4}
              placeholder={t("form.notesPlaceholder")}
              aria-invalid={!!errors.notes}
              aria-describedby="rate-notes-error"
              className="focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-gray-100"
            />
            <p id="rate-notes-error" role="alert" className={errorClass}>
              {errors.notes?.message}
            </p>
            <p className="text-end text-xs text-gray-500 dark:text-gray-400">
              {t("form.characterCount", { count: notes.length, max: 65535 })}
            </p>
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
                tr("validation.districts"),
            }}
            render={({ field }) => (
              <RegionScopeSelector
                scope={scope}
                scopeInput={register("region_scope", {
                  required: tr("validation.scope"),
                  validate: (value) =>
                    value === "all" ||
                    value === "specific" ||
                    tr("validation.scope"),
                  onChange: (event) => {
                    if (event.target.value === "all")
                      setValue("region_ids", [], {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
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
          <ComponentCard className={card} title={t("form.publication")}>
            <div className="grid gap-4 2xl:grid-cols-3">
              <div className="min-w-0 2xl:col-span-2">
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
                      id="rate-source"
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
              </div>
              <div className="space-y-3">
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
                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {t(canReview ? "form.activeHelp" : "form.reviewHelp")}
                </p>
              </div>
            </div>
          </ComponentCard>
        </aside>
      </div>
      <div className="shadow-theme-xs flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!saving.current) router.push("/admin/crop-seed-rates");
          }}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
        >
          {t("back")}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!saving.current) router.push("/admin/crop-seed-rates");
            }}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            {t("cancel")}
          </button>
          {!locked && (
            <button
              type="submit"
              disabled={busy}
              className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckLineIcon aria-hidden="true" className="size-5" />
              {t(busy ? "saving" : record ? "form.update" : "form.save")}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
