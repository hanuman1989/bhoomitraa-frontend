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
import {
  BroadcastIcon,
  DibblingIcon,
  DrillingIcon,
  FarmFieldIcon,
  GridIcon,
  LeafIcon,
  LineSowingIcon,
  HorizontaLDots,
  InfoIcon,
  TransplantingIcon,
} from "@/icons";
import type {
  CatalogueCrop,
  CropDetail,
  CropSeason,
  CropSelection,
  CropStepProps,
  CropVariety,
  SowingMethod,
} from "@/types/account/farmCrop";
import {
  CropChoice,
  CropField,
  CropImage,
  CropNotice,
  CropSection,
  cropControl,
  cropFieldErrors,
} from "./CropUi";
import ProductSelectionDialog from "./ProductSelectionDialog";
import SeasonSelectionDialog from "./SeasonSelectionDialog";

const sowingMethodIcons: Record<
  SowingMethod,
  typeof BroadcastIcon
> = {
  broadcasting: BroadcastIcon,
  line_sowing: LineSowingIcon,
  transplanting: TransplantingIcon,
  drilling: DrillingIcon,
  dibbling: DibblingIcon,
};
const DEFAULT_CROP_IMAGE = "/images/farm/default-crop.png";

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
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<CropSelection>({
    defaultValues: crop?.saved_step_data.crop_selection ?? {
      farm_id: farmId ?? 0,
      season_id: 0,
      crop_id: 0,
      crop_variety_id: null,
      sowing_method: null,
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
  const farm = workspace.farms.find((f) => f.id === values.farm_id);
  const season = seasons.find((s) => s.id === values.season_id);
  const selectedCrop =
    chosen?.id === values.crop_id
      ? chosen
      : crops.find((c) => c.id === values.crop_id);
  const variety = varieties.find((v) => v.id === values.crop_variety_id);
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
      className="space-y-5"
    >
      <div>
        <h2 className="text-2xl font-bold">{t("steps.crop_selection")}</h2>
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
        className="grid min-w-0 gap-5 lg:grid-cols-3"
      >
        <div className="space-y-4 lg:col-span-2">
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
                      onClick={() => field.onChange(s.id)}
                      className="flex min-h-18 items-center justify-center gap-3 pe-8"
                    >
                      <SeasonIcon icon={s.icon} size={34} />
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
                      onClick={() => setDialog("seasons")}
                      className="flex min-h-18 items-center justify-center gap-3 pe-8"
                    >
                      {season &&
                      otherSeasons.some((s) => s.id === field.value) ? (
                        <SeasonIcon icon={season.icon} size={34} />
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
                      onClick={() => selectCrop(c)}
                      className="flex flex-col items-center gap-2 text-center"
                    >
                      <CropImage src={c.image} name={c.name} />
                      <strong className="text-sm">{c.name}</strong>
                    </CropChoice>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDialog("crops")}
                    className="border-success-400 text-success-700 dark:text-success-300 flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
                  >
                    <GridIcon className="size-7" />
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
                disabled={!values.crop_id || varietiesLoading}
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
          <CropSection number={5} title={t("selectMethod")}>
            <Controller
              name="sowing_method"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(
                    [
                      "broadcasting",
                      "line_sowing",
                      "transplanting",
                      "drilling",
                      "dibbling",
                    ] as SowingMethod[]
                  ).map((method) => {
                    const MethodIcon = sowingMethodIcons[method];
                    return (
                      <CropChoice
                        key={method}
                        selected={field.value === method}
                        onClick={() => field.onChange(method)}
                        className="flex min-h-18 items-center justify-center gap-4 pe-9"
                      >
                        <MethodIcon
                          aria-hidden
                          className="size-10 shrink-0"
                        />
                        <strong className="text-start text-sm leading-5">
                          {t(`methods.${method}`)}
                        </strong>
                      </CropChoice>
                    );
                  })}
                </div>
              )}
            />
          </CropSection>
        </div>
        <aside className="space-y-4">
          <div className="bg-success-50 dark:bg-success-950 flex h-40 items-center justify-center overflow-hidden rounded-2xl">
            <CropImage
              src={selectedCrop?.image || DEFAULT_CROP_IMAGE}
              name={selectedCrop?.name}
              className="h-full w-full object-cover"
            />
          </div>
          <CropSection title={t("selectedPlan")}>
            <dl className="space-y-3">
              {[
                [t("farm"), farm?.name],
                [t("season"), season?.name],
                [t("crop"), selectedCrop?.name],
                [t("variety"), variety?.name],
                [
                  t("sowingMethod"),
                  values.sowing_method
                    ? t(`methods.${values.sowing_method}`)
                    : null,
                ],
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
          kind="crops"
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
