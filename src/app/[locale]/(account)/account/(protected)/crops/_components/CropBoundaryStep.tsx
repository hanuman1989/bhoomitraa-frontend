"use client";
import { useEffect, useMemo, useState, startTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import useFarmBoundary from "@/hooks/useFarmBoundary";
import useAreaUnits from "@/hooks/useAreaUnits";
import {
  fromSquareMeters,
  formatArea,
  isSupportedAreaUnit,
} from "@/lib/areaUnits";
import { getCropOccupancy } from "@/actions/account/farm-crops";
import FarmBoundaryEditor from "@/components/common/maps/FarmBoundaryEditor";
import BoundaryConfirmDialog from "@/components/common/maps/BoundaryConfirmDialog";
import AreaUnitSelect from "@/components/common/AreaUnitSelect";
import Input from "@/components/admin/form/input/InputField";
import { farmMapColor } from "@/components/common/maps/farmMapStyle";
import {
  boundaryArea,
  cropAllocationError,
} from "../../_components/farmGeometry";
import type { Boundary } from "@/types/account/farm";
import type {
  BoundaryStepPayload,
  CropOccupancy,
  CropStepProps,
} from "@/types/account/farmCrop";
import { CropField, CropNotice, cropButton, cropFieldErrors } from "./CropUi";

export default function CropBoundaryStep({
  crop,
  busy,
  onSave,
  onDirty,
  onValidity,
}: CropStepProps & { onValidity?: (valid: boolean) => void }) {
  const t = useTranslations("farmerCrops");
  const locale = useLocale();
  const units = useAreaUnits();
  const [occupancy, setOccupancy] = useState<CropOccupancy | null>(null);
  const [error, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [preserveParts, setPreserveParts] = useState(true);
  const initialBoundary =
    crop.boundary_source === "manual" || crop.boundary_source === "gps"
      ? crop.boundary_details.boundary
      : null;
  const [parts, setParts] = useState(initialBoundary);
  const [activeRing, setActiveRing] = useState({ polygon: 0, ring: 0 });
  const s = useFarmBoundary(
    {
      boundary: initialBoundary,
      boundary_source: crop.boundary_source === "gps" ? "gps" : "manual",
      gps_accuracy_m: crop.boundary_details.gps_accuracy_m
        ? Number(crop.boundary_details.gps_accuracy_m)
        : null,
    },
    crop.calculated_area_sqm,
  );
  const {
    register,
    control,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<BoundaryStepPayload>({
    defaultValues: {
      boundary_source: crop.boundary_source ?? "farm_boundary",
      cultivated_area: crop.cultivated_area ?? "",
      area_unit: crop.area_unit ?? crop.farm.area_unit,
    },
  });
  const source = useWatch({ control, name: "boundary_source" });
  const areaUnit = useWatch({ control, name: "area_unit" });
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      const result = await getCropOccupancy(crop.farm.id, crop.id);
      if (!active) return;
      if (result.success && result.data) {
        setOccupancy(result.data);
        setErrorMessage("");
        if (!crop.boundary_source)
          setValue(
            "boundary_source",
            result.data.farm_boundary
              ? result.data.can_use_full_farm_boundary
                ? "farm_boundary"
                : "manual"
              : "manual_area",
          );
      } else setErrorMessage(result.message);
    });
    return () => {
      active = false;
    };
  }, [crop.id, crop.farm.id, crop.boundary_source, attempt, setValue]);
  const references = useMemo(
    () =>
      occupancy
        ? [
            ...(occupancy.farm_boundary
              ? [
                  {
                    id: "farm",
                    name: crop.farm.name,
                    boundary: occupancy.farm_boundary,
                    color: "#039855",
                    fillOpacity: 0,
                  },
                ]
              : []),
            ...occupancy.existing_active_crops
              .filter((c) => c.boundary)
              .map((c) => ({
                id: `crop-${c.id}`,
                name: c.crop_name ?? "",
                boundary: c.boundary!,
                color: c.crop_color || farmMapColor(c.id),
                fillOpacity: 0.3,
              })),
          ]
        : [],
    [occupancy, crop.farm.name],
  );
  const boundary: Boundary | null =
    source === "farm_boundary"
      ? (occupancy?.farm_boundary ?? null)
      : s.boundary && preserveParts && parts
        ? {
            type: "MultiPolygon",
            coordinates: parts.coordinates.map((polygon, polygonIndex) =>
              polygon.map((ring, ringIndex) =>
                polygonIndex === activeRing.polygon &&
                ringIndex === activeRing.ring
                  ? activeRing.ring
                    ? [...s.boundary!.coordinates[0][0]].reverse()
                    : s.boundary!.coordinates[0][0]
                  : ring,
              ),
            ),
          }
        : s.boundary;
  const spatialError =
    boundary && occupancy?.farm_boundary
      ? cropAllocationError(
          boundary,
          occupancy.farm_boundary,
          occupancy.existing_active_crops.flatMap((c) =>
            c.boundary ? [c.boundary] : [],
          ),
        )
      : null;
  const selectedSqm =
    source === "farm_boundary"
      ? occupancy?.measured_farm_area.square_metres
      : boundary
        ? boundary.coordinates.reduce(
            (total, rings) =>
              total +
              rings.reduce(
                (area, ring, index) =>
                  area +
                  (index ? -1 : 1) *
                    boundaryArea(
                      ring.slice(0, -1).map(([lng, lat]) => ({ lng, lat })),
                    ),
                0,
              ),
            0,
          )
        : s.area;
  const geometryChanged =
    JSON.stringify(boundary) !== JSON.stringify(crop.boundary_details.boundary);
  useEffect(
    () =>
      onDirty(
        isDirty ||
          geometryChanged ||
          s.active ||
          s.phase === "editing" ||
          s.phase === "drawing",
      ),
    [isDirty, geometryChanged, s.active, s.phase, onDirty],
  );
  const manualArea = useWatch({ control, name: "cultivated_area" });
  const valid = Boolean(
    occupancy &&
    !s.active &&
    isSupportedAreaUnit(areaUnit, units.config) &&
    (source === "manual_area"
      ? Number(manualArea) > 0 && !occupancy.existing_active_crops.length
      : boundary &&
        !spatialError &&
        (source !== "farm_boundary" || occupancy.can_use_full_farm_boundary)),
  );
  useEffect(() => {
    onValidity?.(valid);
    return () => onValidity?.(false);
  }, [valid, onValidity]);
  const displayArea = fromSquareMeters(selectedSqm, areaUnit, units.config);
  const remainingSqm = occupancy?.remaining_area.square_metres;
  const remaining =
    spatialError ||
    remainingSqm === null ||
    remainingSqm === undefined ||
    selectedSqm === null ||
    selectedSqm === undefined
      ? null
      : fromSquareMeters(
          Math.max(0, Number(remainingSqm) - Number(selectedSqm)),
          areaUnit,
          units.config,
        );
  function custom() {
    setValue("boundary_source", "manual", { shouldDirty: true });
  }
  function reset() {
    s.clear();
    setPreserveParts(false);
    setValue("boundary_source", "farm_boundary", { shouldDirty: true });
    setResetConfirm(false);
  }
  return (
    <form
      id="crop-step-form"
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        if (s.active) {
          setError("boundary", { message: t("finishRecording") });
          return;
        }
        if (
          values.boundary_source !== "manual_area" &&
          (!boundary || spatialError)
        ) {
          setError("boundary", {
            message: t(spatialError || "confirmBoundary"),
          });
          return;
        }
        if (
          values.boundary_source === "farm_boundary" &&
          !occupancy?.can_use_full_farm_boundary
        ) {
          setError("boundary", { message: t("occupiedFarm") });
          return;
        }
        const result = await onSave(2, {
          ...values,
          boundary,
          boundary_source:
            values.boundary_source === "manual_area" ||
            values.boundary_source === "farm_boundary"
              ? values.boundary_source
              : s.source,
          gps_accuracy_m: s.source === "gps" ? s.accuracy : null,
        });
        if (!result.success) {
          cropFieldErrors(result, setError);
          if (result.conflict) setAttempt((n) => n + 1);
        }
      })}
    >
      <div>
        <h2 className="text-2xl font-bold">{t("steps.boundary")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("boundaryDescription")}</p>
      </div>
      {error && (
        <CropNotice error>
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setAttempt((n) => n + 1)}
          >
            {t("retry")}
          </button>
        </CropNotice>
      )}
      {!occupancy ? (
        <p role="status">{t("loading")}</p>
      ) : (
        <fieldset disabled={busy} className="space-y-4">
          {occupancy.remaining_area.square_metres !== null &&
            Number(occupancy.remaining_area.square_metres) === 0 && (
              <CropNotice error>{t("noAvailableArea")}</CropNotice>
            )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!occupancy.can_use_full_farm_boundary || s.active}
              onClick={() => {
                if (s.points.length) setResetConfirm(true);
                else reset();
              }}
              className={cropButton}
            >
              {t("useFarmBoundary")}
            </button>
            {occupancy.farm_boundary && (
              <button
                type="button"
                onClick={custom}
                disabled={s.active}
                className={cropButton}
              >
                {t("drawCustom")}
              </button>
            )}
            <Controller
              name="area_unit"
              control={control}
              rules={{
                validate: (value) =>
                  isSupportedAreaUnit(value, units.config) || t("required"),
              }}
              render={({ field }) => (
                <div className="min-w-40">
                  <AreaUnitSelect
                    id="crop-area-unit"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.area_unit?.message}
                  />
                </div>
              )}
            />
          </div>
          {source !== "farm_boundary" &&
            preserveParts &&
            parts &&
            (parts.coordinates.length > 1 ||
              parts.coordinates.some((polygon) => polygon.length > 1)) && (
              <CropField id="crop-boundary-part" label={t("boundaryPart")}>
                <select
                  id="crop-boundary-part"
                  className={cropButton}
                  value={`${activeRing.polygon}:${activeRing.ring}`}
                  disabled={
                    s.active || s.phase === "drawing" || s.phase === "editing"
                  }
                  onChange={(event) => {
                    if (!boundary) return;
                    const [polygon, ring] = event.target.value
                      .split(":")
                      .map(Number);
                    setParts(boundary);
                    setActiveRing({ polygon, ring });
                    s.loadBoundary({
                      boundary: {
                        type: "MultiPolygon",
                        coordinates: [[boundary.coordinates[polygon][ring]]],
                      },
                      boundary_source: s.source,
                      gps_accuracy_m: s.accuracy,
                    });
                  }}
                >
                  {parts.coordinates.flatMap((polygon, polygonIndex) =>
                    polygon.map((_, ringIndex) => (
                      <option
                        key={`${polygonIndex}:${ringIndex}`}
                        value={`${polygonIndex}:${ringIndex}`}
                      >
                        {ringIndex
                          ? t("parcelHole", {
                              parcel: polygonIndex + 1,
                              hole: ringIndex,
                            })
                          : t("parcelExterior", { parcel: polygonIndex + 1 })}
                      </option>
                    )),
                  )}
                </select>
              </CropField>
            )}
          {source === "manual_area" ? (
            <>
              <CropNotice>{t("noFarmBoundary")}</CropNotice>
              {occupancy.existing_active_crops.length ? (
                <CropNotice error>{t("mapBeforeMultiple")}</CropNotice>
              ) : (
                <CropField
                  id="crop-manual-area"
                  label={t("area")}
                  error={errors.cultivated_area?.message}
                  required
                >
                  <Input
                    id="crop-manual-area"
                    type="number"
                    step={0.00000001}
                    {...register("cultivated_area", {
                      validate: (v) =>
                        (Number(v) > 0 && Number(v) <= 9999999999.99999999) ||
                        t("positive"),
                    })}
                  />
                </CropField>
              )}
            </>
          ) : (
            <>
              <FarmBoundaryEditor
                collapsibleTools
                session={{
                  ...s,
                  ...(source === "farm_boundary"
                    ? {
                        points: [],
                        boundary: null,
                        area:
                          Number(occupancy.measured_farm_area.square_metres) ||
                          null,
                      }
                    : {}),
                  clear: () => {
                    s.clear();
                    custom();
                    setPreserveParts(false);
                  },
                  draw: () => {
                    custom();
                    s.draw();
                  },
                  edit: () => {
                    custom();
                    s.edit();
                  },
                  changeMode: (mode) => {
                    custom();
                    setPreserveParts(false);
                    s.changeMode(mode);
                  },
                  update: (points) => {
                    custom();
                    s.update(points);
                  },
                }}
                areaUnit={areaUnit}
                location={[
                  crop.farm.village,
                  crop.farm.district?.name,
                  crop.farm.state?.name,
                ]
                  .filter(Boolean)
                  .join(", ")}
                referenceLayers={references}
                displayGeometry={
                  source === "farm_boundary"
                    ? occupancy.farm_boundary
                    : boundary
                }
                toolbar={
                  <button
                    type="button"
                    disabled={!occupancy.can_use_full_farm_boundary || s.active}
                    className="text-success-700 rounded-lg px-3 py-2 text-start text-sm font-semibold disabled:opacity-40"
                    onClick={() => setResetConfirm(true)}
                  >
                    {t("useFarmBoundary")}
                  </button>
                }
              />
              {s.mode === "gps" && <CropNotice>{t("gpsSafety")}</CropNotice>}
              {spatialError && <CropNotice error>{t(spatialError)}</CropNotice>}
              <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
                <strong>{t("mapLegend")}</strong>
                <span>{crop.farm.name}</span>
                {occupancy.existing_active_crops.map((c) => (
                  <span key={c.id}>
                    {c.crop_name}: {formatArea(c.cultivated_area, locale)}{" "}
                    {units.label(c.area_unit)}
                  </span>
                ))}
              </div>
              <dl className="bg-success-50 dark:bg-success-950 grid grid-cols-2 gap-3 rounded-2xl p-4 text-sm lg:grid-cols-5">
                {[
                  [
                    t("recordedArea"),
                    `${formatArea(occupancy.recorded_farm_area.value, locale) ?? t("unavailable")} ${units.label(occupancy.recorded_farm_area.unit)}`,
                  ],
                  [
                    t("measuredArea"),
                    `${formatArea(occupancy.measured_farm_area.value, locale) ?? t("unavailable")} ${units.label(occupancy.measured_farm_area.unit)}`,
                  ],
                  [
                    t("occupiedArea"),
                    `${formatArea(occupancy.existing_crop_area.value, locale) ?? t("unavailable")} ${units.label(occupancy.existing_crop_area.unit)}`,
                  ],
                  [
                    t("selectedArea"),
                    displayArea === null
                      ? t("unavailable")
                      : `${formatArea(displayArea, locale)} ${units.label(areaUnit)}`,
                  ],
                  [
                    t("remainingArea"),
                    remaining === null
                      ? t("unavailable")
                      : `${formatArea(remaining, locale)} ${units.label(areaUnit)}`,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd className="text-success-700 dark:text-success-300 mt-1 font-bold">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {errors.boundary && (
            <CropNotice error>{errors.boundary.message}</CropNotice>
          )}
          {errors.root && <CropNotice error>{errors.root.message}</CropNotice>}
        </fieldset>
      )}
      {resetConfirm && (
        <BoundaryConfirmDialog
          title={t("resetBoundary")}
          description={t("resetBoundaryDescription")}
          onClose={() => setResetConfirm(false)}
          onConfirm={reset}
        />
      )}
    </form>
  );
}
