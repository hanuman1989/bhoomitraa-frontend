"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Controller, useController, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { generateFarmerSmartTimelinePreviewAction } from "@/actions/admin/farmerSmartTimeline";
import ComponentCard from "@/components/admin/common/ComponentCard";
import DatePicker from "@/components/admin/form/date-picker";
import Label from "@/components/admin/form/Label";
import { CalenderIcon, ShootingStarIcon } from "@/icons";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import type { TimelineChoices } from "@/types/admin/cropStageTimeline";
import type {
  TimelineGeneratorValues,
  TimelinePreviewData,
} from "@/types/admin/farmerSmartTimeline";
import TimelinePreview from "./TimelinePreview";

const defaults: TimelineGeneratorValues = {
  crop_id: "",
  crop_variety_id: "",
  season_id: "",
  sowing_date: "",
  district_id: "",
};

export default function TimelineGeneratorForm({
  choices,
  initialFailure,
}: {
  choices: TimelineChoices;
  initialFailure: string;
}) {
  const t = useTranslations("farmerSmartTimeline");
  const requesting = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState(initialFailure);
  const [result, setResult] = useState<{
    input: TimelineGeneratorValues;
    data: TimelinePreviewData;
  } | null>(null);
  const {
    control,
    setValue,
    clearErrors,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TimelineGeneratorValues>({
    defaultValues: defaults,
    mode: "onTouched",
  });
  const values = useWatch({ control });
  const crop = values.crop_id ?? "";
  const busy = pending || isSubmitting;
  const validId = (value: string) =>
    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
    t("validation.selection");
  const { field: dateField } = useController({
    name: "sowing_date",
    control,
    rules: {
      required: t("validation.date"),
      validate: (value) => {
        if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value))
          return t("validation.date");
        const date = new Date(`${value}T00:00:00Z`);
        const [year, month, day] = value.split("-").map(Number);
        return (
          (date.getUTCFullYear() === year &&
            date.getUTCMonth() + 1 === month &&
            date.getUTCDate() === day) ||
          t("validation.date")
        );
      },
    },
  });
  const changeDate = dateField.onChange;
  const onDateChange = useCallback(
    (_dates: Date[], date: string) => {
      if (!requesting.current) changeDate(date);
    },
    [changeDate],
  );
  const matches =
    result &&
    result.input.crop_id === values.crop_id &&
    result.input.crop_variety_id === values.crop_variety_id &&
    result.input.season_id === values.season_id &&
    result.input.sowing_date === values.sowing_date &&
    result.input.district_id === values.district_id;

  function submit(input: TimelineGeneratorValues) {
    if (requesting.current) return;
    requesting.current = true;
    setFailure("");
    setResult(null);
    clearErrors();
    startTransition(async () => {
      try {
        const response = await generateFarmerSmartTimelinePreviewAction({
          crop_id: Number(input.crop_id),
          crop_variety_id: input.crop_variety_id
            ? Number(input.crop_variety_id)
            : null,
          season_id: Number(input.season_id),
          sowing_date: input.sowing_date,
          district_id: Number(input.district_id),
        });
        if (!response.success || !response.data) {
          for (const [field, messages] of Object.entries(
            response.errors ?? {},
          )) {
            if (!messages[0]) continue;
            switch (field) {
              case "crop_id":
              case "crop_variety_id":
              case "season_id":
              case "sowing_date":
              case "district_id":
                setError(field, { type: "server", message: messages[0] });
            }
          }
          const message = response.message || t("feedback.failed");
          setFailure(message);
          toast.error(message);
          return;
        }
        setResult({ input: { ...input }, data: response.data });
        previewRef.current?.focus();
      } catch {
        setFailure(t("feedback.failed"));
        toast.error(t("feedback.failed"));
      } finally {
        requesting.current = false;
      }
    });
  }

  return (
    <div className="min-w-0 space-y-5">
      <ComponentCard
        title={
          <span className="text-brand-600 dark:text-brand-300 flex items-center gap-3">
            <CalenderIcon aria-hidden="true" className="size-5" />
            {t("form.title")}
          </span>
        }
        className="shadow-theme-xs rounded-xl [&>div:first-child]:py-3 [&>div:nth-child(2)]:p-4"
      >
        <form
          onSubmit={(event) => {
            void handleSubmit(submit)(event);
          }}
          noValidate
          aria-busy={busy}
        >
          <fieldset
            disabled={busy}
            className="grid min-w-0 items-start gap-4 sm:grid-cols-2 2xl:grid-cols-6"
          >
            <legend className="sr-only">{t("form.title")}</legend>
            <Controller
              name="crop_id"
              control={control}
              rules={{ required: t("validation.selection"), validate: validId }}
              render={({ field }) => (
                <TimelineRelationSelect
                  kind="crop"
                  id="smart-timeline-crop"
                  label={t("fields.crop")}
                  value={field.value}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  onChange={(value) => {
                    if (requesting.current || field.value === value) return;
                    field.onChange(value);
                    setValue("crop_variety_id", "", { shouldDirty: true });
                    clearErrors("crop_variety_id");
                  }}
                  initialPage={choices.crop}
                  eligible
                  required
                  clearable
                  disabled={busy}
                  error={errors.crop_id?.message}
                  placeholder={t("placeholders.crop")}
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
                  id="smart-timeline-variety"
                  label={t("fields.variety")}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  cropId={crop ? Number(crop) : null}
                  eligible
                  disabled={busy || !crop}
                  error={errors.crop_variety_id?.message}
                  placeholder={t("placeholders.variety")}
                  emptyLabel={t("allVarieties")}
                />
              )}
            />
            <Controller
              name="season_id"
              control={control}
              rules={{ required: t("validation.selection"), validate: validId }}
              render={({ field }) => (
                <TimelineRelationSelect
                  kind="season"
                  id="smart-timeline-season"
                  label={t("fields.season")}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  initialPage={choices.season}
                  eligible
                  required
                  clearable
                  disabled={busy}
                  error={errors.season_id?.message}
                  placeholder={t("placeholders.season")}
                />
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="smart-timeline-date">
                {t("fields.sowingDate")}{" "}
                <span aria-hidden="true" className="text-error-600">
                  *
                </span>
              </Label>
              <DatePicker
                id="smart-timeline-date"
                mode="single"
                defaultDate={dateField.value}
                onChange={onDateChange}
                inputRef={dateField.ref}
                inputProps={{
                  name: dateField.name,
                  onBlur: dateField.onBlur,
                  disabled: busy,
                  "aria-required": true,
                  "aria-invalid": !!errors.sowing_date,
                  "aria-describedby": "smart-timeline-date-error",
                }}
                placeholder={t("placeholders.date")}
              />
              <p
                id="smart-timeline-date-error"
                role="alert"
                className="text-error-600 dark:text-error-400 text-xs"
              >
                {errors.sowing_date?.message}
              </p>
            </div>
            <Controller
              name="district_id"
              control={control}
              rules={{ required: t("validation.selection"), validate: validId }}
              render={({ field }) => (
                <TimelineRelationSelect
                  kind="district"
                  id="smart-timeline-district"
                  label={t("fields.district")}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  initialPage={choices.district}
                  eligible
                  required
                  clearable
                  disabled={busy}
                  error={errors.district_id?.message}
                  placeholder={t("placeholders.district")}
                  emptyLabel={t("clearDistrict")}
                />
              )}
            />
            <div className="sm:pt-7">
              <button
                type="submit"
                disabled={busy}
                className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
              >
                {busy ? (
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                ) : (
                  <ShootingStarIcon aria-hidden="true" className="size-4" />
                )}
                {t(busy ? "generating" : "generate")}
              </button>
            </div>
          </fieldset>
        </form>
        {failure && (
          <p
            role="alert"
            className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-lg p-3 text-sm"
          >
            {failure}
          </p>
        )}
      </ComponentCard>
      <div
        ref={previewRef}
        tabIndex={-1}
        aria-label={t("preview.title")}
        className="focus-visible:outline-brand-300 rounded-xl focus-visible:outline-2"
      >
        <TimelinePreview
          data={result && matches ? result.data : null}
          loading={busy}
          stale={!!result && !matches}
        />
      </div>
    </div>
  );
}
