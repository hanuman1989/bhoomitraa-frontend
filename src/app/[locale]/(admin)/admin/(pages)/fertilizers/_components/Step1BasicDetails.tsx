"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import {
  fertilizerTypes,
  fertilizerForms,
  fertilizerUnitCodes,
  fertilizerApplicationMethods,
  type Fertilizer,
  type FertilizerBasicValues,
  type FertilizerBasicPayload,
} from "@/types/admin/fertilizer";
import type { ActionResult } from "@/types/api";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function Step1BasicDetails({
  fertilizer,
  busy,
  onDirty,
  onSave,
}: {
  fertilizer: Fertilizer | null;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (values: FertilizerBasicPayload) => Promise<ActionResult<Fertilizer>>;
}) {
  const t = useTranslations("fertilizers");
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isDirty },
  } = useForm<FertilizerBasicValues>({
    defaultValues: {
      name: fertilizer?.translations[routing.defaultLocale]?.name ?? "",
      slug: fertilizer?.slug ?? "",
      fertilizer_code: fertilizer?.fertilizer_code ?? "",
      fertilizer_type: fertilizer?.fertilizer_type ?? "",
      form: fertilizer?.form ?? "",
      grade: fertilizer?.grade ?? "",
      brand_name: fertilizer?.brand_name ?? "",
      manufacturer_name: fertilizer?.manufacturer_name ?? "",
      default_unit_code: fertilizer?.default_unit_code ?? "",
      reference_pack_quantity: fertilizer?.reference_pack_quantity ?? "",
      reference_pack_unit_code: fertilizer?.reference_pack_unit_code ?? "",
      application_method: fertilizer?.application_method ?? "",
    },
    mode: "onTouched",
  });
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  async function submit(values: FertilizerBasicValues) {
    if (busy) return;
    const result = await onSave({
      name: values.name.trim(),
      slug: values.slug.trim(),
      fertilizer_code: values.fertilizer_code.trim() || null,
      fertilizer_type:
        values.fertilizer_type as FertilizerBasicPayload["fertilizer_type"],
      form: values.form as FertilizerBasicPayload["form"],
      grade: values.grade.trim() || null,
      brand_name: values.brand_name.trim() || null,
      manufacturer_name: values.manufacturer_name.trim() || null,
      default_unit_code:
        values.default_unit_code as FertilizerBasicPayload["default_unit_code"],
      reference_pack_quantity: values.reference_pack_quantity || null,
      reference_pack_unit_code: (values.reference_pack_unit_code ||
        null) as FertilizerBasicPayload["reference_pack_unit_code"],
      application_method: (values.application_method ||
        null) as FertilizerBasicPayload["application_method"],
    });
    for (const [field, messages] of Object.entries(result.errors ?? {}))
      if (Object.hasOwn(values, field) && messages[0])
        setError(field as keyof FertilizerBasicValues, {
          type: "server",
          message: messages[0],
        });
  }
  return (
    <form
      id="fertilizer-step-1"
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-busy={busy}
    >
      <fieldset
        disabled={busy}
        className="grid min-w-0 items-start gap-5 xl:grid-cols-3"
      >
        <legend className="sr-only">{t("wizard.step1")}</legend>
        <ComponentCard
          title={t("basic.title")}
          desc={t("basic.description")}
          className="shadow-theme-xs rounded-xl xl:col-span-2 [&_h3]:text-xl [&_h3]:font-semibold"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="fertilizer-name">{t("fields.name")} *</Label>
              <Input
                {...register("name", {
                  required: t("validation.required"),
                  validate: (value) =>
                    !!value.trim() || t("validation.required"),
                  maxLength: {
                    value: 200,
                    message: t("validation.max", { count: 200 }),
                  },
                })}
                id="fertilizer-name"
                maxLength={200}
                lang={routing.defaultLocale}
                placeholder={t("basic.namePlaceholder")}
                error={!!errors.name}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby="fertilizer-name-error"
              />
              <p id="fertilizer-name-error" role="alert" className={errorClass}>
                {errors.name?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="fertilizer-slug">{t("fields.slug")} *</Label>
              <Input
                {...register("slug", {
                  required: t("validation.required"),
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message: t("validation.slug"),
                  },
                  maxLength: {
                    value: 220,
                    message: t("validation.max", { count: 220 }),
                  },
                })}
                id="fertilizer-slug"
                maxLength={220}
                placeholder={t("basic.slugPlaceholder")}
                error={!!errors.slug}
                aria-required="true"
                aria-invalid={!!errors.slug}
                aria-describedby="fertilizer-slug-error"
              />
              <p id="fertilizer-slug-error" role="alert" className={errorClass}>
                {errors.slug?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="fertilizer-code">
                {t("fields.fertilizer_code")}
              </Label>
              <Input
                {...register("fertilizer_code", {
                  maxLength: {
                    value: 100,
                    message: t("validation.max", { count: 100 }),
                  },
                })}
                id="fertilizer-code"
                maxLength={100}
                placeholder={t("basic.codePlaceholder")}
                error={!!errors.fertilizer_code}
                aria-invalid={!!errors.fertilizer_code}
                aria-describedby="fertilizer-code-error"
              />
              <p id="fertilizer-code-error" role="alert" className={errorClass}>
                {errors.fertilizer_code?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("fertilizer_type", {
                  required: t("validation.required"),
                  validate: (value) =>
                    fertilizerTypes.some((type) => type === value) ||
                    t("validation.selection"),
                })}
                id="fertilizer-type"
                label={`${t("fields.fertilizer_type")} *`}
                aria-required="true"
                aria-invalid={!!errors.fertilizer_type}
                aria-describedby="fertilizer-type-error"
              >
                <option value="">{t("basic.selectType")}</option>
                {fertilizerTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </FilterSelect>
              <p id="fertilizer-type-error" role="alert" className={errorClass}>
                {errors.fertilizer_type?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("form", {
                  required: t("validation.required"),
                  validate: (value) =>
                    fertilizerForms.some((form) => form === value) ||
                    t("validation.selection"),
                })}
                id="fertilizer-form"
                label={`${t("fields.form")} *`}
                aria-required="true"
                aria-invalid={!!errors.form}
                aria-describedby="fertilizer-form-error"
              >
                <option value="">{t("basic.selectForm")}</option>
                {fertilizerForms.map((form) => (
                  <option key={form} value={form}>
                    {t(`forms.${form}`)}
                  </option>
                ))}
              </FilterSelect>
              <p id="fertilizer-form-error" role="alert" className={errorClass}>
                {errors.form?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="fertilizer-grade">{t("fields.grade")}</Label>
              <Input
                {...register("grade", {
                  maxLength: {
                    value: 50,
                    message: t("validation.max", { count: 50 }),
                  },
                })}
                id="fertilizer-grade"
                maxLength={50}
                placeholder={t("basic.gradePlaceholder")}
                error={!!errors.grade}
                aria-invalid={!!errors.grade}
                aria-describedby="fertilizer-grade-error fertilizer-grade-help"
              />
              <p
                id="fertilizer-grade-error"
                role="alert"
                className={errorClass}
              >
                {errors.grade?.message}
              </p>
              <p
                id="fertilizer-grade-help"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                {t("basic.gradeHelp")}
              </p>
            </div>
            <div>
              <Label htmlFor="fertilizer-brand">{t("fields.brand_name")}</Label>
              <Input
                {...register("brand_name", {
                  maxLength: {
                    value: 150,
                    message: t("validation.max", { count: 150 }),
                  },
                })}
                id="fertilizer-brand"
                maxLength={150}
                placeholder={t("basic.brandPlaceholder")}
                error={!!errors.brand_name}
                aria-invalid={!!errors.brand_name}
                aria-describedby="fertilizer-brand-error"
              />
              <p
                id="fertilizer-brand-error"
                role="alert"
                className={errorClass}
              >
                {errors.brand_name?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="fertilizer-manufacturer">
                {t("fields.manufacturer_name")}
              </Label>
              <Input
                {...register("manufacturer_name", {
                  maxLength: {
                    value: 200,
                    message: t("validation.max", { count: 200 }),
                  },
                })}
                id="fertilizer-manufacturer"
                maxLength={200}
                placeholder={t("basic.manufacturerPlaceholder")}
                error={!!errors.manufacturer_name}
                aria-invalid={!!errors.manufacturer_name}
                aria-describedby="fertilizer-manufacturer-error"
              />
              <p
                id="fertilizer-manufacturer-error"
                role="alert"
                className={errorClass}
              >
                {errors.manufacturer_name?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("default_unit_code", {
                  required: t("validation.required"),
                  validate: (value) =>
                    fertilizerUnitCodes.some((unit) => unit === value) ||
                    t("validation.selection"),
                  deps: ["reference_pack_quantity", "reference_pack_unit_code"],
                })}
                id="fertilizer-unit"
                label={`${t("fields.default_unit_code")} *`}
                aria-required="true"
                aria-invalid={!!errors.default_unit_code}
                aria-describedby="fertilizer-unit-error"
              >
                <option value="">{t("basic.selectUnit")}</option>
                {fertilizerUnitCodes.map((unit) => (
                  <option key={unit} value={unit}>
                    {t(`units.${unit}`)}
                  </option>
                ))}
              </FilterSelect>
              <p id="fertilizer-unit-error" role="alert" className={errorClass}>
                {errors.default_unit_code?.message}
              </p>
            </div>
            <div>
              <Label htmlFor="fertilizer-pack">
                {t("fields.reference_pack_quantity")}
              </Label>
              <Input
                {...register("reference_pack_quantity", {
                  deps: "reference_pack_unit_code",
                  validate: {
                    decimal: (value) =>
                      !value ||
                      (/^\d+(?:\.\d{1,4})?$/.test(value) &&
                        value.split(".")[0].replace(/^0+/, "").length <= 10 &&
                        /[1-9]/.test(value)) ||
                      t("validation.packQuantity"),
                    pair: (value) =>
                      !!value ||
                      !getValues("reference_pack_unit_code") ||
                      t("validation.packPair"),
                  },
                })}
                id="fertilizer-pack"
                inputMode="decimal"
                placeholder={t("basic.packPlaceholder")}
                error={!!errors.reference_pack_quantity}
                aria-invalid={!!errors.reference_pack_quantity}
                aria-describedby="fertilizer-pack-error"
              />
              <p id="fertilizer-pack-error" role="alert" className={errorClass}>
                {errors.reference_pack_quantity?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("reference_pack_unit_code", {
                  validate: {
                    required: (value) =>
                      !getValues("reference_pack_quantity") ||
                      !!value ||
                      t("validation.packPair"),
                    supported: (value) =>
                      !value ||
                      fertilizerUnitCodes.some((unit) => unit === value) ||
                      t("validation.selection"),
                    dimension: (value) =>
                      !value ||
                      !getValues("default_unit_code") ||
                      ["g", "kg"].includes(value) ===
                        ["g", "kg"].includes(getValues("default_unit_code")) ||
                      t("validation.dimension"),
                  },
                })}
                id="fertilizer-pack-unit"
                label={t("fields.reference_pack_unit_code")}
                aria-invalid={!!errors.reference_pack_unit_code}
                aria-describedby="fertilizer-pack-unit-error"
              >
                <option value="">{t("basic.selectPackUnit")}</option>
                {fertilizerUnitCodes.map((unit) => (
                  <option key={unit} value={unit}>
                    {t(`units.${unit}`)}
                  </option>
                ))}
              </FilterSelect>
              <p
                id="fertilizer-pack-unit-error"
                role="alert"
                className={errorClass}
              >
                {errors.reference_pack_unit_code?.message}
              </p>
            </div>
            <div>
              <FilterSelect
                {...register("application_method", {
                  validate: (value) =>
                    !value ||
                    fertilizerApplicationMethods.some(
                      (method) => method === value,
                    ) ||
                    t("validation.selection"),
                })}
                id="fertilizer-method"
                label={t("fields.application_method")}
                aria-invalid={!!errors.application_method}
                aria-describedby="fertilizer-method-error"
              >
                <option value="">{t("basic.selectMethod")}</option>
                {fertilizerApplicationMethods.map((method) => (
                  <option key={method} value={method}>
                    {t(`methods.${method}`)}
                  </option>
                ))}
              </FilterSelect>
              <p
                id="fertilizer-method-error"
                role="alert"
                className={errorClass}
              >
                {errors.application_method?.message}
              </p>
            </div>
          </div>
        </ComponentCard>
        <aside className="space-y-5">
          <ComponentCard
            title={t("basic.guidelines")}
            className="bg-brand-25 dark:bg-brand-500/5 rounded-xl"
          >
            <ul className="list-disc space-y-4 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
              <li>{t("basic.guideSlug")}</li>
              <li>{t("basic.guidePack")}</li>
              <li>{t("basic.guideNutrients")}</li>
              <li>{t("basic.guidePublication")}</li>
            </ul>
          </ComponentCard>
        </aside>
      </fieldset>
    </form>
  );
}
