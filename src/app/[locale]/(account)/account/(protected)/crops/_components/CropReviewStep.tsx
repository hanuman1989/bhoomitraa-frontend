"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations, useLocale } from "next-intl";
import toast from "react-hot-toast";
import { downloadCropSoilReport } from "@/actions/account/farm-crops";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import FarmBoundaryMap from "@/components/common/maps/FarmBoundaryMap";
import { PencilIcon } from "@/icons";
import type {
  CropDetail,
  CropSaveResult,
  SoilMeasurements,
} from "@/types/account/farmCrop";
import {
  CropImage,
  CropMoney,
  CropNotice,
  CropSection,
  cropButton,
} from "./CropUi";

export default function CropReviewStep({
  crop,
  onEdit,
  onFinalize,
  busy = false,
  section,
}: {
  crop: CropDetail;
  onEdit?: (step: number) => void;
  onFinalize?: (revision: number) => Promise<CropSaveResult>;
  busy?: boolean;
  section?: "soil" | "fertilizer";
}) {
  const t = useTranslations("farmerCrops");
  const units = useAreaUnits();
  const locale = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ revision: number }>({
    defaultValues: { revision: crop.revision },
  });
  useEffect(() => {
    if (section)
      host.current
        ?.querySelector(`#crop-detail-${section}`)
        ?.scrollIntoView({ block: "start" });
  }, [section]);
  const seed = crop.seed_sowing_details;
  const soil = crop.soil_assessment;
  const expenses = crop.expenses;
  const yieldEstimate = crop.expected_yield;
  const references = useMemo(
    () =>
      crop.boundary_details.farm_boundary
        ? [
            {
              id: "farm",
              name: crop.farm.name,
              boundary: crop.boundary_details.farm_boundary,
              color: "#039855",
              fillOpacity: 0,
            },
          ]
        : [],
    [crop.boundary_details.farm_boundary, crop.farm.name],
  );
  const edit = (step: number) =>
    onEdit ? (
      <button
        type="button"
        disabled={busy}
        className="text-success-700 dark:text-success-300 inline-flex items-center gap-1 text-sm font-semibold"
        onClick={() => onEdit(step)}
      >
        <PencilIcon className="size-4" />
        {t("edit")}
      </button>
    ) : undefined;
  async function download() {
    if (downloading) return;
    setDownloading(true);
    try {
      const result = await downloadCropSoilReport(crop.id);
      if (result.success && result.data) {
        const url = URL.createObjectURL(
          new Blob([result.data.buffer], { type: result.data.type }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `soil-report-${crop.id}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else toast.error(result.message);
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div ref={host} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">
          {t(onFinalize ? "steps.review" : "cropDetails")}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t("reviewDescription")}</p>
      </div>
      {crop.has_pending_edit && (
        <CropNotice>{t("pendingEditDetails")}</CropNotice>
      )}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <CropSection title={t("cropInformation")} action={edit(1)}>
            <div className="flex items-start gap-4">
              <CropImage src={crop.crop.image} name={crop.crop.name} />
              <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
                {[
                  [t("farm"), crop.farm.name],
                  [t("crop"), crop.crop.name],
                  [t("variety"), crop.crop_variety?.name],
                  [t("season"), crop.season.name],
                  [
                    t("sowingMethod"),
                    crop.sowing_method
                      ? t(`methods.${crop.sowing_method}`)
                      : null,
                  ],
                  [t("status"), t(`statuses.${crop.status}`)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-semibold">
                      {value ?? t("unavailable")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </CropSection>
          <CropSection title={t("cropBoundaryArea")} action={edit(2)}>
            {crop.boundary_details.boundary && (
              <div className="mb-3 h-56 overflow-hidden rounded-xl">
                <FarmBoundaryMap
                  points={[]}
                  referenceLayers={references}
                  displayGeometry={crop.boundary_details.boundary}
                />
              </div>
            )}
            <p className="font-semibold">
              {crop.boundary_source
                ? t(`boundarySources.${crop.boundary_source}`)
                : t("unavailable")}
            </p>
            <p className="text-success-700 dark:text-success-300 mt-1 text-xl font-bold">
              {formatArea(crop.cultivated_area, locale) ?? t("unavailable")}{" "}
              {units.label(crop.area_unit)}
            </p>
            {crop.boundary_details.calculated_area_ha && (
              <p className="mt-1 text-sm text-gray-500">
                {crop.boundary_details.calculated_area_ha}{" "}
                {units.label("hectare")}
              </p>
            )}
          </CropSection>
          <CropSection title={t("seedSowingDetails")} action={edit(3)}>
            <div className="flex gap-3">
              <CropImage src={seed.seed?.image} name={seed.seed?.name} />
              <div>
                <strong>
                  {seed.seed?.name ??
                    (seed.seed_source
                      ? t(`seedSources.${seed.seed_source}`)
                      : t("unavailable"))}
                </strong>
                {seed.seed?.brand_name && (
                  <p className="text-sm text-gray-500">
                    {seed.seed.brand_name}
                  </p>
                )}
                <p className="mt-1 text-sm">
                  {t("seedQuantity")}:{" "}
                  {seed.seed_quantity
                    ? `${seed.seed_quantity} ${seed.seed_quantity_unit}`
                    : t("unavailable")}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">{t("sowingDate")}</dt>
                <dd className="font-semibold">
                  {crop.sowing_date ?? t("unavailable")}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("expectedHarvest")}</dt>
                <dd className="font-semibold">
                  {crop.expected_harvest_date ??
                    ([
                      crop.expected_harvest_date_min,
                      crop.expected_harvest_date_max,
                    ]
                      .filter(Boolean)
                      .join(" – ") ||
                      t("unavailable"))}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("packagesRequired")}</dt>
                <dd>
                  {seed.purchase?.package_count ?? t("unavailable")}
                  {seed.purchase?.package_quantity
                    ? ` (${seed.purchase.package_quantity} ${seed.purchase.package_unit_code})`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{t("seedCost")}</dt>
                <dd>
                  <CropMoney
                    value={expenses.estimated_seed_cost}
                    currency={expenses.currency_code}
                  />
                </dd>
              </div>
            </dl>
          </CropSection>
          <CropSection
            id="crop-detail-soil"
            title={t("steps.soil_assessment")}
            action={edit(4)}
          >
            {soil.assessment_mode === "skipped" ? (
              <p>{t("soilSkipped")}</p>
            ) : soil.assessment_mode === "soil_test" ? (
              <>
                <p className="mb-3 text-sm">
                  {t("testDate")}:{" "}
                  {soil.soil_test?.test_date ?? t("unavailable")}
                </p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(soil.soil_test ?? {})
                    .filter(
                      ([key, value]) =>
                        [
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
                        ].includes(key) &&
                        value !== null &&
                        value !== "",
                    )
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-gray-500">
                          {t(`soilFields.${key}`)}
                        </dt>
                        <dd className="font-semibold">
                          {String(value)}{" "}
                          {
                            soil.soil_test?.measurement_units?.[
                              key as keyof SoilMeasurements
                            ]
                          }
                        </dd>
                      </div>
                    ))}
                </dl>
                {soil.soil_test?.report_available && (
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={download}
                    className={`${cropButton} mt-4`}
                  >
                    {t(downloading ? "loading" : "downloadReport")}
                  </button>
                )}
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {(
                  [
                    "fertile_capacity",
                    "soil_moisture",
                    "drainage_condition",
                    "water_availability",
                  ] as const
                ).map((key) => (
                  <div key={key}>
                    <dt className="text-gray-500">{t(`soilLabels.${key}`)}</dt>
                    <dd className="font-semibold">
                      {soil.basic_assessment?.[key]
                        ? t(`soilValues.${soil.basic_assessment[key]}`)
                        : t("unavailable")}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {soil.basic_assessment?.notes && (
              <p className="mt-3 text-sm">{soil.basic_assessment.notes}</p>
            )}
          </CropSection>
          <CropSection
            id="crop-detail-fertilizer"
            title={t("steps.fertilizer_planning")}
            action={edit(5)}
          >
            {crop.fertilizer_plan.skipped ? (
              <p>{t("fertilizerSkipped")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {crop.fertilizer_plan.selected_fertilizers.map((row, index) => (
                  <div
                    key={row.id ?? index}
                    className="bg-success-50 dark:bg-success-950 rounded-xl p-3"
                  >
                    <strong>{row.fertilizer?.name ?? row.custom_name}</strong>
                    <p className="text-success-700 dark:text-success-300 mt-1 font-semibold">
                      {row.planned_quantity} {row.quantity_unit_code}
                    </p>
                    <span className="text-sm">
                      <CropMoney
                        value={row.estimated_cost}
                        currency={row.currency_code}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CropSection>
        </div>
        <aside className="space-y-4 lg:col-span-2">
          <CropSection title={t("estimatedExpenses")}>
            <dl className="space-y-3 text-sm">
              {(
                [
                  "estimated_seed_cost",
                  "estimated_soil_test_cost",
                  "estimated_fertilizer_cost",
                ] as const
              ).map((key) => (
                <div
                  key={key}
                  className="flex justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800"
                >
                  <dt>{t(`expenseLabels.${key}`)}</dt>
                  <dd className="font-semibold">
                    {expenses[key] === null ||
                    expenses.component_states[key] === "not_applicable" ||
                    expenses.component_states[key] === "skipped" ? (
                      t(
                        `expenseStates.${expenses.component_states[key] ?? "unknown"}`,
                      )
                    ) : (
                      <>
                        <CropMoney
                          value={expenses[key]}
                          currency={expenses.currency_code}
                        />
                        {expenses.component_states[key] === "explicit_zero" && (
                          <span className="ms-2 text-xs font-normal text-gray-500">
                            {t("expenseStates.explicit_zero")}
                          </span>
                        )}
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="bg-success-50 dark:bg-success-950 mt-4 flex justify-between gap-3 rounded-xl p-4 font-bold">
              <span>
                {t(
                  expenses.is_complete ? "totalEstimatedCost" : "knownSubtotal",
                )}
              </span>
              <span className="text-success-700 dark:text-success-300 text-xl">
                <CropMoney
                  value={
                    expenses.is_complete
                      ? expenses.total_estimated_cost
                      : expenses.known_subtotal
                  }
                  currency={expenses.currency_code}
                />
              </span>
            </div>
            {!expenses.is_complete && (
              <p className="mt-2 text-sm text-gray-500">
                {t("incompleteExpenses")}
              </p>
            )}
            <p className="mt-3 text-xs text-gray-500">
              {t("initialExpensesOnly")}
            </p>
          </CropSection>
          <CropSection title={t("expectedYield")}>
            {yieldEstimate?.availability_status === "available" ? (
              <>
                <p className="text-sm text-gray-500">{t("yieldPerHectare")}</p>
                <strong className="text-success-700 dark:text-success-300 mt-1 block text-xl">
                  {yieldEstimate.benchmark?.yield_min_kg_ha &&
                  yieldEstimate.benchmark.yield_max_kg_ha
                    ? `${yieldEstimate.benchmark.yield_min_kg_ha} – ${yieldEstimate.benchmark.yield_max_kg_ha}`
                    : yieldEstimate.benchmark?.yield_avg_kg_ha}{" "}
                  kg / {units.label("hectare")}
                </strong>
                <p className="mt-4 text-sm text-gray-500">
                  {t("totalExpectedYield")}
                </p>
                <strong className="text-success-700 dark:text-success-300 mt-1 block text-2xl">
                  {yieldEstimate.display_estimates?.estimated_min_yield &&
                  yieldEstimate.display_estimates.estimated_max_yield
                    ? `${yieldEstimate.display_estimates.estimated_min_yield} – ${yieldEstimate.display_estimates.estimated_max_yield}`
                    : (yieldEstimate.display_estimates?.estimated_avg_yield ??
                      yieldEstimate.estimated_avg_yield)}{" "}
                  {yieldEstimate.display_estimates
                    ? t("units.quintal")
                    : t("units.kg")}
                </strong>
                {yieldEstimate.benchmark?.source?.title && (
                  <p className="mt-2 text-xs text-gray-500">
                    {yieldEstimate.benchmark.source.title}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">{t("yieldUnavailable")}</p>
            )}
          </CropSection>
          <CropNotice>{t("estimateNote")}</CropNotice>
          <CropNotice>{t("timelineNote")}</CropNotice>
        </aside>
      </div>
      {Object.keys(crop.validation_issues).length > 0 && onFinalize && (
        <CropNotice error>
          {Object.values(crop.validation_issues).flat().join(" ")}
        </CropNotice>
      )}
      {onFinalize && (
        <form
          id="crop-step-form"
          onSubmit={handleSubmit(async (values) => {
            const result = await onFinalize(values.revision);
            if (!result.success) setError("root", { message: result.message });
          })}
        >
          <input
            type="hidden"
            {...register("revision", {
              valueAsNumber: true,
              min: 1,
              required: true,
            })}
          />
          {errors.root && <CropNotice error>{errors.root.message}</CropNotice>}
        </form>
      )}
    </div>
  );
}
