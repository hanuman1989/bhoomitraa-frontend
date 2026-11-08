"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Controller, useController, useForm, useWatch } from "react-hook-form";
import { useTranslations, useFormatter } from "next-intl";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { useModal } from "@/hooks/useModal";
import { saveSeedLot } from "@/actions/admin/seedLots";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Switch from "@/components/admin/form/switch/Switch";
import DatePicker from "@/components/admin/form/date-picker";
import ImagePreview from "@/components/common/ImagePreview";
import { CheckLineIcon, CloudUploadIcon, FileIcon, InfoIcon } from "@/icons";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import SeedConfirmDialog from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog";
import { seedClasses, treatmentStatuses } from "@/types/admin/seed";
import { verificationStatuses } from "@/types/admin/knowledgeSource";
import type {
  SeedLot,
  SeedLotFormValues,
  SeedLotPayload,
  LotSeedProduct,
} from "@/types/admin/seedLot";
import type {
  TimelineOption,
  TimelineOptionPage,
} from "@/types/admin/cropStageTimeline";

const card =
  "rounded-xl shadow-theme-xs [&>div:first-child]:py-4 [&_h3]:text-xl [&_h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function SeedLotForm({
  lot,
  choices,
  selection,
  canReview,
}: {
  lot: SeedLot | null;
  choices?: TimelineOptionPage;
  selection: TimelineOption | null;
  canReview: boolean;
}) {
  const t = useTranslations("seedLots"),
    formatter = useFormatter(),
    router = useRouter();
  const saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [record, setRecord] = useState(lot),
    [failure, setFailure] = useState(""),
    [removalPending, setRemovalPending] = useState(false);
  const [product, setProduct] = useState<LotSeedProduct | null>(
    lot?.seed ?? null,
  );
  const { isOpen, openModal, closeModal } = useModal();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    clearErrors,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SeedLotFormValues>({
    defaultValues: {
      seed_id: lot ? String(lot.seed_id) : "",
      lot_number: lot?.lot_number ?? "",
      seed_class: lot?.seed_class ?? "",
      seed_treatment_status: lot?.seed_treatment_status ?? "",
      production_date: lot?.production_date ?? "",
      test_date: lot?.test_date ?? "",
      valid_until: lot?.valid_until ?? "",
      germination_percentage: lot?.germination_percentage ?? "",
      physical_purity_percentage: lot?.physical_purity_percentage ?? "",
      genetic_purity_percentage: lot?.genetic_purity_percentage ?? "",
      certification_number: lot?.certification_number ?? "",
      certification_body: lot?.certification_body ?? "",
      notes: lot?.notes ?? "",
      verification_status: lot?.verification_status ?? "pending",
      is_active: lot?.is_active ?? true,
      report: [],
    },
    mode: "onTouched",
  });
  const busy = pending || isSubmitting;
  const seedId = useWatch({ control, name: "seed_id" }),
    notes = useWatch({ control, name: "notes" });
  const preview = product?.id === Number(seedId) ? product : null;
  function calendar(value: string) {
    if (!value) return true;
    if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return t("validation.date");
    const date = new Date(`${value}T00:00:00Z`),
      [year, month, day] = value.split("-").map(Number);
    return (
      (date.getUTCFullYear() === year &&
        date.getUTCMonth() + 1 === month &&
        date.getUTCDate() === day) ||
      t("validation.date")
    );
  }
  const { field: production } = useController({
    name: "production_date",
    control,
    rules: { validate: calendar },
  });
  const { field: tested } = useController({
    name: "test_date",
    control,
    rules: {
      validate: {
        calendar,
        order: (value) =>
          !value ||
          !getValues("production_date") ||
          value >= getValues("production_date") ||
          t("validation.testOrder"),
      },
    },
  });
  const { field: expiry } = useController({
    name: "valid_until",
    control,
    rules: {
      validate: {
        calendar,
        order: (value) =>
          !value ||
          !getValues("production_date") ||
          value >= getValues("production_date") ||
          t("validation.expiryOrder"),
      },
    },
  });
  const changeProduction = production.onChange,
    changeTest = tested.onChange,
    changeExpiry = expiry.onChange;
  const onProduction = useCallback(
    (_dates: Date[], value: string) => {
      if (!saving.current) {
        changeProduction(value);
        void trigger(["test_date", "valid_until"]);
      }
    },
    [changeProduction, trigger],
  );
  const onTest = useCallback(
    (_dates: Date[], value: string) => {
      if (!saving.current) changeTest(value);
    },
    [changeTest],
  );
  const onExpiry = useCallback(
    (_dates: Date[], value: string) => {
      if (!saving.current) changeExpiry(value);
    },
    [changeExpiry],
  );
  const percentage = (value: string) =>
    !value ||
    (/^\d+(?:\.\d{1,2})?$/.test(value) &&
      Number(value) <= 100 &&
      Number(value) >= 0) ||
    t("validation.percentage");
  const validateReport = (files: File[]) =>
    files.length === 0 ||
    (files.length === 1 &&
      files[0].size > 0 &&
      files[0].size <= 5 * 1024 * 1024 &&
      /\.(pdf|jpe?g|png)$/i.test(files[0].name) &&
      ["application/pdf", "image/jpeg", "image/png"].includes(files[0].type)) ||
    t("feedback.invalidReport");
  const {
    field: { ref: reportInputRef },
  } = useController({
    name: "report",
    control,
    rules: { validate: validateReport },
  });
  const selectedFile = useWatch({ control, name: "report" })[0];
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled: busy,
    multiple: false,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    onDrop: (accepted, rejected) => {
      if (saving.current || busy) return;
      const valid = validateReport(accepted);
      if (rejected.length || valid !== true) {
        setError("report", {
          type: "validate",
          message: t("feedback.invalidReport"),
        });
        return;
      }
      if (!accepted.length) return;
      clearErrors("report");
      setValue("report", accepted, { shouldDirty: true, shouldValidate: true });
      setRemovalPending(false);
    },
  });
  function submit(values: SeedLotFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const upload = new FormData();
        if (values.report[0]) upload.append("report_file", values.report[0]);
        const result = await saveSeedLot(
          record?.id ?? null,
          {
            seed_id: Number(values.seed_id),
            lot_number: values.lot_number.trim(),
            seed_class: (values.seed_class ||
              null) as SeedLotPayload["seed_class"],
            seed_treatment_status: (values.seed_treatment_status ||
              null) as SeedLotPayload["seed_treatment_status"],
            production_date: values.production_date || null,
            test_date: values.test_date || null,
            valid_until: values.valid_until || null,
            germination_percentage: values.germination_percentage || null,
            physical_purity_percentage:
              values.physical_purity_percentage || null,
            genetic_purity_percentage: values.genetic_purity_percentage || null,
            certification_number: values.certification_number.trim() || null,
            certification_body: values.certification_body.trim() || null,
            notes: values.notes.trim() || null,
            is_active: values.is_active,
            ...(canReview
              ? { verification_status: values.verification_status }
              : !record
                ? { verification_status: "pending" as const }
                : {}),
            ...(removalPending &&
              !values.report.length && { report_file: null }),
          },
          upload,
        );
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            if (field === "report_file" || field.startsWith("report_file."))
              setError("report", { type: "server", message: messages[0] });
            else if (Object.hasOwn(values, field))
              setError(field as keyof SeedLotFormValues, {
                type: "server",
                message: messages[0],
              });
          }
          const message = result.message || t("feedback.failed");
          setFailure(message);
          toast.error(message);
          return;
        }
        setRecord(result.data);
        reset({
          ...values,
          report: [],
          verification_status: result.data.verification_status,
        });
        setRemovalPending(false);
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/seed-lots");
      } catch {
        setFailure(t("feedback.failed"));
        toast.error(t("feedback.failed"));
      } finally {
        saving.current = false;
      }
    });
  }
  return (
    <>
      <form
        onSubmit={(event) => {
          void handleSubmit(submit)(event);
        }}
        noValidate
        aria-busy={busy}
        className="space-y-5"
      >
        {failure && (
          <p
            role="alert"
            className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-4 text-sm"
          >
            {failure}
          </p>
        )}
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-3">
          <fieldset disabled={busy} className="min-w-0 space-y-5 xl:col-span-2">
            <legend className="sr-only">{t("form.basic")}</legend>
            <ComponentCard title={t("form.basic")} className={card}>
              <div className="grid gap-4 md:grid-cols-3">
                <Controller
                  name="seed_id"
                  control={control}
                  rules={{
                    required: t("validation.selection"),
                    validate: (value) =>
                      (Number.isSafeInteger(Number(value)) &&
                        Number(value) > 0) ||
                      t("validation.selection"),
                  }}
                  render={({ field }) => (
                    <TimelineRelationSelect
                      kind="seed"
                      id="lot-seed"
                      label={t("fields.seed_id")}
                      value={field.value}
                      onChange={field.onChange}
                      onSelectionChange={(option) =>
                        setProduct(option?.seed ?? null)
                      }
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      eligible
                      required
                      clearable
                      disabled={busy}
                      initialPage={choices}
                      initialSelection={selection}
                      placeholder={t("form.selectSeed")}
                      error={errors.seed_id?.message}
                    />
                  )}
                />
                <div>
                  <Label htmlFor="lot-number">{t("fields.lot_number")} *</Label>
                  <Input
                    {...register("lot_number", {
                      required: t("validation.required"),
                      validate: (value) =>
                        !!value.trim() || t("validation.required"),
                      maxLength: {
                        value: 100,
                        message: t("validation.max", { count: 100 }),
                      },
                    })}
                    id="lot-number"
                    placeholder={t("form.lotPlaceholder")}
                    aria-required="true"
                    aria-invalid={!!errors.lot_number}
                    aria-describedby="lot-number-error"
                    error={!!errors.lot_number}
                  />
                  <p id="lot-number-error" role="alert" className={errorClass}>
                    {errors.lot_number?.message}
                  </p>
                </div>
                <div>
                  <FilterSelect
                    {...register("seed_class", {
                      validate: (value) =>
                        !value ||
                        seedClasses.some((item) => item === value) ||
                        t("validation.selection"),
                    })}
                    id="lot-class"
                    label={t("fields.seed_class")}
                    aria-invalid={!!errors.seed_class}
                    aria-describedby="lot-class-error"
                  >
                    <option value="">{t("optional")}</option>
                    {seedClasses.map((value) => (
                      <option key={value} value={value}>
                        {t(`classes.${value}`)}
                      </option>
                    ))}
                  </FilterSelect>
                  <p id="lot-class-error" role="alert" className={errorClass}>
                    {errors.seed_class?.message}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <FilterSelect
                    {...register("seed_treatment_status", {
                      validate: (value) =>
                        !value ||
                        treatmentStatuses.some((item) => item === value) ||
                        t("validation.selection"),
                    })}
                    id="lot-treatment"
                    label={t("fields.seed_treatment_status")}
                    aria-invalid={!!errors.seed_treatment_status}
                    aria-describedby="lot-treatment-error"
                  >
                    <option value="">{t("optional")}</option>
                    {treatmentStatuses.map((value) => (
                      <option key={value} value={value}>
                        {t(`treatments.${value}`)}
                      </option>
                    ))}
                  </FilterSelect>
                  <p
                    id="lot-treatment-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.seed_treatment_status?.message}
                  </p>
                </div>
                <div>
                  <Label htmlFor="lot-production">
                    {t("fields.production_date")}
                  </Label>
                  <DatePicker
                    id="lot-production"
                    defaultDate={production.value}
                    onChange={onProduction}
                    inputRef={production.ref}
                    inputProps={{
                      name: production.name,
                      onBlur: production.onBlur,
                      disabled: busy,
                      "aria-invalid": !!errors.production_date,
                      "aria-describedby": "lot-production-error",
                    }}
                    placeholder={t("form.selectDate")}
                  />
                  <p
                    id="lot-production-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.production_date?.message}
                  </p>
                  {production.value && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onProduction([], "")}
                      className="text-brand-500 mt-1 text-xs"
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
                <div>
                  <Label htmlFor="lot-tested">{t("fields.test_date")}</Label>
                  <DatePicker
                    id="lot-tested"
                    defaultDate={tested.value}
                    onChange={onTest}
                    inputRef={tested.ref}
                    inputProps={{
                      name: tested.name,
                      onBlur: tested.onBlur,
                      disabled: busy,
                      "aria-invalid": !!errors.test_date,
                      "aria-describedby": "lot-tested-error",
                    }}
                    placeholder={t("form.selectDate")}
                  />
                  <p id="lot-tested-error" role="alert" className={errorClass}>
                    {errors.test_date?.message}
                  </p>
                  {tested.value && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onTest([], "")}
                      className="text-brand-500 mt-1 text-xs"
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
                <div>
                  <Label htmlFor="lot-expiry">{t("fields.valid_until")}</Label>
                  <DatePicker
                    id="lot-expiry"
                    defaultDate={expiry.value}
                    onChange={onExpiry}
                    inputRef={expiry.ref}
                    inputProps={{
                      name: expiry.name,
                      onBlur: expiry.onBlur,
                      disabled: busy,
                      "aria-invalid": !!errors.valid_until,
                      "aria-describedby": "lot-expiry-error",
                    }}
                    placeholder={t("form.selectDate")}
                  />
                  <p id="lot-expiry-error" role="alert" className={errorClass}>
                    {errors.valid_until?.message}
                  </p>
                  {expiry.value && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onExpiry([], "")}
                      className="text-brand-500 mt-1 text-xs"
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
              </div>
            </ComponentCard>
            <ComponentCard
              title={t("form.quality")}
              desc={t("form.qualityDescription")}
              className={card}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="lot-germination">
                    {t("fields.germination_percentage")}
                  </Label>
                  <Input
                    {...register("germination_percentage", {
                      validate: percentage,
                    })}
                    id="lot-germination"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder={t("form.germinationPlaceholder")}
                    error={!!errors.germination_percentage}
                    aria-invalid={!!errors.germination_percentage}
                    aria-describedby="lot-germination-error"
                  />
                  <p
                    id="lot-germination-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.germination_percentage?.message}
                  </p>
                </div>
                <div>
                  <Label htmlFor="lot-physical">
                    {t("fields.physical_purity_percentage")}
                  </Label>
                  <Input
                    {...register("physical_purity_percentage", {
                      validate: percentage,
                    })}
                    id="lot-physical"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder={t("form.physicalPlaceholder")}
                    error={!!errors.physical_purity_percentage}
                    aria-invalid={!!errors.physical_purity_percentage}
                    aria-describedby="lot-physical-error"
                  />
                  <p
                    id="lot-physical-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.physical_purity_percentage?.message}
                  </p>
                </div>
                <div>
                  <Label htmlFor="lot-genetic">
                    {t("fields.genetic_purity_percentage")}
                  </Label>
                  <Input
                    {...register("genetic_purity_percentage", {
                      validate: percentage,
                    })}
                    id="lot-genetic"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder={t("form.geneticPlaceholder")}
                    error={!!errors.genetic_purity_percentage}
                    aria-invalid={!!errors.genetic_purity_percentage}
                    aria-describedby="lot-genetic-error"
                  />
                  <p id="lot-genetic-error" role="alert" className={errorClass}>
                    {errors.genetic_purity_percentage?.message}
                  </p>
                </div>
              </div>
              <p className="bg-brand-50 dark:bg-brand-500/10 flex items-center gap-2 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300">
                <InfoIcon
                  aria-hidden="true"
                  className="text-brand-500 size-4 shrink-0"
                />
                {t("form.qualityHelp")}
              </p>
            </ComponentCard>
            <ComponentCard title={t("form.certification")} className={card}>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="lot-cert-number">
                    {t("fields.certification_number")}
                  </Label>
                  <Input
                    {...register("certification_number", {
                      maxLength: {
                        value: 100,
                        message: t("validation.max", { count: 100 }),
                      },
                    })}
                    id="lot-cert-number"
                    placeholder={t("form.certificatePlaceholder")}
                    error={!!errors.certification_number}
                    aria-invalid={!!errors.certification_number}
                    aria-describedby="lot-cert-number-error"
                  />
                  <p
                    id="lot-cert-number-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.certification_number?.message}
                  </p>
                </div>
                <div>
                  <Label htmlFor="lot-cert-body">
                    {t("fields.certification_body")}
                  </Label>
                  <Input
                    {...register("certification_body", {
                      maxLength: {
                        value: 200,
                        message: t("validation.max", { count: 200 }),
                      },
                    })}
                    id="lot-cert-body"
                    placeholder={t("form.bodyPlaceholder")}
                    error={!!errors.certification_body}
                    aria-invalid={!!errors.certification_body}
                    aria-describedby="lot-cert-body-error"
                  />
                  <p
                    id="lot-cert-body-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.certification_body?.message}
                  </p>
                </div>
                <div>
                  {canReview ? (
                    <FilterSelect
                      {...register("verification_status", {
                        required: t("validation.selection"),
                        validate: (value) =>
                          verificationStatuses.includes(value) ||
                          t("validation.selection"),
                      })}
                      id="lot-verification"
                      label={`${t("fields.verification_status")} *`}
                      aria-required="true"
                      aria-invalid={!!errors.verification_status}
                      aria-describedby="lot-verification-error"
                    >
                      {verificationStatuses.map((value) => (
                        <option key={value} value={value}>
                          {t(`verification.${value}`)}
                        </option>
                      ))}
                    </FilterSelect>
                  ) : (
                    <>
                      <Label htmlFor="lot-verification">
                        {t("fields.verification_status")}
                      </Label>
                      <Input
                        id="lot-verification"
                        readOnly
                        value={t(
                          `verification.${record?.verification_status ?? "pending"}`,
                        )}
                      />
                    </>
                  )}
                  <p
                    id="lot-verification-error"
                    role="alert"
                    className={errorClass}
                  >
                    {errors.verification_status?.message}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lot-verifier">
                    {t("fields.verified_by")}
                  </Label>
                  <Input
                    id="lot-verifier"
                    readOnly
                    value={
                      record?.verifier
                        ? t("verifierName", {
                            first: record.verifier.first_name,
                            last: record.verifier.last_name,
                          })
                        : t("form.afterVerification")
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lot-verified-at">
                    {t("fields.verified_at")}
                  </Label>
                  <Input
                    id="lot-verified-at"
                    readOnly
                    value={
                      record?.verified_at
                        ? formatter.dateTime(new Date(record.verified_at), {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "UTC",
                          })
                        : t("form.afterVerification")
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="lot-notes">{t("fields.notes")}</Label>
                <textarea
                  {...register("notes", {
                    maxLength: {
                      value: 65535,
                      message: t("validation.max", { count: 65535 }),
                    },
                  })}
                  id="lot-notes"
                  rows={4}
                  placeholder={t("form.notesPlaceholder")}
                  aria-invalid={!!errors.notes}
                  aria-describedby="lot-notes-error"
                  className="focus:border-brand-500 aria-invalid:border-error-500 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-gray-100"
                />
                <p id="lot-notes-error" role="alert" className={errorClass}>
                  {errors.notes?.message}
                </p>
                <p className="mt-1 text-end text-xs text-gray-500 dark:text-gray-400">
                  {t("form.characterCount", {
                    count: notes.length,
                    max: 65535,
                  })}
                </p>
              </div>
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                {t(canReview ? "form.reviewHelp" : "form.permissionHelp")}
              </p>
            </ComponentCard>
          </fieldset>
          <aside className="min-w-0 space-y-5">
            <ComponentCard title={t("form.previewTitle")} className={card}>
              {preview ? (
                <div className="flex flex-wrap items-start gap-4">
                  <ImagePreview
                    src={preview.primary_image?.image_url}
                    alt={
                      preview.primary_image?.alt_text ??
                      preview.name ??
                      t("notAvailable")
                    }
                    width={104}
                    height={104}
                    className="size-24 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                  />
                  <dl className="min-w-0 flex-1 space-y-2 text-sm text-gray-600 dark:text-gray-400 [&>div]:flex [&>div]:flex-wrap [&>div]:justify-between [&>div]:gap-x-3">
                    <div>
                      <dt>{t("fields.seed_id")}</dt>
                      <dd className="font-semibold text-gray-900 dark:text-gray-100">
                        {preview.name ?? t("recordId", { id: preview.id })}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("fields.crop")}</dt>
                      <dd>{preview.crop_name ?? t("notAvailable")}</dd>
                    </div>
                    <div>
                      <dt>{t("fields.variety")}</dt>
                      <dd>{preview.crop_variety_name ?? t("notAvailable")}</dd>
                    </div>
                    <div>
                      <dt>{t("fields.sku")}</dt>
                      <dd>{preview.sku ?? t("notAvailable")}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("form.previewEmpty")}
                </p>
              )}
            </ComponentCard>
            <ComponentCard
              title={t("report.title")}
              desc={t("report.description")}
              className={card}
            >
              <div ref={reportInputRef} tabIndex={-1} className="space-y-3">
                <div
                  {...getRootProps()}
                  role="button"
                  aria-label={t("report.browse")}
                  aria-describedby="lot-report-error"
                  aria-disabled={busy}
                  className={`focus-visible:outline-brand-500 cursor-pointer rounded-xl border border-dashed p-5 text-center focus-visible:outline-2 ${isDragActive ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-300 dark:border-gray-700"}`}
                >
                  <input {...getInputProps()} />
                  <CloudUploadIcon
                    aria-hidden="true"
                    className="text-brand-500 mx-auto mb-3 size-9"
                  />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t("report.browse")}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t("report.allowed")}
                  </p>
                </div>
                {selectedFile ? (
                  <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <p className="flex items-start gap-2 text-sm break-all text-gray-700 dark:text-gray-300">
                      <FileIcon
                        aria-hidden="true"
                        className="text-brand-500 size-5 shrink-0"
                      />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("report.size", {
                        size: (selectedFile.size / 1024 / 1024).toFixed(2),
                      })}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setValue("report", [], {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className="text-brand-500 text-sm"
                    >
                      {t("report.discard")}
                    </button>
                  </div>
                ) : record?.report_url && !removalPending ? (
                  <div className="space-y-2">
                    <Link
                      href={`/admin/seed-lots/${record.id}/report`}
                      prefetch={false}
                      download
                      className="text-brand-500 block text-sm hover:underline"
                    >
                      {t("report.download")}
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!saving.current) openModal();
                      }}
                      className="text-error-600 dark:text-error-400 text-sm"
                    >
                      {t("report.remove")}
                    </button>
                  </div>
                ) : null}
                {removalPending && (
                  <div className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 space-y-2 rounded-lg p-3 text-sm">
                    <p>{t("report.removalPending")}</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRemovalPending(false)}
                      className="text-brand-500 font-medium"
                    >
                      {t("report.undo")}
                    </button>
                  </div>
                )}
                <p id="lot-report-error" role="alert" className={errorClass}>
                  {errors.report?.message}
                </p>
              </div>
            </ComponentCard>
            <ComponentCard title={t("form.publication")} className={card}>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={busy}
                    label={t("active")}
                  />
                )}
              />
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                {t("form.activeHelp")}
              </p>
            </ComponentCard>
            <ComponentCard
              title={t("form.guidelines")}
              className={`${card} bg-brand-25 dark:bg-brand-500/5`}
            >
              <ul className="marker:text-brand-500 list-disc space-y-3 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <li>{t("form.guideProduct")}</li>
                <li>{t("form.guideNumber")}</li>
                <li>{t("form.guideQuality")}</li>
                <li>{t("form.guideReport")}</li>
                <li>{t("form.guideVerification")}</li>
              </ul>
            </ComponentCard>
          </aside>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!saving.current) router.push("/admin/seed-lots");
            }}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <CheckLineIcon aria-hidden="true" className="size-5" />
            {t(busy ? "saving" : record ? "form.update" : "form.save")}
          </button>
        </div>
      </form>
      {isOpen && (
        <SeedConfirmDialog
          title={t("report.removeTitle")}
          description={t("report.removeConfirm")}
          confirmLabel={t("report.remove")}
          destructive
          onClose={closeModal}
          onConfirm={() => {
            setRemovalPending(true);
            closeModal();
          }}
        />
      )}
    </>
  );
}
