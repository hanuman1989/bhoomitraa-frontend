"use client";

import { useEffect, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import Badge from "@/components/admin/ui/badge/Badge";
import { PlusIcon, TrashBinIcon } from "@/icons";
import SeedConfirmDialog from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog";
import {
  nutrientCodes,
  nutrientContentUnits,
  optionalCompositionTypes,
  type Fertilizer,
  type FertilizerNutrientValues,
  type FertilizerNutrientsPayload,
} from "@/types/admin/fertilizer";
import type { ActionResult } from "@/types/api";

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function Step2NutrientComposition({
  fertilizer,
  busy,
  onDirty,
  onSave,
}: {
  fertilizer: Fertilizer;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (
    values: FertilizerNutrientsPayload,
  ) => Promise<ActionResult<Fertilizer>>;
}) {
  const t = useTranslations("fertilizers"),
    [removing, setRemoving] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isDirty },
  } = useForm<FertilizerNutrientValues>({
    defaultValues: {
      nutrients: fertilizer.nutrients.map(
        ({ nutrient_code, content_value, content_unit_code }) => ({
          nutrient_code,
          content_value,
          content_unit_code,
        }),
      ),
      composition_notes: fertilizer.composition_notes ?? "",
    },
    mode: "onTouched",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "nutrients",
    rules: {
      validate: (rows) =>
        rows.length > 0 ||
        optionalCompositionTypes.includes(fertilizer.fertilizer_type) ||
        t("validation.compositionRequired"),
      maxLength: { value: 36, message: t("validation.nutrientCount") },
    },
  });
  const rows = useWatch({ control, name: "nutrients" });
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  async function submit(values: FertilizerNutrientValues) {
    if (busy) return;
    const result = await onSave({
      nutrients: values.nutrients.map((row) => ({
        nutrient_code:
          row.nutrient_code as FertilizerNutrientsPayload["nutrients"][number]["nutrient_code"],
        content_value: row.content_value,
        content_unit_code:
          row.content_unit_code as FertilizerNutrientsPayload["nutrients"][number]["content_unit_code"],
      })),
      composition_notes: values.composition_notes.trim() || null,
    });
    for (const [field, messages] of Object.entries(result.errors ?? {})) {
      if (!messages[0]) continue;
      if (field === "nutrients")
        setError("nutrients", { type: "server", message: messages[0] });
      else if (
        field === "composition_notes" ||
        /^nutrients\.\d+\.(nutrient_code|content_value|content_unit_code)$/.test(
          field,
        )
      )
        setError(field as FieldPath<FertilizerNutrientValues>, {
          type: "server",
          message: messages[0],
        });
    }
  }
  return (
    <>
      <form
        id="fertilizer-step-2"
        onSubmit={handleSubmit(submit)}
        noValidate
        aria-busy={busy}
      >
        <fieldset
          disabled={busy}
          className="grid min-w-0 items-start gap-5 xl:grid-cols-3"
        >
          <legend className="sr-only">{t("wizard.step2")}</legend>
          <ComponentCard
            title={t("composition.title")}
            desc={t("composition.description")}
            className="shadow-theme-xs min-w-0 rounded-xl xl:col-span-2 [&_h3]:text-xl [&_h3]:font-semibold"
          >
            <div className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid items-start gap-3 border-b border-gray-100 pb-4 sm:grid-cols-7 dark:border-gray-800"
                >
                  <div className="min-w-0 sm:col-span-3">
                    <FilterSelect
                      {...register(`nutrients.${index}.nutrient_code`, {
                        required: t("validation.required"),
                        validate: {
                          supported: (value) =>
                            nutrientCodes.some((code) => code === value) ||
                            t("validation.selection"),
                          unique: (value) =>
                            getValues("nutrients").filter(
                              (row) =>
                                row.nutrient_code === value &&
                                row.content_unit_code ===
                                  getValues(
                                    `nutrients.${index}.content_unit_code`,
                                  ),
                            ).length <= 1 || t("validation.duplicateNutrient"),
                        },
                      })}
                      id={`nutrient-${field.id}-code`}
                      label={`${t("composition.nutrient")} *`}
                      aria-required="true"
                      aria-invalid={!!errors.nutrients?.[index]?.nutrient_code}
                      aria-describedby={`nutrient-${field.id}-code-error`}
                    >
                      <option value="">
                        {t("composition.selectNutrient")}
                      </option>
                      {nutrientCodes.map((code) => (
                        <option key={code} value={code}>
                          {t(`nutrients.${code}`)}
                        </option>
                      ))}
                    </FilterSelect>
                    <p
                      id={`nutrient-${field.id}-code-error`}
                      role="alert"
                      className={errorClass}
                    >
                      {errors.nutrients?.[index]?.nutrient_code?.message}
                    </p>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <Label htmlFor={`nutrient-${field.id}-value`}>
                      {t("composition.value")} *
                    </Label>
                    <Input
                      {...register(`nutrients.${index}.content_value`, {
                        required: t("validation.required"),
                        validate: {
                          decimal: (value) =>
                            (/^\d+(?:\.\d{1,4})?$/.test(value) &&
                              value.split(".")[0].replace(/^0+/, "").length <=
                                8) ||
                            t("validation.nutrientValue"),
                          percentage: (value) =>
                            getValues(
                              `nutrients.${index}.content_unit_code`,
                            ) === "g_per_l" ||
                            Number(value) <= 100 ||
                            t("validation.percentage"),
                        },
                      })}
                      id={`nutrient-${field.id}-value`}
                      inputMode="decimal"
                      placeholder={t("composition.valuePlaceholder")}
                      error={!!errors.nutrients?.[index]?.content_value}
                      aria-required="true"
                      aria-invalid={!!errors.nutrients?.[index]?.content_value}
                      aria-describedby={`nutrient-${field.id}-value-error`}
                    />
                    <p
                      id={`nutrient-${field.id}-value-error`}
                      role="alert"
                      className={errorClass}
                    >
                      {errors.nutrients?.[index]?.content_value?.message}
                    </p>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <FilterSelect
                      {...register(`nutrients.${index}.content_unit_code`, {
                        required: t("validation.required"),
                        validate: (value) =>
                          nutrientContentUnits.some((unit) => unit === value) ||
                          t("validation.selection"),
                        deps: [
                          `nutrients.${index}.content_value`,
                          `nutrients.${index}.nutrient_code`,
                        ],
                      })}
                      id={`nutrient-${field.id}-unit`}
                      label={`${t("composition.unit")} *`}
                      aria-required="true"
                      aria-invalid={
                        !!errors.nutrients?.[index]?.content_unit_code
                      }
                      aria-describedby={`nutrient-${field.id}-unit-error`}
                    >
                      <option value="">{t("composition.selectUnit")}</option>
                      {nutrientContentUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {t(`contentUnits.${unit}`)}
                        </option>
                      ))}
                    </FilterSelect>
                    <p
                      id={`nutrient-${field.id}-unit-error`}
                      role="alert"
                      className={errorClass}
                    >
                      {errors.nutrients?.[index]?.content_unit_code?.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (busy) return;
                      const row = getValues(`nutrients.${index}`);
                      if (row.nutrient_code || row.content_value)
                        setRemoving(field.id);
                      else remove(index);
                    }}
                    aria-label={t("composition.removeRow", {
                      number: index + 1,
                    })}
                    className="border-error-200 text-error-600 dark:border-error-800 dark:text-error-400 flex items-center justify-center gap-2 rounded-lg border p-2 text-sm sm:col-span-7 sm:justify-self-end"
                  >
                    <TrashBinIcon aria-hidden="true" className="size-4" />
                    {t("composition.remove")}
                  </button>
                </div>
              ))}
              {!fields.length && (
                <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                  {t("composition.empty")}
                </p>
              )}
            </div>
            <p role="alert" className={errorClass}>
              {errors.nutrients?.root?.message ?? errors.nutrients?.message}
            </p>
            <button
              type="button"
              disabled={busy || fields.length >= 36}
              onClick={() => {
                if (!busy && fields.length < 36)
                  append({
                    nutrient_code: "",
                    content_value: "",
                    content_unit_code: "percent_ww",
                  });
              }}
              className="border-brand-400 text-brand-500 dark:border-brand-700 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm font-semibold disabled:opacity-50"
            >
              <PlusIcon aria-hidden="true" className="size-5" />
              {t("composition.add")}
            </button>
            <div>
              <Label htmlFor="fertilizer-composition-notes">
                {t("composition.notes")}
              </Label>
              <textarea
                {...register("composition_notes", {
                  maxLength: {
                    value: 65535,
                    message: t("validation.max", { count: 65535 }),
                  },
                })}
                id="fertilizer-composition-notes"
                maxLength={65535}
                rows={4}
                placeholder={t("composition.notesPlaceholder")}
                aria-invalid={!!errors.composition_notes}
                aria-describedby="fertilizer-composition-notes-error"
                className="focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-gray-100"
              />
              <p
                id="fertilizer-composition-notes-error"
                role="alert"
                className={errorClass}
              >
                {errors.composition_notes?.message}
              </p>
            </div>
          </ComponentCard>
          <aside className="min-w-0 space-y-5">
            <ComponentCard
              title={t("composition.preview")}
              className="shadow-theme-xs rounded-xl"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t("composition.rowCount", { count: rows.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {rows
                  .filter(
                    (row) =>
                      row.nutrient_code &&
                      row.content_value !== "" &&
                      row.content_unit_code,
                  )
                  .map((row, index) => (
                    <Badge key={index}>
                      {t("composition.valueLabel", {
                        nutrient: row.nutrient_code,
                        value: row.content_value,
                        unit: t(`contentUnits.${row.content_unit_code}`),
                      })}
                    </Badge>
                  ))}
              </div>
            </ComponentCard>
            <ComponentCard
              title={t("composition.guidelines")}
              className="bg-brand-25 dark:bg-brand-500/5 rounded-xl"
            >
              <ul className="list-disc space-y-4 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <li>{t("composition.guideValues")}</li>
                <li>{t("composition.guideUnits")}</li>
                <li>{t("composition.guideDuplicates")}</li>
                <li>{t("composition.guideOptional")}</li>
              </ul>
            </ComponentCard>
          </aside>
        </fieldset>
      </form>
      {removing && (
        <SeedConfirmDialog
          title={t("composition.removeTitle")}
          description={t("composition.removeConfirm")}
          confirmLabel={t("composition.remove")}
          busy={busy}
          destructive
          onClose={() => {
            if (!busy) setRemoving(null);
          }}
          onConfirm={() => {
            if (busy) return;
            const index = fields.findIndex((field) => field.id === removing);
            if (index >= 0) remove(index);
            setRemoving(null);
          }}
        />
      )}
    </>
  );
}
