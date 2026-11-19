"use client";
import { useEffect, useState, startTransition } from "react";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  getCropOptions,
  getCropFertilizerRecommendation,
} from "@/actions/account/farm-crops";
import Input from "@/components/admin/form/input/InputField";
import type {
  CropFertilizer,
  CropPrice,
  CropStepProps,
  FertilizerPlanRow,
  FertilizerRecommendation,
} from "@/types/account/farmCrop";
import {
  CropField,
  CropImage,
  CropMoney,
  CropNotice,
  CropSection,
  CropSummaryStrip,
  cropButton,
  cropControl,
} from "./CropUi";
import ProductSelectionDialog from "./ProductSelectionDialog";
interface PlanRow extends FertilizerPlanRow {
  selected: boolean;
  product: CropFertilizer | null;
}
interface PlanForm {
  rows: PlanRow[];
}
function estimate(row: Partial<PlanRow>, prices: CropPrice[]) {
  const price = prices.find((p) => p.id === row.fertilizer_price_id);
  const factors: Record<string, number> = { kg: 1, g: 0.001, l: 1, ml: 0.001 };
  if (
    price &&
    Number(row.planned_quantity) > 0 &&
    Number(price.package_quantity) > 0
  ) {
    const a = row.quantity_unit_code ?? "",
      b = price.package_unit_code;
    const compatible =
      a === b ||
      (["kg", "g"].includes(a) && ["kg", "g"].includes(b)) ||
      (["l", "ml"].includes(a) && ["l", "ml"].includes(b));
    if (compatible) {
      const packages = Math.ceil(
        (Number(row.planned_quantity) * (factors[a] ?? 1)) /
          (Number(price.package_quantity) * (factors[b] ?? 1)),
      );
      return {
        cost: packages * Number(price.package_price),
        packages,
        currency: price.currency_code,
      };
    }
  }
  return {
    cost:
      row.manual_estimated_cost !== null &&
      row.manual_estimated_cost !== undefined &&
      row.manual_estimated_cost !== ""
        ? Number(row.manual_estimated_cost)
        : null,
    packages: null,
    currency: "INR",
  };
}
export default function FertilizerPlanningStep({
  crop,
  busy,
  onSave,
  onDirty,
}: CropStepProps) {
  const t = useTranslations("farmerCrops");
  const {
    control,
    register,
    setError,
    handleSubmit,
    getValues,
    formState: { errors, isDirty },
  } = useForm<PlanForm>({
    defaultValues: {
      rows: crop.fertilizer_plan.selected_fertilizers.map(
        ({ fertilizer, estimated_cost, ...row }) => ({
          ...row,
          selected: true,
          product: fertilizer,
        }),
      ),
    },
  });
  const { fields, append, replace } = useFieldArray({
    control,
    name: "rows",
    keyName: "formKey",
  });
  const rows = useWatch({ control, name: "rows" });
  const [recommendation, setRecommendation] =
    useState<FertilizerRecommendation | null>(null);
  const [prices, setPrices] = useState<Record<number, CropPrice[]>>({});
  const [error, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      const result = await getCropFertilizerRecommendation(crop.id);
      if (!active) return;
      setLoading(false);
      if (result.success && result.data) {
        setRecommendation(result.data);
        setErrorMessage("");
      } else setErrorMessage(result.message);
    });
    return () => {
      active = false;
    };
  }, [crop.id, attempt]);
  const ids = rows
    .map((row) => row.fertilizer_id)
    .filter((id): id is number => Boolean(id))
    .join(",");
  useEffect(() => {
    if (!ids) return;
    let active = true;
    startTransition(async () => {
      const results = await Promise.all(
        ids.split(",").map(async (id) => ({
          id: Number(id),
          result: await getCropOptions("fertilizerPrices", {
            crop_cycle_id: crop.id,
            fertilizer_id: Number(id),
            per_page: 100,
          }),
        })),
      );
      if (!active) return;
      const collected: Record<number, CropPrice[]> = {};
      for (const { id, result } of results) {
        if (result.success && result.data) collected[id] = result.data;
        else setErrorMessage(result.message);
      }
      setPrices(collected);
    });
    return () => {
      active = false;
    };
  }, [ids, crop.id, attempt]);
  function add(product: CropFertilizer) {
    if (getValues("rows").some((row) => row.fertilizer_id === product.id))
      return;
    append({
      fertilizer_id: product.id,
      quantity_mode: "custom",
      planned_quantity: "",
      quantity_unit_code: product.default_unit_code,
      fertilizer_price_id: null,
      manual_estimated_cost: null,
      product,
      selected: true,
    });
  }
  const selected = rows.filter((row) => row.selected);
  const estimates = selected.map((row) =>
    estimate(row, prices[row.fertilizer_id ?? 0] ?? []),
  );
  const incomplete = estimates.some((e) => e.cost === null);
  const subtotal = estimates.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  return (
    <form
      id="crop-step-form"
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        const chosen = values.rows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => row.selected);
        if (!chosen.length) {
          setError("root", { message: t("selectFertilizerOrSkip") });
          return;
        }
        const result = await onSave(5, {
          skipped: false,
          fertilizers: chosen.map(
            ({ row: { product, selected, ...row } }) => row,
          ),
        });
        if (!result.success) {
          for (const [name, messages] of Object.entries(result.errors ?? {})) {
            const match = /^fertilizers\.(\d+)\.(.+)$/.exec(name);
            const path = match
              ? `rows.${chosen[Number(match[1])]?.index ?? 0}.${match[2]}`
              : name;
            setError(path as Path<PlanForm>, {
              type: "server",
              message: messages.join(" "),
            });
          }
          setError("root", { message: result.message });
        }
      })}
    >
      <CropSummaryStrip crop={crop} />
      <div>
        <h2 className="text-2xl font-bold">{t("steps.fertilizer_planning")}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {t("fertilizerDescription")}
        </p>
      </div>
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
      {loading && <p role="status">{t("loading")}</p>}
      <fieldset disabled={busy} className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <CropSection title={t("nutrientRequirements")}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {recommendation?.nutrient_requirements.map((n) => (
                <div
                  key={n.nutrient_code}
                  className="bg-success-50 dark:bg-success-950 rounded-xl p-4 text-center"
                >
                  <strong>{n.nutrient_code}</strong>
                  <p className="text-success-700 dark:text-success-300 mt-2 text-lg font-bold">
                    {n.total_quantity === null
                      ? t("unavailable")
                      : `${n.total_quantity} ${n.unit_code}`}
                  </p>
                </div>
              ))}
            </div>
            {!recommendation?.nutrient_requirements.length && (
              <p className="text-sm text-gray-500">{t("noRecommendation")}</p>
            )}
            {recommendation?.recommendation?.source?.title && (
              <p className="mt-3 text-sm">
                {t("source")}: {recommendation.recommendation.source.title}
              </p>
            )}
            {recommendation?.recommendation?.match_type && (
              <p className="mt-2 text-sm">
                {recommendation.recommendation.matched_region?.name
                  ? t("matchedRegion", {
                      name: recommendation.recommendation.matched_region.name,
                    })
                  : t("generalRecommendation")}
              </p>
            )}
          </CropSection>
          <CropSection
            title={t("fertilizerPlan")}
            action={
              <button
                type="button"
                className={cropButton}
                onClick={() => setMore(true)}
              >
                {t("addFertilizer")}
              </button>
            }
          >
            <CropNotice>{t("manualFertilizerQuantities")}</CropNotice>
            {recommendation?.compatible_products.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {recommendation.compatible_products
                  .filter(
                    (p) => !rows.some((row) => row.fertilizer_id === p.id),
                  )
                  .map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      className={cropButton}
                      onClick={() => add(product)}
                    >
                      {product.name}
                    </button>
                  ))}
              </div>
            ) : null}
            <div className="mt-4 space-y-4">
              {fields.map((field, index) => {
                const row = rows[index] ?? field;
                const available = prices[row.fertilizer_id ?? 0] ?? [];
                const preview = estimate(row, available);
                return (
                  <article
                    key={field.formKey}
                    className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <CropImage
                        src={row.product?.image}
                        name={row.product?.name}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-bold">
                          {row.product?.name ||
                            row.custom_name ||
                            t("customFertilizer")}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {[row.product?.brand_name, row.product?.grade]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          {...register(`rows.${index}.selected`)}
                          className="text-success-600 size-5 rounded"
                        />
                        {t("useProduct")}
                      </label>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <CropField
                        id={`fertilizer-${index}-quantity`}
                        label={t("plannedQuantity")}
                        required
                        error={errors.rows?.[index]?.planned_quantity?.message}
                      >
                        <Input
                          id={`fertilizer-${index}-quantity`}
                          type="number"
                          step={0.0001}
                          {...register(`rows.${index}.planned_quantity`, {
                            validate: (value) =>
                              !getValues(`rows.${index}.selected`) ||
                              (Number(value) > 0 &&
                                Number(value) <= 9999999999.9999) ||
                              t("positive"),
                          })}
                        />
                      </CropField>
                      <CropField
                        id={`fertilizer-${index}-unit`}
                        label={t("unit")}
                        error={
                          errors.rows?.[index]?.quantity_unit_code?.message
                        }
                      >
                        <select
                          id={`fertilizer-${index}-unit`}
                          {...register(`rows.${index}.quantity_unit_code`, {
                            validate: (value) =>
                              ["g", "kg", "l", "ml"].includes(value) ||
                              t("required"),
                          })}
                          className={cropControl}
                        >
                          {["g", "kg", "l", "ml"].map((code) => (
                            <option key={code} value={code}>
                              {t(`units.${code}`)}
                            </option>
                          ))}
                        </select>
                      </CropField>
                      <CropField
                        id={`fertilizer-${index}-price`}
                        label={t("package")}
                        error={
                          errors.rows?.[index]?.fertilizer_price_id?.message
                        }
                      >
                        <select
                          id={`fertilizer-${index}-price`}
                          {...register(`rows.${index}.fertilizer_price_id`, {
                            setValueAs: (value) =>
                              value === "" ? null : Number(value),
                          })}
                          className={cropControl}
                        >
                          <option value="">{t("noPackage")}</option>
                          {available.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.package_quantity} {p.package_unit_code} ·{" "}
                              {p.package_price} {p.currency_code}
                            </option>
                          ))}
                        </select>
                      </CropField>
                      <CropField
                        id={`fertilizer-${index}-cost`}
                        label={t("manualCost")}
                        error={
                          errors.rows?.[index]?.manual_estimated_cost?.message
                        }
                      >
                        <Input
                          id={`fertilizer-${index}-cost`}
                          type="number"
                          step={0.0001}
                          {...register(`rows.${index}.manual_estimated_cost`, {
                            setValueAs: (value) =>
                              value === "" ? null : value,
                            validate: (value) =>
                              value === null ||
                              (Number(value) >= 0 &&
                                Number(value) <= 999999999999.9999) ||
                              t("nonnegative"),
                          })}
                        />
                      </CropField>
                    </div>
                    <div className="bg-success-50 dark:bg-success-950 mt-3 flex justify-between gap-3 rounded-xl p-3 text-sm">
                      <span>
                        {t("packagesRequired")}:{" "}
                        {preview.packages ?? t("unavailable")}
                      </span>
                      <strong>
                        <CropMoney
                          value={preview.cost}
                          currency={preview.currency}
                        />
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </CropSection>
          <div className="bg-success-50 dark:bg-success-950 flex flex-wrap justify-between gap-3 rounded-2xl p-5">
            <strong>
              {t(incomplete ? "knownSubtotal" : "fertilizerTotal")}
            </strong>
            <strong className="text-success-700 dark:text-success-300 text-2xl">
              <CropMoney value={selected.length ? subtotal : null} />
            </strong>
          </div>
          {incomplete && (
            <p className="text-sm text-gray-500">{t("incompleteExpenses")}</p>
          )}
        </div>
        <aside className="space-y-4">
          <CropNotice>{t("fertilizerAdviceNote")}</CropNotice>
          {recommendation?.recommendation?.basal_dose_notes && (
            <CropSection title={t("basalNotes")}>
              <p className="text-sm">
                {recommendation.recommendation.basal_dose_notes}
              </p>
            </CropSection>
          )}
          {recommendation?.recommendation?.top_dressing_notes && (
            <CropSection title={t("topDressingNotes")}>
              <p className="text-sm">
                {recommendation.recommendation.top_dressing_notes}
              </p>
            </CropSection>
          )}
          {recommendation?.recommendation?.general_advisory && (
            <CropSection title={t("advisory")}>
              <p className="text-sm">
                {recommendation.recommendation.general_advisory}
              </p>
            </CropSection>
          )}
        </aside>
      </fieldset>
      {errors.root && <CropNotice error>{errors.root.message}</CropNotice>}
      {more && (
        <ProductSelectionDialog
          kind="fertilizers"
          multiple
          initial={rows
            .filter((row) => row.selected && row.product)
            .map((row) => row.product!)}
          onClose={() => setMore(false)}
          onConfirm={(products) => {
            const existing = getValues("rows");
            replace([
              ...existing.map((row) => ({
                ...row,
                selected: row.product
                  ? products.some((p) => p.id === row.product!.id)
                  : row.selected,
              })),
              ...products
                .filter(
                  (p) => !existing.some((row) => row.fertilizer_id === p.id),
                )
                .map((product) => ({
                  fertilizer_id: product.id,
                  quantity_mode: "custom" as const,
                  planned_quantity: "",
                  quantity_unit_code: product.default_unit_code,
                  fertilizer_price_id: null,
                  manual_estimated_cost: null,
                  product,
                  selected: true,
                })),
            ]);
            setMore(false);
          }}
        />
      )}
    </form>
  );
}
