"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Switch from "@/components/admin/form/switch/Switch";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import {
  materialTypes,
  seedTypes,
  propagationMethods,
  seedClasses,
  treatmentStatuses,
  seedUnitCodes,
  type Seed,
  type SeedBasicValues,
  type SeedBasicPayload,
} from "@/types/admin/seed";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import type { ActionResult } from "@/types/api";

const card = "rounded-xl shadow-theme-xs [&>div:first-child]:py-4";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function Step1BasicDetails({
  seed,
  choices,
  selections,
  busy,
  onDirty,
  onSave,
}: {
  seed: Seed | null;
  choices: TimelineChoices;
  selections: TimelineSelections;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (values: SeedBasicPayload) => Promise<ActionResult<Seed>>;
}) {
  const t = useTranslations("seeds");
  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    getValues,
    setError,
    formState: { errors, isDirty },
  } = useForm<SeedBasicValues>({
    defaultValues: {
      crop_id: seed ? String(seed.crop_id) : "",
      crop_variety_id: seed?.crop_variety_id
        ? String(seed.crop_variety_id)
        : "",
      name: seed?.translations[routing.defaultLocale]?.name ?? "",
      slug: seed?.slug ?? "",
      sku: seed?.sku ?? "",
      brand_name: seed?.brand_name ?? "",
      producer_name: seed?.producer_name ?? "",
      material_type: seed?.material_type ?? "seed",
      seed_type: seed?.seed_type ?? "",
      propagation_method: seed?.propagation_method ?? "",
      seed_class: seed?.seed_class ?? "",
      treatment_status: seed?.treatment_status ?? "unknown",
      default_unit_code: seed?.default_unit_code ?? "",
      reference_pack_quantity: seed?.reference_pack_quantity ?? "",
      reference_pack_unit_code: seed?.reference_pack_unit_code ?? "",
      germination_reference_pct: seed?.germination_reference_pct ?? "",
      purity_reference_pct: seed?.purity_reference_pct ?? "",
      seeds_per_gram: seed?.seeds_per_gram ?? "",
      is_f1_hybrid: seed?.is_f1_hybrid ?? null,
      is_organic: seed?.is_organic ?? null,
      is_pelleted: seed?.is_pelleted ?? null,
    },
    mode: "onTouched",
  });
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  const crop = useWatch({ control, name: "crop_id" }),
    material = useWatch({ control, name: "material_type" });
  const packQuantity = useWatch({ control, name: "reference_pack_quantity" });
  const isSeed = material === "seed";
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
    : ["piece", "plant"];
  const sameCrop = crop === (seed ? String(seed.crop_id) : "");
  const validId = (value: string) =>
    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
    t("validation.selection");
  function decimal(
    value: string,
    places: number,
    maximum: number,
    zero: boolean,
  ) {
    if (value === "") return true;
    return (
      (new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(value) &&
        Number(value) <= maximum &&
        (zero ? Number(value) >= 0 : Number(value) > 0)) ||
      t("validation.decimal", { places, max: maximum })
    );
  }
  async function submit(values: SeedBasicValues) {
    const response = await onSave({
      crop_id: Number(values.crop_id),
      crop_variety_id: values.crop_variety_id
        ? Number(values.crop_variety_id)
        : null,
      name: values.name.trim(),
      slug: values.slug.trim(),
      sku: values.sku.trim() || null,
      brand_name: values.brand_name.trim() || null,
      producer_name: values.producer_name.trim() || null,
      material_type: values.material_type as SeedBasicPayload["material_type"],
      seed_type: isSeed
        ? ((values.seed_type || null) as SeedBasicPayload["seed_type"])
        : null,
      seed_class: isSeed
        ? ((values.seed_class || null) as SeedBasicPayload["seed_class"])
        : null,
      propagation_method: (values.propagation_method ||
        null) as SeedBasicPayload["propagation_method"],
      treatment_status:
        values.treatment_status as SeedBasicPayload["treatment_status"],
      default_unit_code:
        values.default_unit_code as SeedBasicPayload["default_unit_code"],
      reference_pack_quantity: values.reference_pack_quantity || null,
      reference_pack_unit_code: (values.reference_pack_unit_code ||
        null) as SeedBasicPayload["reference_pack_unit_code"],
      germination_reference_pct: isSeed
        ? values.germination_reference_pct || null
        : null,
      purity_reference_pct: values.purity_reference_pct || null,
      seeds_per_gram: isSeed ? values.seeds_per_gram || null : null,
      is_f1_hybrid: isSeed ? values.is_f1_hybrid : null,
      is_organic: values.is_organic,
      is_pelleted: isSeed ? values.is_pelleted : null,
    });
    for (const [field, messages] of Object.entries(response.errors ?? {}))
      if (Object.hasOwn(values, field) && messages[0])
        setError(field as keyof SeedBasicValues, {
          type: "server",
          message: messages[0],
        });
  }
  return (
    <form
      id="seed-step-1"
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-busy={busy}
    >
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <legend className="sr-only">{t("wizard.step1")}</legend>
        <ComponentCard
          title={t("basic.title")}
          desc={t("basic.description")}
          className={card}
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Controller
              name="crop_id"
              control={control}
              rules={{ required: t("validation.selection"), validate: validId }}
              render={({ field }) => (
                <TimelineRelationSelect
                  kind="crop"
                  id="seed-crop"
                  label={t("fields.crop_id")}
                  value={field.value}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  required
                  eligible
                  disabled={busy}
                  initialPage={choices.crop}
                  initialSelection={selections.crop}
                  error={errors.crop_id?.message}
                  onChange={(value) => {
                    if (busy || field.value === value) return;
                    field.onChange(value);
                    setValue("crop_variety_id", "", { shouldDirty: true });
                    clearErrors("crop_variety_id");
                  }}
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
                  id="seed-variety"
                  label={t("fields.crop_variety_id")}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  cropId={crop ? Number(crop) : null}
                  eligible
                  disabled={busy || !crop}
                  initialPage={sameCrop ? choices.variety : undefined}
                  initialSelection={sameCrop ? selections.variety : null}
                  error={errors.crop_variety_id?.message}
                />
              )}
            />
            <div>
              <Label htmlFor="seed-name">{t("fields.name")} *</Label>
              <Input
                {...register("name", {
                  required: t("validation.required"),
                  maxLength: {
                    value: 200,
                    message: t("validation.max", { count: 200 }),
                  },
                  validate: (value) =>
                    !!value.trim() || t("validation.required"),
                })}
                id="seed-name"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby="seed-name-error"
                error={!!errors.name}
                placeholder={t("placeholders.name")}
              />
              <p id="seed-name-error" role="alert" className={errorClass}>
                {errors.name?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="seed-slug">{t("fields.slug")} *</Label>
              <Input
                {...register("slug", {
                  required: t("validation.required"),
                  maxLength: {
                    value: 220,
                    message: t("validation.max", { count: 220 }),
                  },
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message: t("validation.slug"),
                  },
                })}
                id="seed-slug"
                aria-required="true"
                aria-invalid={!!errors.slug}
                aria-describedby="seed-slug-error"
                error={!!errors.slug}
                placeholder={t("placeholders.slug")}
              />
              <p id="seed-slug-error" role="alert" className={errorClass}>
                {errors.slug?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="seed-sku">{t("fields.sku")}</Label>
              <Input
                {...register("sku", {
                  maxLength: {
                    value: 100,
                    message: t("validation.max", { count: 100 }),
                  },
                })}
                id="seed-sku"
                aria-invalid={!!errors.sku}
                aria-describedby="seed-sku-error"
                error={!!errors.sku}
                placeholder={t("placeholders.sku")}
              />
              <p id="seed-sku-error" role="alert" className={errorClass}>
                {errors.sku?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="seed-brand">{t("fields.brand_name")}</Label>
              <Input
                {...register("brand_name", {
                  maxLength: {
                    value: 150,
                    message: t("validation.max", { count: 150 }),
                  },
                })}
                id="seed-brand"
                aria-invalid={!!errors.brand_name}
                aria-describedby="seed-brand-error"
                error={!!errors.brand_name}
                placeholder={t("placeholders.brand")}
              />
              <p id="seed-brand-error" role="alert" className={errorClass}>
                {errors.brand_name?.message}
              </p>
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <Label htmlFor="seed-producer">{t("fields.producer_name")}</Label>
              <Input
                {...register("producer_name", {
                  maxLength: {
                    value: 200,
                    message: t("validation.max", { count: 200 }),
                  },
                })}
                id="seed-producer"
                aria-invalid={!!errors.producer_name}
                aria-describedby="seed-producer-error"
                error={!!errors.producer_name}
                placeholder={t("placeholders.producer")}
              />
              <p id="seed-producer-error" role="alert" className={errorClass}>
                {errors.producer_name?.message}
              </p>
            </div>
          </div>
        </ComponentCard>
        <ComponentCard
          title={t("classification.title")}
          desc={t("classification.description")}
          className={card}
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FilterSelect
                {...register("material_type", {
                  required: t("validation.selection"),
                  validate: (value) =>
                    materialTypes.some((type) => type === value) ||
                    t("validation.selection"),
                })}
                id="seed-material"
                label={`${t("fields.material_type")} *`}
                aria-required="true"
                aria-invalid={!!errors.material_type}
                aria-describedby="seed-material-error"
              >
                {materialTypes.map((value) => (
                  <option key={value} value={value}>
                    {t(`materials.${value}`)}
                  </option>
                ))}
              </FilterSelect>
              <p id="seed-material-error" role="alert" className={errorClass}>
                {errors.material_type?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("seed_type", {
                  validate: (value) =>
                    !isSeed ||
                    !value ||
                    seedTypes.some((type) => type === value) ||
                    t("validation.selection"),
                })}
                id="seed-type"
                label={t("fields.seed_type")}
                disabled={!isSeed || busy}
                aria-invalid={!!errors.seed_type}
                aria-describedby="seed-type-error"
              >
                <option value="">{t("optional")}</option>
                {seedTypes.map((value) => (
                  <option key={value} value={value}>
                    {t(`seedTypes.${value}`)}
                  </option>
                ))}
              </FilterSelect>
              <p id="seed-type-error" role="alert" className={errorClass}>
                {errors.seed_type?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("propagation_method", {
                  validate: (value) =>
                    !value ||
                    propagationMethods.some((type) => type === value) ||
                    t("validation.selection"),
                })}
                id="seed-propagation"
                label={t("fields.propagation_method")}
                aria-invalid={!!errors.propagation_method}
                aria-describedby="seed-propagation-error"
              >
                <option value="">{t("optional")}</option>
                {propagationMethods.map((value) => (
                  <option key={value} value={value}>
                    {t(`propagation.${value}`)}
                  </option>
                ))}
              </FilterSelect>
              <p
                id="seed-propagation-error"
                role="alert"
                className={errorClass}
              >
                {errors.propagation_method?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("seed_class", {
                  validate: (value) =>
                    !isSeed ||
                    !value ||
                    seedClasses.some((type) => type === value) ||
                    t("validation.selection"),
                })}
                id="seed-class"
                label={t("fields.seed_class")}
                disabled={!isSeed || busy}
                aria-invalid={!!errors.seed_class}
                aria-describedby="seed-class-error"
              >
                <option value="">{t("optional")}</option>
                {seedClasses.map((value) => (
                  <option key={value} value={value}>
                    {t(`classes.${value}`)}
                  </option>
                ))}
              </FilterSelect>
              <p id="seed-class-error" role="alert" className={errorClass}>
                {errors.seed_class?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("treatment_status", {
                  required: t("validation.selection"),
                  validate: (value) =>
                    treatmentStatuses.some((type) => type === value) ||
                    t("validation.selection"),
                })}
                id="seed-treatment"
                label={`${t("fields.treatment_status")} *`}
                aria-required="true"
                aria-invalid={!!errors.treatment_status}
                aria-describedby="seed-treatment-error"
              >
                {treatmentStatuses.map((value) => (
                  <option key={value} value={value}>
                    {t(`treatments.${value}`)}
                  </option>
                ))}
              </FilterSelect>
              <p id="seed-treatment-error" role="alert" className={errorClass}>
                {errors.treatment_status?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("default_unit_code", {
                  required: t("validation.selection"),
                  validate: (value) =>
                    units.includes(value) || t("validation.unit"),
                })}
                id="seed-unit"
                label={`${t("fields.default_unit_code")} *`}
                aria-required="true"
                aria-invalid={!!errors.default_unit_code}
                aria-describedby="seed-unit-error"
              >
                <option value="">{t("selectUnit")}</option>
                {seedUnitCodes
                  .filter((value) => units.includes(value))
                  .map((value) => (
                    <option key={value} value={value}>
                      {t(`units.${value}`)}
                    </option>
                  ))}
              </FilterSelect>
              <p id="seed-unit-error" role="alert" className={errorClass}>
                {errors.default_unit_code?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="seed-pack-quantity">
                {t("fields.reference_pack_quantity")}
              </Label>
              <Input
                {...register("reference_pack_quantity", {
                  validate: {
                    number: (value) =>
                      decimal(value, 4, 9999999999.9999, false),
                    paired: (value) =>
                      !!value === !!getValues("reference_pack_unit_code") ||
                      t("validation.pack"),
                  },
                })}
                id="seed-pack-quantity"
                type="number"
                step={0.0001}
                min={0}
                aria-invalid={!!errors.reference_pack_quantity}
                aria-describedby="seed-pack-quantity-error"
                error={!!errors.reference_pack_quantity}
                placeholder={t("placeholders.quantity")}
              />
              <p
                id="seed-pack-quantity-error"
                role="alert"
                className={errorClass}
              >
                {errors.reference_pack_quantity?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("reference_pack_unit_code", {
                  validate: (value) =>
                    (!value && !packQuantity) ||
                    (units.includes(value) && !!packQuantity) ||
                    t("validation.pack"),
                })}
                id="seed-pack-unit"
                label={t("fields.reference_pack_unit_code")}
                aria-invalid={!!errors.reference_pack_unit_code}
                aria-describedby="seed-pack-unit-error"
              >
                <option value="">{t("optional")}</option>
                {seedUnitCodes
                  .filter((value) => units.includes(value))
                  .map((value) => (
                    <option key={value} value={value}>
                      {t(`units.${value}`)}
                    </option>
                  ))}
              </FilterSelect>
              <p id="seed-pack-unit-error" role="alert" className={errorClass}>
                {errors.reference_pack_unit_code?.message}
              </p>
            </div>
          </div>
        </ComponentCard>
        <ComponentCard
          title={t("quality.title")}
          desc={t("quality.description")}
          className={card}
        >
          {!isSeed && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("quality.nonSeed")}
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <Label htmlFor="seed-germination">
                {t("fields.germination_reference_pct")}
              </Label>
              <Input
                {...register("germination_reference_pct", {
                  validate: (value) => !isSeed || decimal(value, 2, 100, true),
                })}
                id="seed-germination"
                type="number"
                min={0}
                max={100}
                step={0.01}
                disabled={!isSeed || busy}
                aria-invalid={!!errors.germination_reference_pct}
                aria-describedby="seed-germination-error"
                error={!!errors.germination_reference_pct}
                placeholder={t("placeholders.germination")}
              />
              <p
                id="seed-germination-error"
                role="alert"
                className={errorClass}
              >
                {errors.germination_reference_pct?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="seed-purity">
                {t("fields.purity_reference_pct")}
              </Label>
              <Input
                {...register("purity_reference_pct", {
                  validate: (value) => decimal(value, 2, 100, true),
                })}
                id="seed-purity"
                type="number"
                min={0}
                max={100}
                step={0.01}
                aria-invalid={!!errors.purity_reference_pct}
                aria-describedby="seed-purity-error"
                error={!!errors.purity_reference_pct}
                placeholder={t("placeholders.purity")}
              />
              <p id="seed-purity-error" role="alert" className={errorClass}>
                {errors.purity_reference_pct?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="seed-per-gram">
                {t("fields.seeds_per_gram")}
              </Label>
              <Input
                {...register("seeds_per_gram", {
                  validate: (value) =>
                    !isSeed || decimal(value, 3, 999999999.999, false),
                })}
                id="seed-per-gram"
                type="number"
                min={0}
                step={0.001}
                disabled={!isSeed || busy}
                aria-invalid={!!errors.seeds_per_gram}
                aria-describedby="seed-per-gram-error"
                error={!!errors.seeds_per_gram}
                placeholder={t("placeholders.seedsPerGram")}
              />
              <p id="seed-per-gram-error" role="alert" className={errorClass}>
                {errors.seeds_per_gram?.message}
              </p>
            </div>
          </div>
          <div className="grid gap-5 border-t border-gray-100 pt-4 md:grid-cols-3 dark:border-gray-800">
            <Controller
              name="is_f1_hybrid"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Switch
                    checked={field.value ?? false}
                    disabled={!isSeed || busy}
                    onChange={field.onChange}
                    label={t("fields.is_f1_hybrid")}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      field.value === null
                        ? "unknown"
                        : field.value
                          ? "yes"
                          : "no",
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={busy || !isSeed || field.value === null}
                    onClick={() => field.onChange(null)}
                    className="text-brand-500 text-xs disabled:opacity-40"
                  >
                    {t("setUnknown")}
                  </button>
                  <p role="alert" className={errorClass}>
                    {errors.is_f1_hybrid?.message}
                  </p>
                </div>
              )}
            />
            <Controller
              name="is_organic"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Switch
                    checked={field.value ?? false}
                    disabled={busy}
                    onChange={field.onChange}
                    label={t("fields.is_organic")}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      field.value === null
                        ? "unknown"
                        : field.value
                          ? "yes"
                          : "no",
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={busy || field.value === null}
                    onClick={() => field.onChange(null)}
                    className="text-brand-500 text-xs disabled:opacity-40"
                  >
                    {t("setUnknown")}
                  </button>
                  <p role="alert" className={errorClass}>
                    {errors.is_organic?.message}
                  </p>
                </div>
              )}
            />
            <Controller
              name="is_pelleted"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Switch
                    checked={field.value ?? false}
                    disabled={!isSeed || busy}
                    onChange={field.onChange}
                    label={t("fields.is_pelleted")}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      field.value === null
                        ? "unknown"
                        : field.value
                          ? "yes"
                          : "no",
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={busy || !isSeed || field.value === null}
                    onClick={() => field.onChange(null)}
                    className="text-brand-500 text-xs disabled:opacity-40"
                  >
                    {t("setUnknown")}
                  </button>
                  <p role="alert" className={errorClass}>
                    {errors.is_pelleted?.message}
                  </p>
                </div>
              )}
            />
          </div>
        </ComponentCard>
      </fieldset>
    </form>
  );
}
