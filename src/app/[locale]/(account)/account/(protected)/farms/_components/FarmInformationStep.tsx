"use client";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import AreaUnitSelect from "@/components/common/AreaUnitSelect";
import useAreaUnits from "@/hooks/useAreaUnits";
import {
  canonicalAreaUnit,
  convertArea,
  formatArea,
  fromSquareMeters,
  isSupportedAreaUnit,
} from "@/lib/areaUnits";
import Input from "@/components/admin/form/input/InputField";
import BoundaryConfirmDialog from "@/components/common/maps/BoundaryConfirmDialog";
import { FarmFieldIcon, InfoIcon, LockIcon } from "@/icons";
import type { AreaUnit, Farm } from "@/types/account/farm";
import FarmField from "./FarmField";
import { farmControl, type FarmFormValues } from "./farmFormTypes";
export default function FarmInformationStep({
  form,
  farm,
}: {
  form: UseFormReturn<FarmFormValues>;
  farm?: Farm;
}) {
  const t = useTranslations("farmerFarms");
  const ta = useTranslations("areaUnits");
  const locale = useLocale();
  const metadata = useAreaUnits();
  const {
    register,
    formState: { errors },
    control,
    getValues,
    setValue,
  } = form;
  const unit = useWatch({ control, name: "area_unit" });
  const [nextUnit, setNextUnit] = useState<AreaUnit | null>(null);
  const areaUnitField = register("area_unit", {
    required: t("validation.unit"),
    validate: (value) =>
      isSupportedAreaUnit(value, metadata.config) || t("validation.unit"),
  });
  const converted = nextUnit
    ? farm &&
      getValues("area") === farm.area &&
      unit === canonicalAreaUnit(farm.area_unit) &&
      farm.area_sqm != null
      ? fromSquareMeters(farm.area_sqm, nextUnit, metadata.config)
      : convertArea(getValues("area"), unit, nextUnit, metadata.config)
    : null;
  const canConvert =
    converted !== null &&
    Number(converted.toFixed(3)) > 0 &&
    Number(converted.toFixed(3)) <= 999999999.999;
  function changeUnit(convert: boolean) {
    if (!nextUnit) return;
    setValue("area_unit", nextUnit, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (convert && canConvert)
      setValue("area", converted!.toFixed(3), {
        shouldDirty: true,
        shouldValidate: true,
      });
    setNextUnit(null);
  }
  return (
    <div className="space-y-5 rounded-xl border border-gray-100 p-4 sm:p-5 dark:border-gray-700">
      <p className="bg-success-50 dark:bg-success-950 flex items-center gap-3 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-200">
        <InfoIcon className="text-success-700 size-5 shrink-0" />
        {t("wizard.informationHint")}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <FarmField
          id="farm-name"
          label={t("fields.name")}
          required
          error={errors.name?.message}
        >
          <Input
            id="farm-name"
            {...register("name", {
              validate: (value) =>
                value.trim().length > 0 || t("validation.nameRequired"),
              maxLength: { value: 150, message: t("validation.nameTooLong") },
            })}
            placeholder={t("fields.namePlaceholder")}
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "farm-name-error" : undefined}
            error={!!errors.name}
          />
        </FarmField>
        <FarmField
          id="farm-ownership"
          label={t("fields.ownership")}
          error={errors.ownership_type?.message}
        >
          <select
            id="farm-ownership"
            {...register("ownership_type", {
              validate: (value) =>
                !value ||
                ["owned", "leased", "shared", "other"].includes(value) ||
                t("validation.selection"),
            })}
            className={farmControl}
          >
            <option value="">{t("notProvided")}</option>
            {(["owned", "leased", "shared", "other"] as const).map((value) => (
              <option key={value} value={value}>
                {t(`ownership.${value}`)}
              </option>
            ))}
          </select>
        </FarmField>
      </div>
      <FarmField
        id="farm-description"
        label={t("fields.description")}
        error={errors.description?.message}
      >
        <textarea
          id="farm-description"
          rows={3}
          {...register("description", {
            maxLength: {
              value: 5000,
              message: t("validation.max", { count: 5000 }),
            },
          })}
          aria-invalid={!!errors.description}
          aria-describedby={
            errors.description ? "farm-description-error" : undefined
          }
          placeholder={t("fields.descriptionPlaceholder")}
          className={`${farmControl} h-auto py-3`}
        />
      </FarmField>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <FarmField
            id="farm-area"
            label={t("fields.area")}
            required
            error={errors.area?.message}
          >
            <Input
              id="farm-area"
              inputMode="decimal"
              {...register("area", {
                validate: (value) =>
                  !value.trim()
                    ? t("validation.areaRequired")
                    : !/^\d{1,9}(\.\d{1,3})?$/.test(value)
                      ? t("validation.areaFormat")
                      : Number(value) <= 0
                        ? t("validation.areaPositive")
                        : true,
              })}
              error={!!errors.area}
              aria-required="true"
              aria-invalid={!!errors.area}
              aria-describedby={`farm-area-help${errors.area ? " farm-area-error" : ""}`}
              placeholder={t("fields.areaPlaceholder")}
            />
          </FarmField>
          <p
            id="farm-area-help"
            className="mt-1.5 flex gap-2 text-xs text-gray-500 dark:text-gray-400"
          >
            <InfoIcon className="size-4 shrink-0" />
            {t("recordAreaHelp")}
          </p>
        </div>
        <FarmField id="farm-unit" label={t("fields.areaUnit")} required>
          <AreaUnitSelect
            id="farm-unit"
            {...areaUnitField}
            value={unit}
            onChange={(next) => {
              if (getValues("area") && next !== unit) setNextUnit(next);
              else
                setValue("area_unit", next, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
            }}
            aria-required="true"
            aria-invalid={!!errors.area_unit}
            error={errors.area_unit?.message}
            aria-describedby={errors.area_unit ? "farm-unit-error" : undefined}
            className={farmControl}
          />
        </FarmField>
      </div>
      <div className="border-success-100 bg-success-50/70 dark:border-success-900 dark:bg-success-950 flex flex-wrap items-center gap-3 rounded-xl border p-4">
        <FarmFieldIcon className="text-success-700 size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">{t("actualAreaFromMap")}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {t("actualAreaHelp")}
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <LockIcon className="size-4" />
          {t("autofilledStep3")}
        </span>
      </div>
      {nextUnit && (
        <BoundaryConfirmDialog
          title={ta("changeTitle")}
          description={ta(
            canConvert ? "changeDescription" : "correctionDescription",
            {
              unit: metadata.label(nextUnit),
              area: formatArea(getValues("area"), locale) ?? getValues("area"),
              converted:
                converted === null ? "" : (formatArea(converted, locale) ?? ""),
            },
          )}
          onClose={() => setNextUnit(null)}
          confirmLabel={ta("correctUnit")}
          onConfirm={() => changeUnit(false)}
          alternativeLabel={ta("convertMeasurement")}
          onAlternative={canConvert ? () => changeUnit(true) : undefined}
        />
      )}
    </div>
  );
}
