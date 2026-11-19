"use client";
import { useEffect, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { useTranslations } from "next-intl";
import Input from "@/components/admin/form/input/InputField";
import BoundaryConfirmDialog from "@/components/common/maps/BoundaryConfirmDialog";
import type {
  BasicSoilAssessment,
  CropSoilTest,
  CropStepProps,
  SoilMeasurements,
} from "@/types/account/farmCrop";
import {
  CropChoice,
  CropField,
  CropNotice,
  CropSection,
  CropSummaryStrip,
  cropControl,
  cropFieldErrors,
} from "./CropUi";

interface SoilForm extends BasicSoilAssessment, CropSoilTest {
  assessment_mode: "basic" | "soil_test" | "skipped";
  estimated_cost: string;
  report?: FileList;
  remove_report: boolean;
}
function AssessmentChoices({
  control,
  name,
  options,
}: {
  control: Control<SoilForm>;
  name: keyof Pick<
    BasicSoilAssessment,
    | "fertile_capacity"
    | "soil_moisture"
    | "drainage_condition"
    | "water_availability"
  >;
  options: string[];
}) {
  const t = useTranslations("farmerCrops");
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="mb-3 font-semibold">{t(`soilQuestions.${name}`)}</h3>
      <Controller
        name={name}
        control={control}
        rules={{ validate: (v) => !v || options.includes(v) || t("required") }}
        render={({ field, fieldState }) => (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {options.map((value) => (
                <CropChoice
                  key={value}
                  selected={field.value === value}
                  onClick={() => field.onChange(value)}
                  className="py-5 text-center text-sm font-semibold"
                >
                  {t(`soilValues.${value}`)}
                </CropChoice>
              ))}
            </div>
            {fieldState.error && (
              <p role="alert" className="text-error-600 text-sm">
                {fieldState.error.message}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
}
function Measurement({
  name,
  units,
  register,
  errors,
}: {
  name: keyof SoilMeasurements;
  units: string[];
  register: UseFormRegister<SoilForm>;
  errors: FieldErrors<SoilForm>;
}) {
  const t = useTranslations("farmerCrops");
  const id = `crop-soil-${name}`;
  return (
    <CropField
      id={id}
      label={t(`soilFields.${name}`)}
      error={errors[name]?.message || errors.measurement_units?.[name]?.message}
    >
      <div className="flex gap-2">
        <Input
          id={id}
          type="number"
          step={0.0001}
          {...register(name, {
            validate: (value) =>
              value === null ||
              value === undefined ||
              value === "" ||
              (Number(value) >= 0 &&
                Number(value) <= (name === "soil_ph" ? 14 : 9999999999.9999)) ||
              t("measurementRange", {
                max: name === "soil_ph" ? 14 : 9999999999.9999,
              }),
          })}
          aria-describedby={errors[name] ? `${id}-error` : undefined}
        />
        <select
          aria-label={t("measurementUnit", { name: t(`soilFields.${name}`) })}
          {...register(`measurement_units.${name}`)}
          className={`${cropControl} w-auto`}
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </CropField>
  );
}
export default function SoilAssessmentStep({
  crop,
  busy,
  onSave,
  onDirty,
}: CropStepProps) {
  const t = useTranslations("farmerCrops");
  const saved = crop.soil_assessment;
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SoilForm>({
    defaultValues: {
      ...saved.basic_assessment,
      ...saved.soil_test,
      assessment_mode: saved.assessment_mode ?? "basic",
      estimated_cost: saved.estimated_soil_test_cost ?? "",
      remove_report: false,
    },
  });
  const mode = useWatch({ control, name: "assessment_mode" });
  const notes = useWatch({ control, name: "notes" });
  const report = useWatch({ control, name: "report" });
  const removeReport = useWatch({ control, name: "remove_report" });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  return (
    <form
      id="crop-step-form"
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        if (
          values.assessment_mode === "soil_test" &&
          !values.report?.length &&
          !(saved.soil_test?.report_available && !values.remove_report) &&
          !Object.keys(values.measurement_units ?? {}).some((key) => {
            const v = values[key as keyof SoilMeasurements];
            return v !== null && v !== undefined && v !== "";
          })
        ) {
          setError("root", { message: t("reportOrMeasurement") });
          return;
        }
        const data = new FormData();
        data.set("assessment_mode", values.assessment_mode);
        if (values.notes) data.set("notes", values.notes);
        if (values.estimated_cost !== "")
          data.set("estimated_cost", values.estimated_cost);
        if (values.assessment_mode === "basic") {
          for (const key of [
            "fertile_capacity",
            "soil_moisture",
            "drainage_condition",
            "water_availability",
          ] as const)
            if (values[key]) data.set(key, values[key]!);
        }
        if (values.assessment_mode === "soil_test") {
          for (const key of [
            "test_date",
            "sample_collected_at",
            "laboratory_name",
            "report_number",
            "sample_depth_cm",
            "soil_ph",
            "electrical_conductivity",
            "organic_carbon",
            "nitrogen",
            "phosphorus",
            "potassium",
            "sulphur",
            "zinc",
            "iron",
            "copper",
            "manganese",
            "boron",
          ] as const)
            if (
              values[key] !== null &&
              values[key] !== undefined &&
              values[key] !== ""
            )
              data.set(key, String(values[key]));
          for (const [key, value] of Object.entries(
            values.measurement_units ?? {},
          ))
            if (value) data.set(`measurement_units[${key}]`, value);
          if (values.report?.[0]) data.set("report", values.report[0]);
          if (values.remove_report) data.set("remove_report", "1");
        }
        const result = await onSave(4, data);
        if (!result.success) cropFieldErrors(result, setError);
      })}
    >
      <div>
        <h2 className="text-2xl font-bold">{t("steps.soil_assessment")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("soilDescription")}</p>
      </div>
      <fieldset disabled={busy} className="space-y-5">
        <Controller
          name="assessment_mode"
          control={control}
          render={({ field }) => (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["basic", "soil_test"] as const).map((value) => (
                <CropChoice
                  key={value}
                  selected={field.value === value}
                  onClick={() => field.onChange(value)}
                >
                  <strong className="text-lg">{t(`soilModes.${value}`)}</strong>
                  <span className="mt-1 block text-sm text-gray-500">
                    {t(`soilModeDescriptions.${value}`)}
                  </span>
                </CropChoice>
              ))}
            </div>
          )}
        />
        {mode === "skipped" && <CropNotice>{t("soilSkipped")}</CropNotice>}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {mode === "basic" && (
              <>
                <AssessmentChoices
                  control={control}
                  name="fertile_capacity"
                  options={["very_good", "good", "average", "poor", "unknown"]}
                />
                <AssessmentChoices
                  control={control}
                  name="soil_moisture"
                  options={["dry", "normal", "wet", "unknown"]}
                />
                <AssessmentChoices
                  control={control}
                  name="drainage_condition"
                  options={["good", "average", "poor", "unknown"]}
                />
                <AssessmentChoices
                  control={control}
                  name="water_availability"
                  options={["sufficient", "moderate", "limited", "unknown"]}
                />
              </>
            )}
            {mode === "soil_test" && (
              <CropSection title={t("soilModes.soil_test")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CropField
                    id="crop-test-date"
                    label={t("testDate")}
                    required
                    error={errors.test_date?.message}
                  >
                    <Input
                      id="crop-test-date"
                      type="date"
                      {...register("test_date", {
                        required: mode === "soil_test" ? t("required") : false,
                      })}
                    />
                  </CropField>
                  <CropField
                    id="crop-laboratory"
                    label={t("laboratory")}
                    error={errors.laboratory_name?.message}
                  >
                    <Input
                      id="crop-laboratory"
                      maxLength={200}
                      {...register("laboratory_name", {
                        maxLength: {
                          value: 200,
                          message: t("maxLength", { count: 200 }),
                        },
                      })}
                    />
                  </CropField>
                  <CropField
                    id="crop-report-number"
                    label={t("reportNumber")}
                    error={errors.report_number?.message}
                  >
                    <Input
                      id="crop-report-number"
                      maxLength={100}
                      {...register("report_number", {
                        maxLength: {
                          value: 100,
                          message: t("maxLength", { count: 100 }),
                        },
                      })}
                    />
                  </CropField>
                  <CropField
                    id="crop-sample-date"
                    label={t("sampleDate")}
                    error={errors.sample_collected_at?.message}
                  >
                    <Input
                      id="crop-sample-date"
                      type="date"
                      {...register("sample_collected_at", {
                        validate: (value, values) =>
                          !value ||
                          !values.test_date ||
                          value <= values.test_date ||
                          t("sampleBeforeTest"),
                      })}
                    />
                  </CropField>
                  <Measurement
                    name="soil_ph"
                    units={["pH"]}
                    register={register}
                    errors={errors}
                  />
                  <Measurement
                    name="electrical_conductivity"
                    units={["dS/m", "mS/cm"]}
                    register={register}
                    errors={errors}
                  />
                  <Measurement
                    name="organic_carbon"
                    units={["percent", "g/kg"]}
                    register={register}
                    errors={errors}
                  />
                  <Measurement
                    name="nitrogen"
                    units={["kg/ha", "mg/kg", "ppm", "percent"]}
                    register={register}
                    errors={errors}
                  />
                  <Measurement
                    name="phosphorus"
                    units={["kg/ha", "mg/kg", "ppm", "percent"]}
                    register={register}
                    errors={errors}
                  />
                  <Measurement
                    name="potassium"
                    units={["kg/ha", "mg/kg", "ppm", "percent"]}
                    register={register}
                    errors={errors}
                  />
                </div>
                <details className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <summary className="cursor-pointer font-semibold">
                    {t("additionalNutrients")}
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Measurement
                      name="sulphur"
                      units={["kg/ha", "mg/kg", "ppm"]}
                      register={register}
                      errors={errors}
                    />
                    <Measurement
                      name="zinc"
                      units={["mg/kg", "ppm"]}
                      register={register}
                      errors={errors}
                    />
                    <Measurement
                      name="iron"
                      units={["mg/kg", "ppm"]}
                      register={register}
                      errors={errors}
                    />
                    <Measurement
                      name="boron"
                      units={["mg/kg", "ppm"]}
                      register={register}
                      errors={errors}
                    />
                    <Measurement
                      name="manganese"
                      units={["mg/kg", "ppm"]}
                      register={register}
                      errors={errors}
                    />
                    <Measurement
                      name="copper"
                      units={["mg/kg", "ppm"]}
                      register={register}
                      errors={errors}
                    />
                  </div>
                </details>
                <div className="mt-5">
                  <CropField
                    id="crop-soil-report"
                    label={t("soilReport")}
                    error={errors.report?.message}
                  >
                    <input
                      key={fileInputKey}
                      id="crop-soil-report"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      {...register("report", {
                        validate: (files) => {
                          const file = files?.[0];
                          return (
                            !file ||
                            (file.size > 0 &&
                              file.size <= 10 * 1024 * 1024 &&
                              /\.(pdf|jpe?g|png|webp)$/i.test(file.name) &&
                              [
                                "application/pdf",
                                "image/jpeg",
                                "image/png",
                                "image/webp",
                              ].includes(file.type)) ||
                            t("reportValidation")
                          );
                        },
                      })}
                      className="block w-full rounded-xl border border-dashed border-gray-300 p-4 text-sm dark:border-gray-600"
                    />
                  </CropField>
                  <p className="mt-2 text-xs text-gray-500">
                    {t("reportHelp")}
                  </p>
                  {report?.[0] && (
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span>{report[0].name}</span>
                      <button
                        type="button"
                        className="text-success-700 dark:text-success-300 underline"
                        onClick={() => {
                          setValue("report", undefined, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          setFileInputKey((value) => value + 1);
                        }}
                      >
                        {t("discardSelectedFile")}
                      </button>
                    </div>
                  )}
                  {saved.soil_test?.report_available && (
                    <div className="mt-3 flex items-center gap-3 text-sm">
                      <span>
                        {t(
                          removeReport ? "reportRemovalPending" : "savedReport",
                        )}
                      </span>
                      <button
                        type="button"
                        className="text-success-700 dark:text-success-300 underline"
                        onClick={() =>
                          removeReport
                            ? setValue("remove_report", false, {
                                shouldDirty: true,
                              })
                            : setConfirmRemove(true)
                        }
                      >
                        {t(removeReport ? "undo" : "removeReport")}
                      </button>
                    </div>
                  )}
                </div>
              </CropSection>
            )}
            <CropField
              id="crop-soil-notes"
              label={t("notes")}
              error={errors.notes?.message}
            >
              <textarea
                id="crop-soil-notes"
                rows={3}
                maxLength={2000}
                {...register("notes", {
                  maxLength: {
                    value: 2000,
                    message: t("maxLength", { count: 2000 }),
                  },
                })}
                className={`${cropControl} h-auto py-3`}
              />
              <p className="mt-1 text-end text-xs text-gray-500">
                {notes?.length ?? 0} / 2000
              </p>
            </CropField>
            <CropField
              id="crop-soil-cost"
              label={t("soilCost")}
              error={errors.estimated_cost?.message}
            >
              <Input
                id="crop-soil-cost"
                type="number"
                step={0.0001}
                {...register("estimated_cost", {
                  validate: (value) =>
                    value === "" ||
                    (Number(value) >= 0 &&
                      Number(value) <= 999999999999.9999) ||
                    t("nonnegative"),
                })}
              />
            </CropField>
          </div>
          <aside className="space-y-4">
            <CropSection title={t("yourCrop")}>
              <CropSummaryStrip crop={crop} />
            </CropSection>
            <CropNotice>{t("whySoil")}</CropNotice>
          </aside>
        </div>
      </fieldset>
      {errors.root && <CropNotice error>{errors.root.message}</CropNotice>}
      {confirmRemove && (
        <BoundaryConfirmDialog
          title={t("removeReport")}
          description={t("removeReportDescription")}
          onClose={() => setConfirmRemove(false)}
          onConfirm={() => {
            setValue("remove_report", true, { shouldDirty: true });
            setConfirmRemove(false);
          }}
        />
      )}
    </form>
  );
}
