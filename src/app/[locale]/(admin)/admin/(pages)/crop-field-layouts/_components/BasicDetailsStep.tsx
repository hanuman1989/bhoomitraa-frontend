"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Label from "@/components/admin/form/Label";
import Input from "@/components/admin/form/input/InputField";
import Select from "@/components/admin/form/Select";
import Switch from "@/components/admin/form/switch/Switch";
import { cn } from "@/utils";
import type {
  CropFieldLayoutBasicDetails,
  CropFieldLayoutFormValues,
  CropFieldLayoutOptions,
} from "@/types/admin/cropFieldLayout";
import type { TimelineOptionPage } from "@/types/admin/cropStageTimeline";
import CropActivityTemplateMultiSelect from "../../crop-activity-templates/_components/CropActivityTemplateMultiSelect";
import TimelineRelationSelect from "../../crop-stage-timelines/_components/TimelineRelationSelect";
import SowingMethodSelect from "./SowingMethodSelect";

const unrestricted = "unrestricted";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p
      id={id}
      role="alert"
      className="text-error-600 dark:text-error-400 mt-1 text-xs"
    >
      {message}
    </p>
  ) : null;
}

function LayoutSelect({
  name,
  label,
  options,
  emptyLabel,
  help,
  busy,
}: {
  name: "farming_type" | "growing_system" | "layout_type";
  label: string;
  options: { value: string; label: string }[];
  emptyLabel?: string;
  help?: string;
  busy: boolean;
}) {
  const { control } = useFormContext<CropFieldLayoutFormValues>();
  const id = `field-layout-${name}`;
  const required = name === "layout_type";

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const describedBy = [help && `${id}-help`, error && `${id}-error`]
          .filter(Boolean)
          .join(" ");

        return (
          <div className="min-w-0">
            <Label htmlFor={id}>
              {label}
              {required && (
                <span aria-hidden="true" className="text-error-600">
                  {" "}
                  *
                </span>
              )}
            </Label>
            <Select
              {...field}
              id={id}
              options={
                emptyLabel
                  ? [{ value: unrestricted, label: emptyLabel }, ...options]
                  : options
              }
              value={field.value ?? (emptyLabel ? unrestricted : "")}
              onChange={(value) =>
                field.onChange(value === unrestricted ? null : value)
              }
              required={required}
              disabled={busy}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy || undefined}
              className="aria-invalid:border-error-500"
            />
            {help && (
              <p
                id={`${id}-help`}
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                {help}
              </p>
            )}
            <FieldError id={`${id}-error`} message={error} />
          </div>
        );
      }}
    />
  );
}

export default function BasicDetailsStep({
  options,
  saved,
  crops,
  busy,
}: {
  options: CropFieldLayoutOptions;
  saved: CropFieldLayoutBasicDetails | null;
  crops: TimelineOptionPage;
  busy: boolean;
}) {
  const t = useTranslations("cropFieldLayouts.basic");
  const {
    control,
    register,
    clearErrors,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<CropFieldLayoutFormValues>();
  const [scope, cropIds] = useWatch({
    control,
    name: ["crop_scope", "crop_ids"],
  });
  const singleCropId =
    scope === "specific" && cropIds.length === 1 ? cropIds[0] : null;
  const scopeError =
    errors.crop_scope?.message ??
    (scope === "all" ? errors.crop_ids?.message : undefined);
  const notRestricted = t("notRestricted");
  const variety = saved?.crop_variety;
  const method = saved?.sowing_method;
  const sortError = errors.sort_order?.message;

  return (
    <>
      <ComponentCard title={t("title")}>
        <fieldset
          aria-describedby={scopeError ? "field-layout-scope-error" : undefined}
        >
          <legend className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            {t("cropApplicability")}{" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.crop_scopes.map(({ value }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3",
                  scope === value
                    ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-200 dark:border-gray-700",
                )}
              >
                <input
                  {...register("crop_scope", {
                    onChange: (event) => {
                      if (event.target.value === "all") {
                        setValue("crop_ids", [], { shouldDirty: true });
                        setValue("crop_variety_id", null, {
                          shouldDirty: true,
                        });
                        clearErrors(["crop_ids", "crop_variety_id"]);
                      }
                      clearErrors(["crop_scope", "sowing_method_id"]);
                    },
                  })}
                  type="radio"
                  value={value}
                  required
                  disabled={busy}
                  className="text-brand-500 mt-1 size-4 shrink-0"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t(value === "all" ? "allCrops" : "specificCrops")}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t(value === "all" ? "allCropsHelp" : "specificCropsHelp")}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id="field-layout-scope-error" message={scopeError} />
        </fieldset>

        {scope === "specific" && (
          <Controller
            name="crop_ids"
            control={control}
            render={({ field, fieldState }) => (
              <CropActivityTemplateMultiSelect
                kind="crop"
                id="field-layout-crops"
                label={t("selectCrops")}
                placeholder={t("searchCrops")}
                value={field.value}
                initialPage={crops}
                initialSelected={(saved?.crops ?? []).map(({ id, name }) => ({
                  id,
                  label: name ?? String(id),
                }))}
                error={fieldState.error?.message}
                required
                disabled={busy}
                inputRef={field.ref}
                onBlur={field.onBlur}
                onChange={(ids) => {
                  const previous = getValues("crop_ids");
                  if (
                    ids.length !== 1 ||
                    previous.length !== 1 ||
                    previous[0] !== ids[0]
                  ) {
                    setValue("crop_variety_id", null, { shouldDirty: true });
                    clearErrors("crop_variety_id");
                  }
                  field.onChange(ids);
                  clearErrors(["crop_ids", "sowing_method_id"]);
                }}
              />
            )}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {singleCropId !== null && (
            <Controller
              name="crop_variety_id"
              control={control}
              render={({ field, fieldState }) => (
                <TimelineRelationSelect
                  key={singleCropId}
                  kind="variety"
                  cropId={singleCropId}
                  eligible
                  id="field-layout-variety"
                  label={t("cropVariety")}
                  emptyLabel={t("allVarieties")}
                  placeholder={t(
                    field.value === null ? "allVarieties" : "searchVarieties",
                  )}
                  initialSelection={
                    variety
                      ? {
                          id: variety.id,
                          label: variety.name ?? String(variety.id),
                          is_active: true,
                        }
                      : null
                  }
                  value={field.value === null ? "" : String(field.value)}
                  error={fieldState.error?.message}
                  disabled={busy}
                  inputRef={field.ref}
                  onBlur={field.onBlur}
                  onChange={(id) => {
                    field.onChange(id ? Number(id) : null);
                    clearErrors("crop_variety_id");
                  }}
                />
              )}
            />
          )}
          <Controller
            name="sowing_method_id"
            control={control}
            render={({ field, fieldState }) => (
              <SowingMethodSelect
                id="field-layout-sowing-method"
                label={t("sowingMethod")}
                emptyLabel={notRestricted}
                placeholder={
                  field.value === null
                    ? notRestricted
                    : t("searchSowingMethods")
                }
                initialSelection={
                  method
                    ? {
                        id: method.id,
                        label: method.title ?? String(method.id),
                        is_active: true,
                      }
                    : null
                }
                cropIds={scope === "all" ? [] : cropIds}
                value={field.value === null ? "" : String(field.value)}
                disabled={
                  busy || (scope === "specific" && cropIds.length === 0)
                }
                error={fieldState.error?.message}
                inputRef={field.ref}
                onBlur={field.onBlur}
                onChange={(id) => {
                  field.onChange(id ? Number(id) : null);
                  clearErrors("sowing_method_id");
                }}
              />
            )}
          />
          <LayoutSelect
            name="farming_type"
            label={t("farmingType")}
            options={options.farming_types}
            emptyLabel={notRestricted}
            busy={busy}
          />
          <LayoutSelect
            name="growing_system"
            label={t("growingSystem")}
            options={options.growing_systems}
            emptyLabel={notRestricted}
            busy={busy}
          />
          <LayoutSelect
            name="layout_type"
            label={t("layoutType")}
            options={options.layout_types}
            help={t("layoutTypeHelp")}
            busy={busy}
          />
        </div>
      </ComponentCard>
      <ComponentCard title={t("additionalSettings")}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="field-layout-sort-order">
              {t("sortOrder")}{" "}
              <span aria-hidden="true" className="text-error-600">
                *
              </span>
            </Label>
            <Input
              {...register("sort_order", { valueAsNumber: true })}
              id="field-layout-sort-order"
              type="number"
              min={0}
              max={65535}
              step={1}
              required
              disabled={busy}
              error={Boolean(sortError)}
              aria-invalid={Boolean(sortError)}
              aria-describedby={
                sortError ? "field-layout-sort-order-error" : undefined
              }
            />
            <FieldError
              id="field-layout-sort-order-error"
              message={sortError}
            />
          </div>
          <Controller
            name="is_active"
            control={control}
            render={({ field, fieldState }) => (
              <fieldset
                aria-describedby={
                  fieldState.error
                    ? "field-layout-status-help field-layout-status-error"
                    : "field-layout-status-help"
                }
              >
                <legend className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300">
                  {t("activeStatus")}
                </legend>
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  label={t(field.value ? "active" : "inactive")}
                />
                <p
                  id="field-layout-status-help"
                  className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  {t("statusHelp")}
                </p>
                <FieldError
                  id="field-layout-status-error"
                  message={fieldState.error?.message}
                />
              </fieldset>
            )}
          />
        </div>
      </ComponentCard>
    </>
  );
}
