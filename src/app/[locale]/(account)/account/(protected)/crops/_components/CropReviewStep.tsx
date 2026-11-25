"use client";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslations, useLocale } from "next-intl";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import FarmBoundaryMap from "@/components/common/maps/FarmBoundaryMap";
import { PencilIcon } from "@/icons";
import type { CropDetail, CropSaveResult } from "@/types/account/farmCrop";
import {
  CropImage,
  CropMaturityDetails,
  CropNotice,
  CropSection,
  formatCropDate,
} from "./CropUi";

/**
 * Review & Save (step 3) and the read-only crop details view: crop information
 * and the crop boundary and area only.
 */
export default function CropReviewStep({
  crop,
  onEdit,
  onFinalize,
  busy = false,
}: {
  crop: CropDetail;
  onEdit?: (step: number) => void;
  onFinalize?: (revision: number) => Promise<CropSaveResult>;
  busy?: boolean;
}) {
  const t = useTranslations("farmerCrops");
  const units = useAreaUnits();
  const locale = useLocale();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ revision: number }>({
    defaultValues: { revision: crop.revision },
  });
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
  const location = [
    crop.farm.village,
    crop.farm.tehsil?.name,
    crop.farm.district?.name,
    crop.farm.state?.name,
  ]
    .filter(Boolean)
    .join(", ");
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
  const details = (rows: [string, string | null | undefined][]) => (
    <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
          <dd className="font-semibold">{value || t("unavailable")}</dd>
        </div>
      ))}
    </dl>
  );
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">
          {t(onFinalize ? "steps.review_save" : "cropDetails")}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t("reviewDescription")}</p>
      </div>
      {crop.has_pending_edit && (
        <CropNotice>{t("pendingEditDetails")}</CropNotice>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <CropSection title={t("cropInformation")} action={edit(1)}>
          <div className="flex items-start gap-4">
            <CropImage src={crop.crop.image} name={crop.crop.name} />
            {details([
              [t("crop"), crop.crop.name],
              [t("variety"), crop.crop_variety?.name],
              [t("season"), crop.season.name],
              [
                t("sowingDate"),
                crop.sowing_date
                  ? formatCropDate(crop.sowing_date, locale)
                  : null,
              ],
              [t("status"), t(`statuses.${crop.status}`)],
            ])}
          </div>
          <div className="mt-4">
            <CropMaturityDetails
              maturity={crop.maturity}
              timelineGenerated={crop.timeline_generated}
            />
          </div>
        </CropSection>
        <CropSection title={t("cropBoundaryArea")} action={edit(2)}>
          {details([
            [t("farm"), crop.farm.name],
            [t("farmLocation"), location],
          ])}
          {crop.boundary_details.boundary && (
            <div className="mt-3 h-56 overflow-hidden rounded-xl">
              <FarmBoundaryMap
                points={[]}
                referenceLayers={references}
                displayGeometry={crop.boundary_details.boundary}
              />
            </div>
          )}
          <p className="mt-3 font-semibold">
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
