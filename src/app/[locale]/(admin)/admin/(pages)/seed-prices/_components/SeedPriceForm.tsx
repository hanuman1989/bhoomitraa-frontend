"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Controller, useController, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { saveSeedPrice } from "@/actions/admin/seedPrices";
import ComponentCard from "@/components/admin/common/ComponentCard";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import DatePicker from "@/components/admin/form/date-picker";
import Switch from "@/components/admin/form/switch/Switch";
import ImagePreview from "@/components/common/ImagePreview";
import RegionScopeSelector, {
  validDistrictSelection,
} from "@/components/admin/common/RegionScopeSelector";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import { BoxCubeIcon, CalenderIcon, CheckLineIcon } from "@/icons";
import { seedUnitCodes } from "@/types/admin/seed";
import {
  seedPriceTypes,
  type SeedPrice,
  type SeedPriceFormValues,
  type SeedPricePayload,
  type SeedPriceProduct,
} from "@/types/admin/seedPrice";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";

const card =
  "rounded-xl shadow-theme-xs [&>div:first-child]:py-4 [&_h3]:text-xl [&_h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";
export default function SeedPriceForm({
  price,
  choices,
  selections,
  states,
  canReview,
}: {
  price: SeedPrice | null;
  choices: TimelineChoices;
  selections: TimelineSelections;
  states: TimelineState[];
  canReview: boolean;
}) {
  const t = useTranslations("seedPrices"),
    tr = useTranslations("stageTimelines"),
    router = useRouter(),
    saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [record, setRecord] = useState(price),
    [failure, setFailure] = useState("");
  const [product, setProduct] = useState<SeedPriceProduct | null>(
    price?.seed ?? null,
  );
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SeedPriceFormValues>({
    defaultValues: {
      seed_id: price ? String(price.seed_id) : "",
      seller_name: price?.seller_name ?? "",
      price_type: price?.price_type ?? "",
      package_quantity: price?.package_quantity ?? "",
      package_unit_code: price?.package_unit_code ?? "",
      package_price: price?.package_price ?? "",
      currency_code: price?.currency_code ?? "INR",
      effective_from: price?.effective_from ?? "",
      effective_to: price?.effective_to ?? "",
      source_id: price?.source_id ? String(price.source_id) : "",
      region_scope: price?.region_scope ?? "all",
      region_ids: price?.region_ids ?? [],
      is_active: price?.is_active ?? false,
    },
    mode: "onTouched",
  });
  const busy = pending || isSubmitting,
    locked = !!record?.is_active && !canReview;
  const seedId = useWatch({ control, name: "seed_id" }),
    scope = useWatch({ control, name: "region_scope" });
  const preview = product?.id === Number(seedId) ? product : null;
  const units = preview
    ? [
        "seed",
        "tuber",
        "bulb",
        "clove",
        "rhizome",
        "sett",
        "corm",
        "other",
      ].includes(preview.material_type)
      ? ["g", "kg", "piece"]
      : ["piece", "plant"]
    : seedUnitCodes;
  const validId = (value: string) =>
    (Number.isSafeInteger(Number(value)) && Number(value) > 0) ||
    t("validation.selection");
  function decimal(value: string, integerDigits: number, allowZero: boolean) {
    return (
      (/^\d+(?:\.\d{1,4})?$/.test(value) &&
        value.split(".")[0].replace(/^0+/, "").length <= integerDigits &&
        (allowZero || /[1-9]/.test(value))) ||
      t(allowZero ? "validation.price" : "validation.quantity")
    );
  }
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
  const { field: from } = useController({
    name: "effective_from",
    control,
    rules: { required: t("validation.required"), validate: calendar },
  });
  const { field: to } = useController({
    name: "effective_to",
    control,
    rules: {
      validate: {
        calendar,
        order: (value) =>
          !value ||
          !getValues("effective_from") ||
          value >= getValues("effective_from") ||
          t("validation.period"),
      },
    },
  });
  const changeFrom = from.onChange,
    changeTo = to.onChange;
  const onFrom = useCallback(
    (_dates: Date[], value: string) => {
      if (!saving.current) {
        changeFrom(value);
        void trigger("effective_to");
      }
    },
    [changeFrom, trigger],
  );
  const onTo = useCallback(
    (_dates: Date[], value: string) => {
      if (!saving.current) changeTo(value);
    },
    [changeTo],
  );
  function submit(values: SeedPriceFormValues) {
    if (saving.current || locked) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const result = await saveSeedPrice(record?.id ?? null, {
          seed_id: Number(values.seed_id),
          seller_name: values.seller_name.trim() || null,
          price_type: values.price_type as SeedPricePayload["price_type"],
          package_quantity: values.package_quantity,
          package_unit_code:
            values.package_unit_code as SeedPricePayload["package_unit_code"],
          package_price: values.package_price,
          currency_code: values.currency_code,
          effective_from: values.effective_from,
          effective_to: values.effective_to || null,
          source_id: values.source_id ? Number(values.source_id) : null,
          region_scope: values.region_scope,
          region_ids: values.region_scope === "all" ? [] : values.region_ids,
          is_active: values.is_active,
        });
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            if (field === "region_ids" || field.startsWith("region_ids."))
              setError("region_ids", { type: "server", message: messages[0] });
            else if (Object.hasOwn(values, field))
              setError(field as keyof SeedPriceFormValues, {
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
        setProduct(result.data.seed);
        reset({ ...values, is_active: result.data.is_active });
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/seed-prices");
      } catch {
        setFailure(t("feedback.failed"));
        toast.error(t("feedback.failed"));
      } finally {
        saving.current = false;
      }
    });
  }
  return (
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
      {locked && (
        <p
          role="status"
          className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 rounded-xl p-4 text-sm"
        >
          {t("form.locked")}
        </p>
      )}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-5">
        <fieldset
          disabled={busy || locked}
          className="min-w-0 space-y-5 xl:col-span-3"
        >
          <legend className="sr-only">{t("form.pricing")}</legend>
          <ComponentCard
            className={card}
            title={
              <span className="flex items-center gap-3">
                <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/10 rounded-xl p-2">
                  <BoxCubeIcon className="size-6" aria-hidden="true" />
                </span>
                {t("form.pricing")}
              </span>
            }
            desc={t("form.pricingDescription")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="seed_id"
                control={control}
                rules={{
                  required: t("validation.required"),
                  validate: validId,
                }}
                render={({ field }) => (
                  <TimelineRelationSelect
                    kind="seed"
                    id="price-seed"
                    label={t("fields.seed_id")}
                    value={field.value}
                    onChange={(value) => {
                      if (saving.current) return;
                      if (value !== field.value) {
                        field.onChange(value);
                        setValue("package_unit_code", "", {
                          shouldDirty: true,
                        });
                        clearErrors("package_unit_code");
                      }
                    }}
                    onSelectionChange={(option) =>
                      setProduct(option?.seed ?? null)
                    }
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    initialPage={choices.seed}
                    initialSelection={selections.seed}
                    disabled={busy || locked}
                    eligible
                    required
                    clearable
                    placeholder={t("form.selectSeed")}
                    error={errors.seed_id?.message}
                  />
                )}
              />
              <div>
                <Label htmlFor="price-amount">
                  {t("fields.package_price")} *
                </Label>
                <Input
                  {...register("package_price", {
                    required: t("validation.required"),
                    validate: (value) => decimal(value, 12, true),
                  })}
                  id="price-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder={t("form.pricePlaceholder")}
                  aria-required="true"
                  aria-invalid={!!errors.package_price}
                  aria-describedby="price-amount-error price-amount-help"
                  error={!!errors.package_price}
                />
                <p id="price-amount-error" role="alert" className={errorClass}>
                  {errors.package_price?.message}
                </p>
                <p
                  id="price-amount-help"
                  className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  {t("form.priceHelp")}
                </p>
              </div>
              <div>
                <Label htmlFor="price-quantity">
                  {t("fields.package_quantity")} *
                </Label>
                <Input
                  {...register("package_quantity", {
                    required: t("validation.required"),
                    validate: (value) => decimal(value, 10, false),
                  })}
                  id="price-quantity"
                  type="text"
                  inputMode="decimal"
                  placeholder={t("form.quantityPlaceholder")}
                  aria-required="true"
                  aria-invalid={!!errors.package_quantity}
                  aria-describedby="price-quantity-error"
                  error={!!errors.package_quantity}
                />
                <p
                  id="price-quantity-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.package_quantity?.message}
                </p>
              </div>
              <div>
                <FilterSelect
                  {...register("package_unit_code", {
                    required: t("validation.required"),
                    validate: (value) =>
                      units.some((unit) => unit === value) ||
                      t("validation.unit"),
                  })}
                  id="price-unit"
                  label={`${t("fields.package_unit_code")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.package_unit_code}
                  aria-describedby="price-unit-error"
                >
                  <option value="">{t("form.selectUnit")}</option>
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {t(`units.${unit}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p id="price-unit-error" role="alert" className={errorClass}>
                  {errors.package_unit_code?.message}
                </p>
              </div>
              <div>
                <FilterSelect
                  {...register("price_type", {
                    required: t("validation.required"),
                    validate: (value) =>
                      seedPriceTypes.some((type) => type === value) ||
                      t("validation.selection"),
                  })}
                  id="price-type"
                  label={`${t("fields.price_type")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.price_type}
                  aria-describedby="price-type-error"
                >
                  <option value="">{t("form.selectType")}</option>
                  {seedPriceTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p id="price-type-error" role="alert" className={errorClass}>
                  {errors.price_type?.message}
                </p>
              </div>
              <div>
                <FilterSelect
                  {...register("currency_code", {
                    required: t("validation.required"),
                    validate: (value) =>
                      value === "INR" || t("validation.currency"),
                  })}
                  id="price-currency"
                  label={`${t("fields.currency_code")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.currency_code}
                  aria-describedby="price-currency-error"
                >
                  <option value="INR">{t("form.inr")}</option>
                </FilterSelect>
                <p
                  id="price-currency-error"
                  role="alert"
                  className={errorClass}
                >
                  {errors.currency_code?.message}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="price-seller">{t("fields.seller_name")}</Label>
                <Input
                  {...register("seller_name", {
                    maxLength: {
                      value: 200,
                      message: t("validation.max", { count: 200 }),
                    },
                  })}
                  id="price-seller"
                  maxLength={200}
                  placeholder={t("form.sellerPlaceholder")}
                  aria-invalid={!!errors.seller_name}
                  aria-describedby="price-seller-error"
                  error={!!errors.seller_name}
                />
                <p id="price-seller-error" role="alert" className={errorClass}>
                  {errors.seller_name?.message}
                </p>
              </div>
            </div>
          </ComponentCard>
          <ComponentCard
            className={card}
            title={
              <span className="flex items-center gap-3">
                <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/10 rounded-xl p-2">
                  <CalenderIcon aria-hidden="true" className="size-6" />
                </span>
                {t("form.validity")}
              </span>
            }
            desc={t("form.validityDescription")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="price-from">
                  {t("fields.effective_from")} *
                </Label>
                <DatePicker
                  id="price-from"
                  defaultDate={from.value}
                  onChange={onFrom}
                  inputRef={from.ref}
                  inputProps={{
                    name: from.name,
                    onBlur: from.onBlur,
                    disabled: busy || locked,
                    "aria-required": true,
                    "aria-invalid": !!errors.effective_from,
                    "aria-describedby": "price-from-error",
                  }}
                  placeholder={t("form.selectDate")}
                />
                <p id="price-from-error" role="alert" className={errorClass}>
                  {errors.effective_from?.message}
                </p>
              </div>
              <div>
                <Label htmlFor="price-to">{t("fields.effective_to")}</Label>
                <DatePicker
                  id="price-to"
                  defaultDate={to.value}
                  onChange={onTo}
                  inputRef={to.ref}
                  inputProps={{
                    name: to.name,
                    onBlur: to.onBlur,
                    disabled: busy || locked,
                    "aria-invalid": !!errors.effective_to,
                    "aria-describedby": "price-to-error",
                  }}
                  placeholder={t("form.selectDate")}
                />
                <p id="price-to-error" role="alert" className={errorClass}>
                  {errors.effective_to?.message}
                </p>
                {to.value && (
                  <button
                    type="button"
                    disabled={busy || locked}
                    onClick={() => onTo([], "")}
                    className="text-brand-500 mt-1 text-xs"
                  >
                    {t("clearDate")}
                  </button>
                )}
              </div>
            </div>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch
                  label={t("fields.is_active")}
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={busy || locked || !canReview}
                />
              )}
            />
            <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
              {t(canReview ? "form.activeHelp" : "form.reviewHelp")}
            </p>
          </ComponentCard>
          <ComponentCard
            title={t("form.source")}
            desc={t("form.sourceHelp")}
            className={card}
          >
            <Controller
              name="source_id"
              control={control}
              rules={{ validate: (value) => !value || validId(value) }}
              render={({ field }) => (
                <TimelineRelationSelect
                  kind="source"
                  id="price-source"
                  label={t("fields.source_id")}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  initialPage={choices.source}
                  initialSelection={selections.source}
                  disabled={busy || locked}
                  eligible
                  placeholder={t("form.selectSource")}
                  emptyLabel={t("form.noSource")}
                  error={errors.source_id?.message}
                />
              )}
            />
          </ComponentCard>
        </fieldset>
        <aside className="min-w-0 space-y-5 xl:col-span-2">
          <Controller
            name="region_ids"
            control={control}
            rules={{
              validate: (ids) =>
                getValues("region_scope") === "all" ||
                validDistrictSelection(ids, states, record?.region_ids ?? []) ||
                tr("validation.districts"),
            }}
            render={({ field }) => (
              <RegionScopeSelector
                scope={scope}
                scopeInput={register("region_scope", {
                  required: tr("validation.scope"),
                  validate: (value) =>
                    value === "all" ||
                    value === "specific" ||
                    tr("validation.scope"),
                  onChange: (event) => {
                    if (event.target.value === "all")
                      setValue("region_ids", [], {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                  },
                })}
                states={states}
                selectedIds={field.value}
                onChange={field.onChange}
                districtRef={field.ref}
                busy={busy || locked}
                scopeError={errors.region_scope?.message}
                districtError={errors.region_ids?.message}
              />
            )}
          />
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
                  width={96}
                  height={96}
                  className="size-24 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                />
                <dl className="min-w-0 flex-1 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <dt className="text-xs">{t("fields.seed_id")}</dt>
                    <dd className="font-semibold text-gray-900 dark:text-gray-100">
                      {preview.name ?? t("recordId", { id: preview.id })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs">{t("fields.crop")}</dt>
                    <dd>{preview.crop_name ?? t("notAvailable")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs">{t("fields.variety")}</dt>
                    <dd>{preview.crop_variety_name ?? t("notAvailable")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs">{t("fields.sku")}</dt>
                    <dd>{preview.sku ?? t("notAvailable")}</dd>
                  </div>
                  {preview.reference_pack_quantity &&
                    preview.reference_pack_unit_code && (
                      <div>
                        <dt className="text-xs">{t("fields.referencePack")}</dt>
                        <dd>
                          {t("packageValue", {
                            quantity: preview.reference_pack_quantity,
                            unit: t(
                              `units.${preview.reference_pack_unit_code}`,
                            ),
                          })}
                        </dd>
                      </div>
                    )}
                </dl>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("form.previewEmpty")}
              </p>
            )}
          </ComponentCard>
        </aside>
      </div>
      <div className="shadow-theme-xs flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!saving.current) router.push("/admin/seed-prices");
          }}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
        >
          {t("back")}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!saving.current) router.push("/admin/seed-prices");
            }}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            {t("cancel")}
          </button>
          {!locked && (
            <button
              type="submit"
              disabled={busy}
              className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckLineIcon aria-hidden="true" className="size-5" />
              {t(busy ? "saving" : record ? "form.update" : "form.save")}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
