"use client";

import type { ComponentProps, RefObject } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { getLanguage } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Label from "@/components/admin/form/Label";
import Input from "@/components/admin/form/input/InputField";
import Select from "@/components/admin/form/Select";
import Switch from "@/components/admin/form/switch/Switch";
import CropActivityTemplateMultiSelect from "../../crop-activity-templates/_components/CropActivityTemplateMultiSelect";
import type { TimelineOptionPage } from "@/types/admin/cropStageTimeline";
import {
  sowingMethodPrimaryLocale,
  sowingMethodTranslationLimits,
  type MethodOption,
  type SowingMethodFormValues,
  type SowingMethodListItem,
  type SowingMethodOptions,
} from "@/types/admin/sowingMethod";

const primaryTitle = `translations.${sowingMethodPrimaryLocale}.title` as const;
const primarySummary =
  `translations.${sowingMethodPrimaryLocale}.short_description` as const;

const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className={errorClass}>
      {message}
    </p>
  ) : null;
}

function BasicInput({
  name,
  label,
  id,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "name" | "id"> & {
  name:
    | typeof primaryTitle
    | typeof primarySummary
    | "code"
    | "slug"
    | "sort_order";
  id: string;
  label: string;
}) {
  const { register, getFieldState, formState } =
    useFormContext<SowingMethodFormValues>();
  const field = register(name, { valueAsNumber: props.type === "number" });
  const error = getFieldState(name, formState).error?.message;

  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {props.required && (
          <span aria-hidden="true" className="text-error-600">
            {" "}
            *
          </span>
        )}
      </Label>
      <Input
        {...field}
        {...props}
        id={id}
        error={Boolean(error)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          void field.onChange(event);
          onChange?.(event);
        }}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export default function MethodBasicStep({
  options,
  crops,
  savedCrops,
  slugEditedRef,
  active,
  busy,
}: {
  options: SowingMethodOptions;
  crops: TimelineOptionPage;
  savedCrops: SowingMethodListItem["crops"];
  slugEditedRef: RefObject<boolean>;
  active: boolean;
  busy: boolean;
}) {
  const t = useTranslations("sowingMethods");
  const {
    control,
    register,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<SowingMethodFormValues>();
  const scope = useWatch({ control, name: "crop_scope" });
  const scopeError =
    errors.crop_scope?.message ??
    (scope !== "specific" ? errors.crop_ids?.message : undefined);
  const { id: primaryLang, dir: primaryDir } = getLanguage(
    sowingMethodPrimaryLocale,
  );
  const flags = [
    { value: "unknown", label: t("unknown") },
    { value: "yes", label: t("yes") },
    { value: "no", label: t("no") },
  ];
  const localized = (items: MethodOption[]) =>
    items.map((item) =>
      item.value === "varies" ? { ...item, label: t("varies") } : item,
    );

  function choice(
    name:
      | "establishment_type"
      | "machinery_requirement"
      | "labour_requirement"
      | "cost_level"
      | "supports_row_spacing"
      | "supports_plant_spacing"
      | "supports_field_layout",
    items: MethodOption[],
    flag = false,
  ) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          const id = `method-${name}`;
          const error = fieldState.error?.message;
          const required = name === "establishment_type";
          return (
            <div>
              <Label htmlFor={id}>
                {t(`fields.${name}`)}
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
                disabled={busy}
                options={items}
                required={required}
                className="aria-invalid:border-error-500"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                value={
                  flag
                    ? field.value === null
                      ? "unknown"
                      : field.value
                        ? "yes"
                        : "no"
                    : String(field.value)
                }
                onChange={(value) =>
                  field.onChange(
                    flag
                      ? value === "unknown"
                        ? null
                        : value === "yes"
                      : value,
                  )
                }
              />
              <FieldError id={`${id}-error`} message={error} />
            </div>
          );
        }}
      />
    );
  }

  return (
    <>
      <ComponentCard title={t("basicInformation")} desc={t("basicHelp")}>
        <div className="grid gap-4 md:grid-cols-2">
          <BasicInput
            name={primaryTitle}
            id="method-primary-title"
            label={t("primaryTitle")}
            placeholder={t("basicPlaceholders.title")}
            required
            maxLength={sowingMethodTranslationLimits.title}
            lang={primaryLang}
            dir={primaryDir}
            onChange={(event) => {
              if (!slugEditedRef.current) {
                setValue(
                  "slug",
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .slice(0, 180)
                    .replace(/^-+|-+$/g, ""),
                  { shouldDirty: true },
                );
              }
            }}
          />
          <BasicInput
            name="code"
            id="method-code"
            label={t("fields.code")}
            placeholder={t("basicPlaceholders.code")}
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={40}
          />
          <BasicInput
            name="slug"
            id="method-slug"
            label={t("fields.slug")}
            placeholder={t("basicPlaceholders.slug")}
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={180}
            onChange={() => {
              slugEditedRef.current = true;
            }}
          />
          {choice("establishment_type", options.establishment_types)}
        </div>
        <fieldset
          aria-describedby={scopeError ? "method-crop-scope-error" : undefined}
          aria-invalid={Boolean(scopeError)}
        >
          <legend className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            {t("cropApplicability")}
            <span aria-hidden="true" className="text-error-600">
              {" "}
              *
            </span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.crop_scopes.map(({ value }) => (
              <label
                key={value}
                className={`flex gap-3 rounded-xl border p-3 ${scope === value ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-700"}`}
              >
                <input
                  type="radio"
                  value={value}
                  required
                  {...register("crop_scope", {
                    onChange: (event) => {
                      if (event.target.value === "all") {
                        setValue("crop_ids", [], { shouldDirty: true });
                        clearErrors("crop_ids");
                      }
                    },
                  })}
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
          <FieldError id="method-crop-scope-error" message={scopeError} />
        </fieldset>
        {scope === "specific" && (
          <Controller
            name="crop_ids"
            control={control}
            render={({ field, fieldState }) => (
              <CropActivityTemplateMultiSelect
                kind="crop"
                id="method-crops"
                label={t("selectCrops")}
                placeholder={t("searchCrops")}
                value={field.value}
                onChange={field.onChange}
                inputRef={field.ref}
                onBlur={field.onBlur}
                initialPage={crops}
                initialSelected={savedCrops.map((crop) => ({
                  id: crop.id,
                  label: crop.name ?? String(crop.id),
                }))}
                disabled={busy}
                required
                error={fieldState.error?.message}
              />
            )}
          />
        )}
        <BasicInput
          name={primarySummary}
          id="method-primary-summary"
          label={t("fields.short_description")}
          placeholder={t("basicPlaceholders.short_description")}
          required={active}
          maxLength={sowingMethodTranslationLimits.short_description}
          lang={primaryLang}
          dir={primaryDir}
        />
      </ComponentCard>
      <ComponentCard title={t("configuration")} desc={t("configurationHelp")}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {choice("supports_row_spacing", flags, true)}
          {choice("supports_plant_spacing", flags, true)}
          {choice("supports_field_layout", flags, true)}
          {choice(
            "machinery_requirement",
            localized(options.machinery_requirements),
          )}
          {choice("labour_requirement", localized(options.labour_requirements))}
          {choice("cost_level", localized(options.cost_levels))}
          <BasicInput
            name="sort_order"
            id="method-sort-order"
            label={t("fields.sort_order")}
            type="number"
            min={0}
            max={65535}
            step={1}
            required
          />
          <Controller
            name="is_active"
            control={control}
            render={({ field, fieldState }) => (
              <fieldset
                aria-describedby={
                  fieldState.error
                    ? "method-status-help method-status-error"
                    : "method-status-help"
                }
                aria-invalid={Boolean(fieldState.error)}
              >
                <legend className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300">
                  {t("desiredStatus")}
                </legend>
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  label={t(field.value ? "active" : "inactive")}
                />
                <p
                  id="method-status-help"
                  className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  {t("statusHelp")}
                </p>
                <FieldError
                  id="method-status-error"
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
