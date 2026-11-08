import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import type {
  FertilizerRecommendation,
  FertilizerRecommendationOptions,
} from "@/types/admin/fertilizerRecommendation";
import FertilizerRecommendationRowActions from "./FertilizerRecommendationRowActions";

export default function FertilizerRecommendationDetails({
  recommendation,
  options,
  canReview,
}: {
  recommendation: FertilizerRecommendation;
  options: FertilizerRecommendationOptions;
  canReview: boolean;
}) {
  const t = useTranslations("fertilizerRecommendations"),
    missing = t("notAvailable"),
    label = "text-xs text-gray-500 dark:text-gray-400",
    value =
      "mt-1 break-words text-sm font-medium text-gray-900 dark:text-gray-100";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("recommendationName", {
              id: recommendation.id,
              name:
                recommendation.crop_name ??
                t("cropId", { id: recommendation.crop_id }),
            })}
          </h2>
          <Badge color={recommendation.is_active ? "success" : "light"}>
            {t(recommendation.is_active ? "active" : "inactive")}
          </Badge>
        </div>
        <FertilizerRecommendationRowActions
          recommendation={recommendation}
          canReview={canReview}
          detail
        />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <ComponentCard title={t("form.cropDetails")}>
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className={label}>{t("fields.crop_id")}</dt>
                <dd className={value}>
                  {recommendation.crop_name ??
                    t("cropId", { id: recommendation.crop_id })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.crop_variety_id")}</dt>
                <dd className={value}>
                  {recommendation.crop_variety_id === null
                    ? t("allVarieties")
                    : (recommendation.crop_variety_name ??
                      t("varietyId", { id: recommendation.crop_variety_id }))}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.season_id")}</dt>
                <dd className={value}>
                  {recommendation.season_id === null
                    ? t("allSeasons")
                    : (recommendation.season_name ??
                      t("seasonId", { id: recommendation.season_id }))}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.recommendation_type")}</dt>
                <dd className={value}>
                  {options.recommendation_types.find(
                    (option) =>
                      option.value === recommendation.recommendation_type,
                  )?.label ?? recommendation.recommendation_type}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.irrigation_condition")}</dt>
                <dd className={value}>
                  {recommendation.irrigation_condition
                    ? (options.irrigation_conditions.find(
                        (option) =>
                          option.value === recommendation.irrigation_condition,
                      )?.label ?? recommendation.irrigation_condition)
                    : t("notRestricted")}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.soil_condition")}</dt>
                <dd className={value}>
                  {recommendation.soil_condition
                    ? (options.soil_conditions.find(
                        (option) =>
                          option.value === recommendation.soil_condition,
                      )?.label ?? recommendation.soil_condition)
                    : t("notRestricted")}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.application_method")}</dt>
                <dd className={value}>
                  {recommendation.application_method
                    ? (options.application_methods.find(
                        (option) =>
                          option.value === recommendation.application_method,
                      )?.label ?? recommendation.application_method)
                    : t("notRestricted")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={label}>{t("fields.reference_code")}</dt>
                <dd className={value}>
                  {recommendation.reference_code ?? missing}
                </dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("form.nutrientTargets")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {recommendation.nutrients.map((row) => (
                <div
                  key={row.id}
                  className="bg-brand-25 dark:bg-brand-500/10 rounded-lg p-4"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {options.nutrient_codes.find(
                      (option) => option.value === row.nutrient_code,
                    )?.label ?? row.nutrient_code}
                  </p>
                  <p className={value}>
                    {t("nutrientValue", {
                      nutrient: row.nutrient_code,
                      value: row.recommended_quantity,
                      unit: row.unit_code,
                      area: row.area_unit_code,
                    })}
                  </p>
                </div>
              ))}
            </div>
            {!recommendation.nutrients.length && (
              <p className={value}>{missing}</p>
            )}
          </ComponentCard>
          <ComponentCard title={t("form.guidance")}>
            <dl className="space-y-5">
              <div>
                <dt className={label}>{t("fields.basal_dose_notes")}</dt>
                <dd className={`${value} whitespace-pre-wrap`}>
                  {recommendation.basal_dose_notes ?? missing}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.top_dressing_notes")}</dt>
                <dd className={`${value} whitespace-pre-wrap`}>
                  {recommendation.top_dressing_notes ?? missing}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.general_advisory")}</dt>
                <dd className={`${value} whitespace-pre-wrap`}>
                  {recommendation.general_advisory ?? missing}
                </dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("fields.notes")}>
            <p className={`${value} whitespace-pre-wrap`}>
              {recommendation.notes ?? missing}
            </p>
          </ComponentCard>
        </div>
        <aside className="space-y-5 xl:col-span-2">
          <ComponentCard title={t("form.regions")}>
            <Badge
              color={recommendation.region_scope === "all" ? "info" : "warning"}
            >
              {options.region_scopes.find(
                (option) => option.value === recommendation.region_scope,
              )?.label ?? recommendation.region_scope}
            </Badge>
            {recommendation.region_scope === "specific" ? (
              <ul className="space-y-2">
                {recommendation.regions.map((region) => (
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
                <dd className={value}>
                  {recommendation.source_title ?? missing}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.reference_year")}</dt>
                <dd className={value}>
                  {recommendation.reference_year ?? missing}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.is_active")}</dt>
                <dd className={value}>
                  {t(recommendation.is_active ? "active" : "inactive")}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.created_at")}</dt>
                <dd className={value}>{recommendation.added_at ?? missing}</dd>
              </div>
            </dl>
          </ComponentCard>
        </aside>
      </div>
      <Link
        href="/admin/fertilizer-recommendations"
        className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
      >
        {t("back")}
      </Link>
    </div>
  );
}
