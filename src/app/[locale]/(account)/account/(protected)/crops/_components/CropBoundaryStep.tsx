"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import useFarmBoundary from "@/hooks/useFarmBoundary";
import useAreaUnits from "@/hooks/useAreaUnits";
import {
  canonicalAreaUnit,
  fromSquareMeters,
  formatArea,
  isSupportedAreaUnit,
} from "@/lib/areaUnits";
import { getCropOccupancy } from "@/actions/account/farm-crops";
import FarmBoundaryEditor from "@/components/common/maps/FarmBoundaryEditor";
import BoundaryConfirmDialog from "@/components/common/maps/BoundaryConfirmDialog";
import type { BoundaryLimits } from "@/components/common/maps/BoundaryConflictLayer";
import Input from "@/components/admin/form/input/InputField";
import { farmMapColor } from "@/components/common/maps/farmMapStyle";
import { FitMapIcon } from "@/icons";
import {
  boundaryArea,
  cropAllocationError,
  isFarmGeometry,
  pointsToBoundary,
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
  const [parts, setParts] = useState(() =>
    structuredClone(crop.boundary_details.boundary),
  );
  const initialized = useRef(Boolean(crop.boundary_source || parts));
  const [activeRing, setActiveRing] = useState({ polygon: 0, ring: 0 });
  const s = useFarmBoundary(
    {
      boundary: parts,
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
      boundary: parts,
      cultivated_area: crop.cultivated_area ?? "",
      area_unit: crop.area_unit ?? crop.farm.area_unit,
    },
  });
  const source = useWatch({ control, name: "boundary_source" });
  const areaUnit = useWatch({ control, name: "area_unit" });
  // No unit picker: keep the crop's unit, else the farm's, else the default.
  useEffect(() => {
    if (!units.config || isSupportedAreaUnit(areaUnit, units.config)) return;
    const fallback = [
      crop.area_unit,
      crop.farm.area_unit,
      units.config.default_unit,
    ]
      .map((unit) => canonicalAreaUnit(unit))
      .find((unit) => isSupportedAreaUnit(unit, units.config));
    if (fallback) setValue("area_unit", fallback);
  }, [units.config, areaUnit, crop.area_unit, crop.farm.area_unit, setValue]);
  const loadBoundary = s.loadBoundary;
  const loadFullFarm = useCallback(
    (farmBoundary: Boundary) => {
      const copy = structuredClone(farmBoundary);
      setParts(copy);
      setPreserveParts(true);
      setActiveRing({ polygon: 0, ring: 0 });
      loadBoundary({
        boundary: copy,
        boundary_source: "manual",
        gps_accuracy_m: null,
      });
      setValue("boundary_source", "farm_boundary", { shouldDirty: true });
    },
    [loadBoundary, setValue],
  );
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      setOccupancy(null);
      const result = await getCropOccupancy(crop.farm.id, crop.id);
      if (!active) return;
      if (result.success && result.data) {
        setOccupancy(result.data);
        setErrorMessage("");
        if (!initialized.current) {
          initialized.current = true;
          const farmBoundary = result.data.farm_boundary;
          if (farmBoundary && isFarmGeometry(farmBoundary)) {
            if (result.data.can_use_full_farm_boundary)
              loadFullFarm(farmBoundary);
            else setValue("boundary_source", "manual");
          } else setValue("boundary_source", "manual_area");
        }
      } else setErrorMessage(result.message);
    });
    return () => {
      active = false;
    };
  }, [crop.id, crop.farm.id, attempt, setValue, loadFullFarm]);
  const canUseFullFarm = Boolean(
    occupancy?.can_use_full_farm_boundary &&
    occupancy.farm_boundary &&
    isFarmGeometry(occupancy.farm_boundary),
  );
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
                    zIndex: 1,
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
                zIndex: 2,
              })),
          ]
        : [],
    [occupancy, crop.farm.name],
  );
  // Live drawing preview: red outside the farm, orange over another crop.
  const outsideMessage = t("outsideFarm");
  const overlapMessage = t("overlap");
  const limits = useMemo<BoundaryLimits | null>(
    () =>
      occupancy?.farm_boundary && isFarmGeometry(occupancy.farm_boundary)
        ? {
            inside: occupancy.farm_boundary,
            avoid: occupancy.existing_active_crops.flatMap((c) =>
              c.boundary ? [c.boundary] : [],
            ),
            messages: { outside: outsideMessage, overlap: overlapMessage },
          }
        : null,
    [occupancy, outsideMessage, overlapMessage],
  );
  // The session edits one ring; parts retains the other parcels/holes and the
  // previous selection while a replacement GPS route is being reviewed.
  const boundary = useMemo<Boundary | null>(() => {
    if (source === "manual_area") return null;
    if (source === "farm_boundary") return parts;
    if (source === "gps" && (s.phase === "idle" || s.phase === "drawing"))
      return parts;
    const edited = pointsToBoundary(s.points);
    if (!edited || !preserveParts || !parts) return edited;
    const originalRing = parts.coordinates[activeRing.polygon][activeRing.ring];
    if (
      originalRing.length === s.points.length + 1 &&
      s.points.every(
        (point, index) =>
          point.lng === originalRing[index][0] &&
          point.lat === originalRing[index][1],
      )
    )
      return parts;
    return {
      type: "MultiPolygon",
      coordinates: parts.coordinates.map((polygon, polygonIndex) =>
        polygon.map((ring, ringIndex) =>
          polygonIndex === activeRing.polygon && ringIndex === activeRing.ring
            ? activeRing.ring
              ? [...edited.coordinates[0][0]].reverse()
              : edited.coordinates[0][0]
            : ring,
        ),
      ),
    };
  }, [source, s.points, s.phase, preserveParts, parts, activeRing]);
  useEffect(() => {
    setValue("boundary", boundary);
  }, [boundary, setValue]);
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
  const geometryChanged =
    JSON.stringify(boundary) !== JSON.stringify(crop.boundary_details.boundary);
  const selectedSqm =
    source === "farm_boundary"
      ? occupancy?.measured_farm_area.square_metres
      : !geometryChanged && crop.calculated_area_sqm
        ? crop.calculated_area_sqm
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
    !error &&
    isSupportedAreaUnit(areaUnit, units.config) &&
    (source === "manual_area"
      ? Number(manualArea) > 0 && !occupancy.existing_active_crops.length
      : boundary &&
        isFarmGeometry(boundary) &&
        s.phase === "confirmed" &&
        Number(selectedSqm) > 0 &&
        !spatialError &&
        !occupancy.existing_active_crops.some((c) => !c.boundary) &&
        (source !== "farm_boundary" || canUseFullFarm)),
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
    if (!canUseFullFarm || !occupancy?.farm_boundary) return;
    if (s.mode !== "manual") s.changeMode("manual");
    loadFullFarm(occupancy.farm_boundary);
    setResetConfirm(false);
  }
  function selectFarm() {
    if (source !== "farm_boundary" && (boundary || s.points.length))
      setResetConfirm(true);
    else reset();
  }
  function clear() {
    s.clear();
    setParts(null);
    setPreserveParts(false);
    setActiveRing({ polygon: 0, ring: 0 });
    custom();
  }
  function draw() {
    clear();
    if (s.mode !== "manual") s.changeMode("manual");
    s.draw();
  }
  return (
    <form
      id="crop-step-form"
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        if (s.active) {
          setError("boundary", { message: t("finishRecording") });
          return;
        }
        if (
          values.boundary_source !== "manual_area" &&
          (!boundary ||
            s.phase !== "confirmed" ||
            Number(selectedSqm) <= 0 ||
            spatialError)
        ) {
          setError("boundary", {
            message: t(spatialError || "confirmBoundary"),
          });
          return;
        }
        if (values.boundary_source === "farm_boundary" && !canUseFullFarm) {
          setError("boundary", { message: t("occupiedFarm") });
          return;
        }
        if (!valid) {
          setError("boundary", {
            message: t(error ? "loadFailed" : "confirmBoundary"),
          });
          return;
        }
        const result = await onSave(2, {
          ...values,
          boundary,
          gps_accuracy_m: values.boundary_source === "gps" ? s.accuracy : null,
        });
        if (!result.success) {
          cropFieldErrors(result, setError);
          if (result.conflict) setAttempt((n) => n + 1);
        }
      })}
    >
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
          {occupancy.existing_active_crops.some((c) => !c.boundary) && (
            <CropNotice error>{t("unverifiedCropBoundary")}</CropNotice>
          )}
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
                  label={t("areaInUnit", { unit: units.label(areaUnit) })}
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
                boundaryStatus={
                  source === "farm_boundary" &&
                  valid &&
                  (geometryChanged || source !== crop.boundary_source)
                    ? t("usingCompleteFarmBoundary")
                    : undefined
                }
                session={{
                  ...s,
                  area: selectedSqm == null ? null : Number(selectedSqm),
                  clear,
                  draw,
                  start: () => {
                    setValue("boundary_source", "gps", { shouldDirty: true });
                    s.start();
                  },
                  edit: () => {
                    if (source !== "gps") custom();
                    s.edit();
                  },
                  changeMode: (mode) => {
                    setParts(boundary ? structuredClone(boundary) : null);
                    setValue("boundary_source", mode, { shouldDirty: true });
                    setPreserveParts(false);
                    setActiveRing({ polygon: 0, ring: 0 });
                    s.changeMode(mode);
                    if (mode === "manual" && boundary) {
                      setPreserveParts(true);
                      loadBoundary({
                        boundary,
                        boundary_source: "manual",
                        gps_accuracy_m: null,
                      });
                    }
                  },
                  update: (points) => {
                    if (source !== "gps") custom();
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
                displayGeometry={boundary}
                limits={limits}
                helpFor="crop"
                extraActions={
                  canUseFullFarm && source !== "farm_boundary"
                    ? [
                        {
                          id: "farm",
                          label: t("useFarmBoundary"),
                          icon: FitMapIcon,
                          color: "bg-theme-purple-500 text-white",
                          run: selectFarm,
                          disabled: s.active,
                        },
                      ]
                    : undefined
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
              <dl className="bg-success-50 dark:bg-success-950 grid grid-cols-2 gap-3 rounded-xl p-3 text-sm lg:grid-cols-5">
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
          {errors.area_unit && (
            <CropNotice error>{errors.area_unit.message}</CropNotice>
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
