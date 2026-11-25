"use client";
import { useEffect, useState, startTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { getCropCatalog, getCropOptions } from "@/actions/account/farm-crops";
import { useAccountFarms } from "../../_components/AccountFarmContext";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import { formatSeasonPeriod } from "@/lib/seasons/presentation";
import SeasonIcon from "@/components/common/SeasonIcon";
import { GridIcon, HorizontaLDots, InfoIcon } from "@/icons";
import type {
  CatalogueCrop,
  CropDetail,
  CropSeason,
  CropSelection,
  CropStepProps,
  CropVariety,
} from "@/types/account/farmCrop";
import {
  CropChoice,
  CropField,
  CropImage,
  CropMaturityDetails,
  CropNotice,
  CropSection,
  cropControl,
  cropFieldErrors,
  estimateMaturity,
  formatCropDate,
} from "./CropUi";
import CropDateInput from "./CropDateInput";
import ProductSelectionDialog from "./ProductSelectionDialog";
import SeasonSelectionDialog from "./SeasonSelectionDialog";

const DEFAULT_CROP_IMAGE = "/images/farm/default-crop.png";

/** Today's date from the farmer's local calendar (no UTC conversion). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CropSelectionStep({
  crop,
  farmId,
  onSave,
  onDirty,
  busy,
}: Omit<CropStepProps, "crop"> & { crop: CropDetail | null; farmId?: number }) {
  const t = useTranslations("farmerCrops");
  const locale = useLocale();
  const units = useAreaUnits();
  const workspace = useAccountFarms();
  // A saved crop keeps its farm, season, crop and variety; only the sowing date can change.
  const locked = crop?.status === "active";
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<CropSelection>({
    // New crops start on today's local date; saved crops keep their date
    // (a missing date on an older draft stays empty so it is chosen explicitly).
    defaultValues: crop
      ? {
          ...crop.saved_step_data.crop_selection,
          sowing_date: crop.saved_step_data.crop_selection.sowing_date ?? "",
        }
      : {
          farm_id: farmId ?? 0,
          season_id: 0,
          crop_id: 0,
          crop_variety_id: null,
          sowing_date: localToday(),
        },
  });
  const values = useWatch({ control });
  const [seasons, setSeasons] = useState<CropSeason[]>([]);
  const [crops, setCrops] = useState<CatalogueCrop[]>([]);
  const [chosen, setChosen] = useState<CatalogueCrop | null>(
    crop?.crop ?? null,
  );
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [dialog, setDialog] = useState<"seasons" | "crops" | null>(null);
  const [error, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [varietiesLoading, setVarietiesLoading] = useState(false);
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      setLoading(true);
      const [seasonsResult, cropsResult] = await Promise.all([
        getCropOptions("seasons"),
        getCropCatalog("crops", { is_recommendate: true, per_page: 5 }),
      ]);
      if (!active) return;
      setLoading(false);
      if (
        seasonsResult.success &&
        seasonsResult.data &&
        cropsResult.success &&
        cropsResult.data
      ) {
        setSeasons(seasonsResult.data);
        setCrops(cropsResult.data.data);
        setLoadError("");
      } else setLoadError(seasonsResult.message || cropsResult.message);
    });
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (!values.crop_id) return;
    let active = true;
    startTransition(async () => {
      setVarietiesLoading(true);
      const result = await getCropOptions("varieties", {
        crop_id: values.crop_id,
      });
      if (!active) return;
      setVarietiesLoading(false);
      if (result.success && result.data) {
        setVarieties(result.data);
        setLoadError("");
      } else setLoadError(result.message);
    });
    return () => {
      active = false;
    };
  }, [values.crop_id, attempt]);
  // The variety <select> is uncontrolled: when editing, its saved value is
  // applied before the variety options exist, so the browser shows the empty
  // option. Re-apply the form value once the options have rendered.
  useEffect(() => {
    if (!varieties.length) return;
    const current = getValues("crop_variety_id");
    if (current !== null && varieties.some((v) => v.id === current))
      setValue("crop_variety_id", current);
  }, [varieties, getValues, setValue]);
  const farm = workspace.farms.find((f) => f.id === values.farm_id);
  const season = seasons.find((s) => s.id === values.season_id);
  const selectedCrop =
    chosen?.id === values.crop_id
      ? chosen
      : crops.find((c) => c.id === values.crop_id);
  const variety = varieties.find((v) => v.id === values.crop_variety_id);
  // Recalculated whenever the crop, variety or sowing date changes.
  const maturity = estimateMaturity(variety, values.sowing_date);
  const visibleCrops =
    chosen && !crops.some((c) => c.id === chosen.id)
      ? [...crops, chosen]
      : crops;
  const standardSeasonSlugs = ["rabi", "kharif", "zaid"];
  const primarySeasons = standardSeasonSlugs
    .map((slug) => seasons.find((s) => s.slug === slug))
    .filter((record): record is CropSeason => Boolean(record));
  const otherSeasons = seasons.filter(
    (s) => !["rabi", "kharif", "zaid"].includes(s.slug),
  );
  function selectCrop(record: CatalogueCrop) {
    setChosen(record);
    setValue("crop_id", record.id, { shouldDirty: true, shouldValidate: true });
    setValue("crop_variety_id", null, { shouldDirty: true });
    setVarieties([]);
  }
  return (
    <form
      id="crop-step-form"
      onSubmit={handleSubmit(async (data) => {
        const result = await onSave(1, data);
        if (!result.success) cropFieldErrors(result, setError);
      })}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold">{t("steps.crop_selection")}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {t("selectionDescription")}
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
      <fieldset
        disabled={busy || loading}
        className="grid min-w-0 gap-4 lg:grid-cols-3"
      >
        <div className="space-y-4 lg:col-span-2">
          {locked && <CropNotice>{t("lockedSelection")}</CropNotice>}
          <CropSection number={1} title={t("selectFarm")}>
            <div className="grid items-end gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <CropField
                  id="crop-farm"
                  label={t("farm")}
                  required
                  error={errors.farm_id?.message}
                >
                  <select
                    id="crop-farm"
                    disabled={locked}
                    aria-invalid={!!errors.farm_id}
                    aria-describedby={
                      errors.farm_id ? "crop-farm-error" : undefined
                    }
                    {...register("farm_id", {
                      valueAsNumber: true,
                      validate: (value) => value > 0 || t("required"),
                    })}
                    className={cropControl}
                  >
                    <option value={0}>{t("choose")}</option>
                    {workspace.farms
                      .filter((f) => f.is_active)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </CropField>
              </div>
              <div className="bg-success-50 dark:bg-success-950 rounded-xl p-3">
                <p className="text-xs">{t("recordedArea")}</p>
                <strong className="text-success-700 dark:text-success-300">
                  {farm
                    ? `${formatArea(farm.area, locale)} ${units.label(farm.area_unit)}`
                    : t("unavailable")}
                </strong>
              </div>
            </div>
          </CropSection>
          <CropSection number={2} title={t("selectSeason")}>
            <Controller
              name="season_id"
              control={control}
              rules={{ validate: (value) => value > 0 || t("required") }}
              render={({ field }) => (
                <div className="grid gap-3 sm:grid-cols-2 sm:ps-11 lg:grid-cols-4">
                  {primarySeasons.map((s) => (
                    <CropChoice
                      key={s.id}
                      selected={field.value === s.id}
                      disabled={locked}
                      onClick={() => field.onChange(s.id)}
                      className="flex min-h-14 items-center justify-center gap-2.5 pe-7"
                    >
                      <SeasonIcon icon={s.icon} size={28} />
                      <span className="min-w-0">
                        <strong className="block truncate">
                          {s.name ?? t("unavailable")}
                        </strong>
                        {formatSeasonPeriod(
                          s.start_month,
                          s.end_month,
                          locale,
                        ) && (
                          <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
                            (
                            {formatSeasonPeriod(
                              s.start_month,
                              s.end_month,
                              locale,
                            )}
                            )
                          </span>
                        )}
                      </span>
                    </CropChoice>
                  ))}
                  {seasons.length > 3 && (
                    <CropChoice
                      selected={otherSeasons.some((s) => s.id === field.value)}
                      disabled={locked}
                      onClick={() => setDialog("seasons")}
                      className="flex min-h-14 items-center justify-center gap-2.5 pe-7"
                    >
                      {season &&
                      otherSeasons.some((s) => s.id === field.value) ? (
                        <SeasonIcon icon={season.icon} size={28} />
                      ) : (
                        <HorizontaLDots className="size-8 text-gray-700 dark:text-gray-200" />
                      )}
                      <span className="min-w-0">
                        <strong className="block truncate">
                          {otherSeasons.some((s) => s.id === field.value)
                            ? season?.name
                            : t("other")}
                        </strong>
                        {season &&
                          otherSeasons.some((s) => s.id === field.value) &&
                          formatSeasonPeriod(
                            season.start_month,
                            season.end_month,
                            locale,
                          ) && (
                            <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
                              (
                              {formatSeasonPeriod(
                                season.start_month,
                                season.end_month,
                                locale,
                              )}
                              )
                            </span>
                          )}
                      </span>
                    </CropChoice>
                  )}
                </div>
              )}
            />
            {errors.season_id && (
              <p role="alert" className="text-error-600 mt-2 text-sm sm:ps-11">
                {errors.season_id.message}
              </p>
            )}
          </CropSection>
          <CropSection number={3} title={t("selectCrop")}>
            <Controller
              name="crop_id"
              control={control}
              rules={{ validate: (value) => value > 0 || t("required") }}
              render={() => (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  {visibleCrops.map((c) => (
                    <CropChoice
                      key={c.id}
                      selected={values.crop_id === c.id}
                      disabled={locked}
                      onClick={() => selectCrop(c)}
                      className="flex flex-col items-center gap-2 text-center"
                    >
                      <CropImage src={c.image} name={c.name} />
                      <strong className="text-sm">{c.name}</strong>
                    </CropChoice>
                  ))}
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setDialog("crops")}
                    className="border-success-400 text-success-700 dark:text-success-300 flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed"
                  >
                    <GridIcon className="size-6" />
                    {t("moreCrops")}
                  </button>
                </div>
              )}
            />
            {errors.crop_id && (
              <p role="alert" className="text-error-600 mt-2 text-sm">
                {errors.crop_id.message}
              </p>
            )}
          </CropSection>
          <CropSection number={4} title={t("selectVariety")}>
            <CropField
              id="crop-variety"
              label={t("variety")}
              error={errors.crop_variety_id?.message}
            >
              <select
                id="crop-variety"
                disabled={locked || !values.crop_id || varietiesLoading}
                {...register("crop_variety_id", {
                  setValueAs: (value) => (value === "" ? null : Number(value)),
                  validate: (value) =>
                    value === null ||
                    varieties.some(
                      (v) => v.id === value && v.crop_id === values.crop_id,
                    ) ||
                    t("compatibleVariety"),
                })}
                className={cropControl}
              >
                <option value="">
                  {varietiesLoading ? t("loading") : t("unknownVariety")}
                </option>
                {varieties.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </CropField>
            {variety?.description && (
              <p className="mt-2 text-sm text-gray-500">
                {variety.description}
              </p>
            )}
          </CropSection>
          <div className="grid gap-4 md:grid-cols-2">
            <CropSection number={5} title={t("sowingDate")}>
              <CropField
                id="crop-sowing-date"
                label={t("sowingDate")}
                required
                error={errors.sowing_date?.message}
              >
                <CropDateInput
                  id="crop-sowing-date"
                  aria-invalid={!!errors.sowing_date}
                  aria-describedby={
                    errors.sowing_date ? "crop-sowing-date-error" : undefined
                  }
                  {...register("sowing_date", {
                    required: t("required"),
                    pattern: {
                      value: /^\d{4}-\d{2}-\d{2}$/,
                      message: t("validDate"),
                    },
                  })}
                />
              </CropField>
              {locked && crop?.timeline_generated && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("sowingShiftNote")}
                </p>
              )}
            </CropSection>
            <CropSection title={t("cropTimeline")}>
              <CropMaturityDetails
                maturity={maturity}
                timelineGenerated={crop?.timeline_generated}
              />
            </CropSection>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="bg-success-50 dark:bg-success-950 flex h-32 items-center justify-center overflow-hidden rounded-xl">
            <CropImage
              src={selectedCrop?.image || DEFAULT_CROP_IMAGE}
              name={selectedCrop?.name}
              className="h-full w-full object-cover"
            />
          </div>
          <CropSection title={t("selectedPlan")}>
            <dl className="space-y-2">
              {[
                [t("farm"), farm?.name],
                [t("season"), season?.name],
                [t("crop"), selectedCrop?.name],
                [t("variety"), variety?.name],
                [
                  t("sowingDate"),
                  values.sowing_date
                    ? formatCropDate(values.sowing_date, locale)
                    : null,
                ],
                ...(maturity.maturity_status === "available"
                  ? [
                      [
                        t("duration"),
                        maturity.maturity_days_min ===
                        maturity.maturity_days_max
                          ? t("daysSingle", {
                              days: maturity.maturity_days_min ?? 0,
                            })
                          : t("daysRange", {
                              min:
                                maturity.maturity_days_min ??
                                maturity.maturity_days_max ??
                                0,
                              max:
                                maturity.maturity_days_max ??
                                maturity.maturity_days_min ??
                                0,
                            }),
                      ],
                    ]
                  : []),
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-3 border-b border-gray-100 pb-2 dark:border-gray-800"
                >
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="text-end text-sm font-semibold">
                    {value || t("unavailable")}
                  </dd>
                </div>
              ))}
            </dl>
          </CropSection>
          <CropNotice>
            <InfoIcon className="mb-2 size-5" />
            <strong>{t("whatsNext")}</strong>
            <span className="mt-1 block">{t("boundaryNext")}</span>
          </CropNotice>
        </aside>
      </fieldset>
      {errors.root && <CropNotice error>{errors.root.message}</CropNotice>}
      {dialog === "seasons" && (
        <SeasonSelectionDialog
          seasons={otherSeasons}
          selectedId={values.season_id || null}
          onClose={() => setDialog(null)}
          onConfirm={(s) => {
            setValue("season_id", s.id, {
              shouldDirty: true,
              shouldValidate: true,
            });
            setDialog(null);
          }}
        />
      )}
      {dialog === "crops" && (
        <ProductSelectionDialog
          initial={selectedCrop ? [selectedCrop] : []}
          onClose={() => setDialog(null)}
          onConfirm={(records) => {
            if (records[0]) selectCrop(records[0]);
            setDialog(null);
          }}
        />
      )}
    </form>
  );
}
