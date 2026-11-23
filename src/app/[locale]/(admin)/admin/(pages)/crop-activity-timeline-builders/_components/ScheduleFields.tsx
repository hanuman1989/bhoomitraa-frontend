"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import {
  maxTemplateOffset,
  templateScheduleTypes,
  type CropActivityTemplate,
} from "@/types/admin/cropActivityTemplate";
import type { ScheduleValues } from "./types";

const whole = (value: string) =>
  value.trim() !== "" &&
  Number.isInteger(Number(value)) &&
  Number(value) >= 0 &&
  Number(value) <= maxTemplateOffset;

/**
 * Same rules as the Crop Activity Template form: offsets are stored as
 * entered, with the end at or after the start, for every schedule type.
 */
export function scheduleError(
  value: ScheduleValues,
  stageId: number | null,
): "stage" | "days" | "order" | null {
  if (value.mode === "stage")
    return stageId === null || value.schedule_type !== "after_sowing"
      ? "stage"
      : null;
  if (!whole(value.start) || !whole(value.end)) return "days";
  return Number(value.end) < Number(value.start) ? "order" : null;
}

export function schedulePayload(value: ScheduleValues) {
  if (value.mode === "stage")
    return {
      schedule_type: "after_sowing" as const,
      schedule_basis: "growth_stage" as const,
      start_offset_days: null,
      end_offset_days: null,
    };
  return {
    schedule_type: value.schedule_type,
    schedule_basis: "fixed_offsets" as const,
    start_offset_days: Number(value.start),
    end_offset_days: Number(value.end),
  };
}

export function scheduleValues(
  record: Pick<
    CropActivityTemplate,
    "schedule_type" | "schedule_basis" | "start_offset_days" | "end_offset_days"
  >,
): ScheduleValues {
  if (record.schedule_basis === "growth_stage")
    return { mode: "stage", schedule_type: "after_sowing", start: "", end: "" };
  return {
    mode: "fixed",
    schedule_type: record.schedule_type,
    start:
      record.start_offset_days === null ? "" : String(record.start_offset_days),
    end: record.end_offset_days === null ? "" : String(record.end_offset_days),
  };
}

export default function ScheduleFields({
  idPrefix,
  value,
  onChange,
  hasStage,
  stageHasTiming,
  preview,
  error,
  disabled,
}: {
  idPrefix: string;
  value: ScheduleValues;
  onChange: (value: ScheduleValues) => void;
  /** The activity is linked to a growth stage. */
  hasStage: boolean;
  /** That growth stage has at least one active Stage Timeline. */
  stageHasTiming: boolean;
  preview: ReactNode;
  error?: string;
  disabled: boolean;
}) {
  const t = useTranslations("timelineBuilder");
  const tt = useTranslations("cropActivityTemplates");
  const typeLabel = tt(`schedule.${value.schedule_type}`);
  // Same rule as Laravel and the template form: Growth Stage Based needs a
  // growth stage and After Sowing. Missing Stage Timelines only warn, since
  // dates appear once a matching timeline is activated.
  const stageDisabled =
    disabled || !hasStage || value.schedule_type !== "after_sowing";
  const stageHint = !hasStage
    ? t("schedule.stageRequired")
    : value.schedule_type !== "after_sowing"
      ? t("schedule.afterSowingOnly")
      : null;
  const bases = [
    { mode: "fixed", label: tt("scheduleBases.fixed_offsets"), off: disabled },
    {
      mode: "stage",
      label: tt("scheduleBases.growth_stage"),
      off: stageDisabled,
    },
  ] as const;
  return (
    <section className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      {/* Same layout as the Crop Activity Template form's Scheduling card. */}
      <div className="grid gap-5 md:grid-cols-2">
        <FilterSelect
          id={`${idPrefix}-schedule-type`}
          label={tt("fields.schedule")}
          value={value.schedule_type}
          className="h-9"
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const next =
              templateScheduleTypes.find(
                (type) => type === event.target.value,
              ) ?? "after_sowing";
            // Only After Sowing can use Growth Stage timing.
            onChange(
              value.mode === "stage" && next !== "after_sowing"
                ? { mode: "fixed", schedule_type: next, start: "0", end: "0" }
                : { ...value, schedule_type: next },
            );
          }}
        >
          {templateScheduleTypes.map((type) => (
            <option key={type} value={type}>
              {tt(`schedule.${type}`)}
            </option>
          ))}
        </FilterSelect>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {tt("fields.scheduleBasis")}{" "}
            <span aria-hidden="true" className="text-error-600">
              *
            </span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {bases.map(({ mode, label, off }) => (
              <label
                key={mode}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${
                  value.mode === mode
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                    : "border-gray-200 dark:border-gray-700"
                } ${off ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-schedule-mode`}
                  value={mode}
                  checked={value.mode === mode}
                  disabled={off}
                  onChange={() =>
                    onChange(
                      mode === "stage"
                        ? {
                            mode,
                            schedule_type: "after_sowing",
                            start: "",
                            end: "",
                          }
                        : { ...value, mode, start: "0", end: "0" },
                    )
                  }
                  className="accent-brand-600 mt-0.5 size-4 shrink-0"
                />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {label}
                </span>
              </label>
            ))}
          </div>
          {stageHint && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {stageHint}
            </p>
          )}
          {value.mode === "stage" && !stageHasTiming && (
            <p className="bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300 mt-2 rounded-lg p-2 text-xs">
              {t("schedule.noStageTiming")}
            </p>
          )}
        </fieldset>
        {value.mode === "fixed" ? (
          (["start", "end"] as const).map((field) => (
            <div key={field}>
              <Label htmlFor={`${idPrefix}-${field}`}>
                {tt(`fields.${field}`, { schedule: typeLabel })}{" "}
                <span aria-hidden="true" className="text-error-600">
                  *
                </span>
              </Label>
              <Input
                id={`${idPrefix}-${field}`}
                type="number"
                min={0}
                max={maxTemplateOffset}
                step={1}
                value={value[field]}
                disabled={disabled}
                placeholder={tt(
                  field === "start"
                    ? "form.startPlaceholder"
                    : "form.endPlaceholder",
                )}
                onChange={(event) =>
                  onChange({ ...value, [field]: event.target.value })
                }
                aria-required="true"
                aria-invalid={!!error}
                error={!!error}
              />
            </div>
          ))
        ) : (
          <p className="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 rounded-lg p-3 text-sm md:col-span-2">
            {tt("form.growthStageScheduleHelp")}
          </p>
        )}
      </div>
      {preview}
      {error && (
        <p role="alert" className="text-error-600 dark:text-error-400 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
