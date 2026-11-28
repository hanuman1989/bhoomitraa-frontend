"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Label from "@/components/admin/form/Label";
import Select from "@/components/admin/form/Select";
import Input from "@/components/admin/form/input/InputField";
import TextArea from "@/components/admin/form/input/TextArea";
import type {
  CropFieldLayoutFormValues,
  FieldLayoutDefinition,
} from "@/types/admin/cropFieldLayout";
import FieldLayoutPreview, { ConfigurationSummary } from "./FieldLayoutPreview";
import {
  applicableConfigurationFields,
  configurationUnit,
  displayConfigurationNumber,
  prepareConfiguration,
} from "./configuration";

export default function ConfigurationStep({
  definition,
  busy,
}: {
  definition: FieldLayoutDefinition | undefined;
  busy: boolean;
}) {
  const t = useTranslations("cropFieldLayouts.configuration");
  const { control, formState } = useFormContext<CropFieldLayoutFormValues>();
  const values = useWatch({ control, name: "configuration" }) ?? {};
  const fields = definition
    ? applicableConfigurationFields(definition, values)
    : [];
  const configuration = definition
    ? prepareConfiguration(definition, values).configuration
    : {};
  const fieldError: unknown = formState.errors.configuration?.message;

  return (
    <>
      <ComponentCard
        title={t("title")}
        desc={t("description")}
        className="shadow-theme-xs"
      >
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <div>
              <Label htmlFor="field-layout-selected-type">
                {t("layoutType")}
              </Label>
              <Input
                id="field-layout-selected-type"
                value={definition?.label ?? ""}
                readOnly
              />
            </div>
            {typeof fieldError === "string" && (
              <p
                role="alert"
                className="text-error-600 dark:text-error-400 text-sm"
              >
                {fieldError}
              </p>
            )}
            {fields.map((field) => {
              const id = `field-layout-configuration-${field.key}`;
              const required = field.required || Boolean(field.required_when);
              const unit = configurationUnit(field);
              return (
                <Controller
                  key={field.key}
                  control={control}
                  name={`configuration.${field.key}`}
                  render={({ field: input, fieldState: { error } }) => {
                    const inputProps = {
                      id,
                      disabled: busy,
                      required,
                      "aria-invalid": Boolean(error),
                      "aria-describedby":
                        error || unit
                          ? [unit && `${id}-unit`, error && `${id}-error`]
                              .filter(Boolean)
                              .join(" ")
                          : undefined,
                    };
                    return (
                      <div>
                        <Label htmlFor={id}>
                          {field.label}
                          {required && (
                            <span className="text-error-500"> *</span>
                          )}
                        </Label>
                        {field.type === "select" ? (
                          <Select
                            {...input}
                            {...inputProps}
                            value={input.value ?? ""}
                            options={(field.options ?? []).map((value) => ({
                              value,
                              label: t.has(`values.${value}`)
                                ? t(`values.${value}`)
                                : value,
                            }))}
                            className={
                              error
                                ? "border-error-500 dark:border-error-500"
                                : undefined
                            }
                          />
                        ) : (
                          <div className="relative">
                            <Input
                              {...input}
                              {...inputProps}
                              value={input.value ?? ""}
                              type="number"
                              inputMode={
                                field.type === "integer" ? "numeric" : "decimal"
                              }
                              min={
                                typeof field.min === "number"
                                  ? displayConfigurationNumber(field, field.min)
                                  : undefined
                              }
                              max={
                                typeof field.max === "number"
                                  ? displayConfigurationNumber(field, field.max)
                                  : undefined
                              }
                              step={field.type === "integer" ? 1 : undefined}
                              error={Boolean(error)}
                              className={unit ? "pe-14" : undefined}
                            />
                            {unit && (
                              <span
                                id={`${id}-unit`}
                                className="pointer-events-none absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-lg border-s border-gray-300 bg-gray-50 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {unit}
                              </span>
                            )}
                          </div>
                        )}
                        {error?.message && (
                          <p
                            id={`${id}-error`}
                            role="alert"
                            className="text-error-600 dark:text-error-400 mt-1 text-xs"
                          >
                            {error.message}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
              );
            })}
            {!fields.length && (
              <p className="border-blue-light-100 bg-blue-light-50 text-blue-light-800 dark:border-blue-light-500/20 dark:bg-blue-light-500/10 dark:text-blue-light-300 rounded-lg border p-3 text-sm">
                {t(definition ? "noSpacing" : "unavailable")}
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <FieldLayoutPreview
              definition={definition}
              configuration={configuration}
            />
            {definition && fields.length > 0 && (
              <div className="border-brand-100 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10 space-y-2 rounded-xl border p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("summary")}
                </h4>
                <ConfigurationSummary
                  definition={definition}
                  configuration={configuration}
                />
              </div>
            )}
          </div>
        </div>
      </ComponentCard>
      <ComponentCard title={t("referenceNote")} className="shadow-theme-xs">
        <Controller
          control={control}
          name="reference_note"
          render={({ field, fieldState: { error } }) => (
            <div>
              <Label htmlFor="field-layout-reference-note" className="sr-only">
                {t("referenceNote")}
              </Label>
              <TextArea
                {...field}
                id="field-layout-reference-note"
                rows={3}
                disabled={busy}
                maxLength={500}
                error={Boolean(error)}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? "field-layout-reference-error field-layout-reference-help"
                    : "field-layout-reference-help"
                }
                value={field.value ?? ""}
                placeholder={t("referencePlaceholder")}
              />
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs">
                <p
                  id="field-layout-reference-help"
                  className="text-gray-600 dark:text-gray-300"
                >
                  {t("referenceHelp")}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("counter", { count: field.value?.length ?? 0, max: 500 })}
                </p>
              </div>
              {error?.message && (
                <p
                  id="field-layout-reference-error"
                  role="alert"
                  className="text-error-600 dark:text-error-400 mt-1 text-xs"
                >
                  {error.message}
                </p>
              )}
            </div>
          )}
        />
      </ComponentCard>
    </>
  );
}
