import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import ImagePreview from "@/components/common/ImagePreview";
import type { CropSeedRate } from "@/types/admin/cropSeedRate";
import CropSeedRateRowActions from "./CropSeedRateRowActions";

export default function CropSeedRateDetails({
  rate,
  canReview,
}: {
  rate: CropSeedRate;
  canReview: boolean;
}) {
  const t = useTranslations("cropSeedRates"),
    ts = useTranslations("seeds"),
    unavailable = t("notAvailable");
  const label = "text-xs text-gray-500 dark:text-gray-400",
    value =
      "mt-1 break-words text-sm font-medium text-gray-900 dark:text-gray-100";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("rateName", {
              id: rate.id,
              name: rate.crop_name ?? t("cropId", { id: rate.crop_id }),
            })}
          </h2>
          <Badge color={rate.is_active ? "success" : "light"}>
            {t(rate.is_active ? "active" : "inactive")}
          </Badge>
        </div>
        <CropSeedRateRowActions rate={rate} canReview={canReview} detail />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <ComponentCard title={t("form.cropDetails")}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className={label}>{t("fields.crop_id")}</dt>
                <dd className={value}>
                  {rate.crop_name ?? t("cropId", { id: rate.crop_id })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.crop_variety_id")}</dt>
                <dd className={value}>
                  {rate.crop_variety_id === null
                    ? t("allVarieties")
                    : (rate.crop_variety_name ??
                      t("varietyId", { id: rate.crop_variety_id }))}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.seed_id")}</dt>
                <dd className={value}>
                  {rate.seed_id === null
                    ? t("general")
                    : (rate.seed?.name ?? t("recordId", { id: rate.seed_id }))}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.season_id")}</dt>
                <dd className={value}>
                  {rate.season_id === null
                    ? t("allSeasons")
                    : (rate.season_name ??
                      t("seasonId", { id: rate.season_id }))}
                </dd>
              </div>
            </dl>
            {rate.seed && (
              <div className="flex items-center gap-3">
                <ImagePreview
                  src={rate.seed.primary_image?.image_url}
                  alt={
                    rate.seed.primary_image?.alt_text ??
                    rate.seed.name ??
                    unavailable
                  }
                  width={64}
                  height={64}
                  className="size-16 rounded-lg object-cover"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("skuValue", { sku: rate.seed.sku ?? unavailable })}
                </p>
              </div>
            )}
          </ComponentCard>
          <ComponentCard title={t("form.cultivation")}>
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className={label}>{t("fields.material_type")}</dt>
                <dd className={value}>
                  {ts(`materials.${rate.material_type}`)}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.sowing_method")}</dt>
                <dd className={value}>
                  {rate.sowing_method
                    ? t(`sowing.${rate.sowing_method}`)
                    : t("notRestricted")}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.irrigation_condition")}</dt>
                <dd className={value}>
                  {rate.irrigation_condition
                    ? t(`irrigation.${rate.irrigation_condition}`)
                    : t("notRestricted")}
                </dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("form.recommendation")}>
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className={label}>{t("fields.rate_basis")}</dt>
                <dd className={value}>{t("perArea")}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.area_unit_code")}</dt>
                <dd className={value}>
                  {t(`areaUnits.${rate.area_unit_code}`)}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.rate_unit_code")}</dt>
                <dd className={value}>{ts(`units.${rate.rate_unit_code}`)}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.rate_min")}</dt>
                <dd className={value}>
                  {rate.rate_min === null
                    ? unavailable
                    : t("rateValue", {
                        value: rate.rate_min,
                        unit: t(`units.${rate.rate_unit_code}`),
                        area: t(`areaCodes.${rate.area_unit_code}`),
                      })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.rate_recommended")}</dt>
                <dd className={value}>
                  {t("rateValue", {
                    value: rate.rate_recommended,
                    unit: t(`units.${rate.rate_unit_code}`),
                    area: t(`areaCodes.${rate.area_unit_code}`),
                  })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.rate_max")}</dt>
                <dd className={value}>
                  {rate.rate_max === null
                    ? unavailable
                    : t("rateValue", {
                        value: rate.rate_max,
                        unit: t(`units.${rate.rate_unit_code}`),
                        area: t(`areaCodes.${rate.area_unit_code}`),
                      })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.spacing_row_cm")}</dt>
                <dd className={value}>
                  {rate.spacing_row_cm === null
                    ? unavailable
                    : t("spacingValue", { value: rate.spacing_row_cm })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.spacing_plant_cm")}</dt>
                <dd className={value}>
                  {rate.spacing_plant_cm === null
                    ? unavailable
                    : t("spacingValue", { value: rate.spacing_plant_cm })}
                </dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("fields.notes")}>
            <p className="text-sm break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {rate.notes ?? unavailable}
            </p>
          </ComponentCard>
        </div>
        <aside className="space-y-5 xl:col-span-2">
          <ComponentCard title={t("form.regions")}>
            <Badge color={rate.region_scope === "all" ? "info" : "warning"}>
              {t(`scopes.${rate.region_scope}`)}
            </Badge>
            {rate.region_scope === "specific" ? (
              <ul className="space-y-2">
                {rate.regions.map((region) => (
                  <li
                    key={region.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>
                      {region.name ?? t("districtId", { id: region.id })}
                    </span>
                    {!region.is_active && (
                      <Badge color="warning">{t("inactive")}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("form.allRegionsHelp")}
              </p>
            )}
          </ComponentCard>
          <ComponentCard title={t("form.publication")}>
            <dl className="space-y-4">
              <div>
                <dt className={label}>{t("fields.source_id")}</dt>
                <dd className={value}>{rate.source_title ?? unavailable}</dd>
              </div>
              <div>
                <dt className={label}>{t("fields.is_active")}</dt>
                <dd className={value}>
                  {t(rate.is_active ? "active" : "inactive")}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.created_at")}</dt>
                <dd className={value}>{rate.added_at ?? unavailable}</dd>
              </div>
            </dl>
          </ComponentCard>
        </aside>
      </div>
      <Link
        href="/admin/crop-seed-rates"
        className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
      >
        {t("back")}
      </Link>
    </div>
  );
}
