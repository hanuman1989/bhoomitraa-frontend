"use client";
import { useEffect, useState, startTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  getCropCatalog,
  getCropOptions,
  getCropSeedRecommendation,
} from "@/actions/account/farm-crops";
import Input from "@/components/admin/form/input/InputField";
import type {
  CropPrice,
  CropSeed,
  CropStepProps,
  SeedRecommendation,
  SeedStepPayload,
} from "@/types/account/farmCrop";
import {
  CropChoice,
  CropField,
  CropImage,
  CropMoney,
  CropNotice,
  CropSection,
  CropSummaryStrip,
  cropControl,
  cropFieldErrors,
} from "./CropUi";
import ProductSelectionDialog from "./ProductSelectionDialog";
import { GridIcon } from "@/icons";

export default function SeedSowingStep({
  crop,
  busy,
  onSave,
  onDirty,
}: CropStepProps) {
  const t = useTranslations("farmerCrops");
  const saved = crop.seed_sowing_details;
  const [today] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SeedStepPayload>({
    defaultValues: {
      seed_source: saved.seed_source ?? "catalogue",
      seed_id: saved.seed?.id ?? null,
      sowing_date: crop.sowing_date ?? today,
      quantity_mode: saved.quantity_mode ?? "unknown",
      seed_quantity: saved.seed_quantity,
      seed_quantity_unit: saved.seed_quantity_unit ?? "kg",
      seed_price_id: saved.purchase?.price_id ?? null,
      manual_estimated_cost: saved.purchase?.manual_estimated_cost ?? null,
      seed_notes: saved.seed_notes ?? "",
    },
  });
  const values = useWatch({ control });
  const [products, setProducts] = useState<CropSeed[]>([]);
  const [chosen, setChosen] = useState<CropSeed | null>(saved.seed);
  const [recommendation, setRecommendation] =
    useState<SeedRecommendation | null>(null);
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [more, setMore] = useState(false);
  const [error, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [planningLoading, setPlanningLoading] = useState(false);
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      const result = await getCropCatalog("seeds", {
        crop_id: crop.crop.id,
        crop_variety_id: crop.crop_variety?.id,
        per_page: 4,
      });
      if (!active) return;
      setLoading(false);
      if (result.success && result.data) {
        setProducts(result.data.data);
        setErrorMessage("");
      } else setErrorMessage(result.message);
    });
    return () => {
      active = false;
    };
  }, [crop.crop.id, crop.crop_variety?.id, attempt]);
  useEffect(() => {
    if (values.seed_source !== "catalogue" || !values.seed_id) return;
    let active = true;
    startTransition(async () => {
      setPlanningLoading(true);
      setRecommendation(null);
      setPrices([]);
      const [rec, price] = await Promise.all([
        getCropSeedRecommendation(crop.id, values.seed_id!),
        getCropOptions("seedPrices", {
          farm_id: crop.farm.id,
          seed_id: values.seed_id!,
          per_page: 100,
        }),
      ]);
      if (!active) return;
      setPlanningLoading(false);
      if (rec.success && rec.data) setRecommendation(rec.data);
      if (price.success && price.data) setPrices(price.data);
      if (!rec.success || !price.success)
        setErrorMessage(rec.message || price.message);
    });
    return () => {
      active = false;
    };
  }, [crop.id, crop.farm.id, values.seed_id, values.seed_source, attempt]);
  const seed =
    chosen?.id === values.seed_id
      ? chosen
      : products.find((s) => s.id === values.seed_id);
  const visible =
    chosen && !products.some((s) => s.id === chosen.id)
      ? [...products, chosen]
      : products;
  const quantity =
    values.quantity_mode === "suggested"
      ? recommendation?.recommended_quantity
      : values.quantity_mode === "custom"
        ? values.seed_quantity
        : null;
  const unit =
    values.quantity_mode === "suggested"
      ? recommendation?.quantity_unit
      : values.seed_quantity_unit;
  const price = prices.find((p) => p.id === values.seed_price_id);
  const compatibleQuantity =
    quantity && price
      ? unit === price.package_unit_code
        ? Number(quantity)
        : unit === "g" && price.package_unit_code === "kg"
          ? Number(quantity) / 1000
          : unit === "kg" && price.package_unit_code === "g"
            ? Number(quantity) * 1000
            : null
      : null;
  const packages =
    compatibleQuantity !== null && price && Number(price.package_quantity) > 0
      ? Math.ceil(compatibleQuantity / Number(price.package_quantity))
      : null;
  const cost =
    packages !== null && price
      ? packages * Number(price.package_price)
      : values.manual_estimated_cost;
  function selectSeed(s: CropSeed) {
    setChosen(s);
    setValue("seed_source", "catalogue", { shouldDirty: true });
    setValue("seed_id", s.id, { shouldDirty: true, shouldValidate: true });
    setValue("seed_price_id", null, { shouldDirty: true });
  }
  return (
    <form
      id="crop-step-form"
      className="space-y-5"
      onSubmit={handleSubmit(async (data) => {
        if (planningLoading) return;
        const result = await onSave(3, {
          ...data,
          seed_id: data.seed_source === "catalogue" ? data.seed_id : null,
          seed_price_id:
            data.seed_source === "catalogue" ? data.seed_price_id : null,
          seed_quantity:
            data.quantity_mode === "custom" ? data.seed_quantity : null,
          seed_quantity_unit:
            data.quantity_mode === "custom" ? data.seed_quantity_unit : null,
        });
        if (!result.success) cropFieldErrors(result, setError);
      })}
    >
      <CropSummaryStrip crop={crop} />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("compatibleSeedHint")}
      </p>
      {error && (
        <CropNotice error>
          {error}{" "}
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="underline"
          >
            {t("retry")}
          </button>
        </CropNotice>
      )}
      <fieldset disabled={busy || loading} className="space-y-4">
        <CropSection title={t("chooseSeed")} number={1}>
          <Controller
            name="seed_id"
            control={control}
            rules={{
              validate: (v) =>
                values.seed_source !== "catalogue" ||
                Boolean(v) ||
                t("required"),
            }}
            render={() => (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {visible.map((s) => (
                  <CropChoice
                    key={s.id}
                    disabled={
                      s.crop_variety_id !== null &&
                      s.crop_variety_id !== (crop.crop_variety?.id ?? null)
                    }
                    selected={
                      values.seed_source === "catalogue" &&
                      values.seed_id === s.id
                    }
                    onClick={() => selectSeed(s)}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <CropImage src={s.image} name={s.name} />
                    <strong>{s.name}</strong>
                    {s.brand_name && (
                      <span className="text-xs text-gray-500">
                        {s.brand_name}
                      </span>
                    )}
                  </CropChoice>
                ))}
                <button
                  type="button"
                  onClick={() => setMore(true)}
                  className="border-success-400 text-success-700 dark:text-success-300 flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
                >
                  <GridIcon className="size-7" />
                  {t("moreSeeds")}
                </button>
              </div>
            )}
          />
          <div className="mt-4">
            <CropField
              id="crop-seed-source"
              label={t("seedSource")}
              error={errors.seed_id?.message}
            >
              <select
                id="crop-seed-source"
                {...register("seed_source", {
                  onChange: () => {
                    setValue("seed_id", null, { shouldDirty: true });
                    setValue("seed_price_id", null);
                    setValue("quantity_mode", "unknown");
                  },
                })}
                className={cropControl}
              >
                {["catalogue", "farm_saved", "local", "other", "unknown"].map(
                  (source) => (
                    <option key={source} value={source}>
                      {t(`seedSources.${source}`)}
                    </option>
                  ),
                )}
              </select>
            </CropField>
          </div>
        </CropSection>
        <div className="grid gap-4 lg:grid-cols-2">
          <CropSection title={t("sowingDate")} number={2}>
            <CropField
              id="crop-sowing-date"
              label={t("sowingDate")}
              required
              error={errors.sowing_date?.message}
            >
              <Input
                id="crop-sowing-date"
                type="date"
                {...register("sowing_date", {
                  required: t("required"),
                  pattern: {
                    value: /^\d{4}-\d{2}-\d{2}$/,
                    message: t("validDate"),
                  },
                })}
              />
            </CropField>
          </CropSection>
          <CropSection title={t("cropTimeline")}>
            <CropNotice>{t("maturityNote")}</CropNotice>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-gray-500">{t("duration")}</dt>
                <dd className="text-success-700 dark:text-success-300 font-bold">
                  {saved.maturity?.maturity_status === "available"
                    ? t("daysRange", {
                        min:
                          saved.maturity.maturity_days_min ??
                          saved.maturity.maturity_days_max ??
                          0,
                        max:
                          saved.maturity.maturity_days_max ??
                          saved.maturity.maturity_days_min ??
                          0,
                      })
                    : t("unavailable")}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">
                  {t("expectedHarvest")}
                </dt>
                <dd className="font-bold">
                  {values.sowing_date === crop.sowing_date
                    ? (crop.expected_harvest_date ??
                      ([
                        crop.expected_harvest_date_min,
                        crop.expected_harvest_date_max,
                      ]
                        .filter(Boolean)
                        .join(" – ") ||
                        t("unavailable")))
                    : t("calculatedOnSave")}
                </dd>
              </div>
            </dl>
          </CropSection>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CropSection title={t("seedQuantity")} number={3}>
            {planningLoading ? (
              <p role="status">{t("loading")}</p>
            ) : (
              <div className="bg-success-50 dark:bg-success-950 rounded-xl p-4">
                <span className="text-sm">{t("suggestedQuantity")}</span>
                <strong className="text-success-700 dark:text-success-300 mt-1 block text-2xl">
                  {recommendation?.recommended_quantity
                    ? `${recommendation.recommended_quantity} ${recommendation.quantity_unit}`
                    : t("noRecommendation")}
                </strong>
                {recommendation?.recommended_min_quantity && (
                  <p className="text-sm">
                    {recommendation.recommended_min_quantity} –{" "}
                    {recommendation.recommended_max_quantity}{" "}
                    {recommendation.quantity_unit}
                  </p>
                )}
                {recommendation?.seed_rate?.source?.title && (
                  <p className="mt-2 text-xs">
                    {recommendation.seed_rate.source.title}
                  </p>
                )}
                {recommendation?.seed_rate?.match_type && (
                  <p className="mt-2 text-xs">
                    {recommendation.seed_rate.matched_region?.name
                      ? t("matchedRegion", {
                          name: recommendation.seed_rate.matched_region.name,
                        })
                      : t("generalRecommendation")}
                  </p>
                )}
              </div>
            )}
            <Controller
              name="quantity_mode"
              control={control}
              rules={{
                validate: (mode) =>
                  mode !== "suggested" ||
                  Boolean(recommendation?.recommended_quantity) ||
                  t("noRecommendation"),
              }}
              render={({ field }) => (
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["suggested", "custom", "unknown"] as const).map((mode) => (
                    <label
                      key={mode}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        checked={field.value === mode}
                        onChange={() => field.onChange(mode)}
                        disabled={
                          mode === "suggested" &&
                          !recommendation?.recommended_quantity
                        }
                        className="text-success-600"
                      />
                      {t(`quantityModes.${mode}`)}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.quantity_mode && (
              <p role="alert" className="text-error-600 mt-2 text-sm">
                {errors.quantity_mode.message}
              </p>
            )}
            {values.quantity_mode === "custom" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <CropField
                  id="crop-seed-quantity"
                  label={t("quantity")}
                  error={errors.seed_quantity?.message}
                  required
                >
                  <Input
                    id="crop-seed-quantity"
                    type="number"
                    step={0.0001}
                    {...register("seed_quantity", {
                      validate: (value) =>
                        values.quantity_mode !== "custom" ||
                        (Number(value) > 0 &&
                          Number(value) <= 9999999999.9999) ||
                        t("positive"),
                    })}
                  />
                </CropField>
                <CropField
                  id="crop-seed-unit"
                  label={t("unit")}
                  error={errors.seed_quantity_unit?.message}
                >
                  <select
                    id="crop-seed-unit"
                    {...register("seed_quantity_unit", {
                      required:
                        values.quantity_mode === "custom"
                          ? t("required")
                          : false,
                    })}
                    className={cropControl}
                  >
                    {["g", "kg", "piece", "plant"].map((code) => (
                      <option key={code} value={code}>
                        {t(`units.${code}`)}
                      </option>
                    ))}
                  </select>
                </CropField>
              </div>
            )}
            {!saved.calculations_current && saved.seed_quantity && (
              <p className="text-warning-700 dark:text-warning-300 mt-3 text-sm">
                {t("reviewQuantity")}
              </p>
            )}
          </CropSection>
          <CropSection title={t("seedPurchase")}>
            {values.seed_source === "catalogue" && (
              <Controller
                name="seed_price_id"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    {prices.map((p) => (
                      <CropChoice
                        key={p.id}
                        selected={field.value === p.id}
                        onClick={() =>
                          field.onChange(field.value === p.id ? null : p.id)
                        }
                      >
                        <strong className="block">
                          {p.package_quantity} {p.package_unit_code}
                        </strong>
                        <CropMoney
                          value={p.package_price}
                          currency={p.currency_code}
                        />
                        {p.seller_name && (
                          <p className="text-xs text-gray-500">
                            {p.seller_name}
                          </p>
                        )}
                      </CropChoice>
                    ))}
                  </div>
                )}
              />
            )}
            {!prices.length && (
              <p className="mb-3 text-sm text-gray-500">
                {t("priceUnavailable")}
              </p>
            )}
            <div className="bg-success-50 dark:bg-success-950 my-4 rounded-xl p-4">
              <div className="flex justify-between gap-3">
                <span>{t("packagesRequired")}</span>
                <strong>{packages ?? t("unavailable")}</strong>
              </div>
              {packages !== null && price && (
                <p className="mt-1 text-sm">
                  {t("purchaseQuantity", {
                    quantity: packages * Number(price.package_quantity),
                    unit: price.package_unit_code,
                  })}
                </p>
              )}
              <div className="mt-3 flex justify-between gap-3">
                <span>{t("estimatedCost")}</span>
                <strong className="text-success-700 dark:text-success-300">
                  <CropMoney value={cost} currency={price?.currency_code} />
                </strong>
              </div>
            </div>
            <CropField
              id="crop-seed-cost"
              label={t("manualCost")}
              error={errors.manual_estimated_cost?.message}
            >
              <Input
                id="crop-seed-cost"
                type="number"
                step={0.0001}
                {...register("manual_estimated_cost", {
                  setValueAs: (value) => (value === "" ? null : value),
                  validate: (value) =>
                    value === null ||
                    (Number(value) >= 0 &&
                      Number(value) <= 999999999999.9999) ||
                    t("nonnegative"),
                })}
              />
            </CropField>
          </CropSection>
        </div>
        <CropField
          id="crop-seed-notes"
          label={t("notes")}
          error={errors.seed_notes?.message}
        >
          <textarea
            id="crop-seed-notes"
            rows={2}
            maxLength={2000}
            {...register("seed_notes", {
              maxLength: {
                value: 2000,
                message: t("maxLength", { count: 2000 }),
              },
            })}
            className={`${cropControl} h-auto py-3`}
          />
        </CropField>
      </fieldset>
      {errors.root && <CropNotice error>{errors.root.message}</CropNotice>}
      {more && (
        <ProductSelectionDialog
          kind="seeds"
          compatibleVarietyId={crop.crop_variety?.id ?? null}
          initial={seed ? [seed] : []}
          filters={{
            crop_id: crop.crop.id,
            crop_variety_id: crop.crop_variety?.id,
          }}
          onClose={() => setMore(false)}
          onConfirm={(records) => {
            if (records[0]) selectSeed(records[0]);
            setMore(false);
          }}
        />
      )}
    </form>
  );
}
