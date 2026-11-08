import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Badge from "@/components/admin/ui/badge/Badge";
import type { CropYieldBenchmark } from "@/types/admin/cropYieldBenchmark";
import CropYieldBenchmarkRowActions from "./CropYieldBenchmarkRowActions";

export default function CropYieldBenchmarkDetails({
  benchmark,
  canReview,
}: {
  benchmark: CropYieldBenchmark;
  canReview: boolean;
}) {
  const t = useTranslations("cropYieldBenchmarks"),
    unavailable = t("notAvailable");
  const label = "text-xs text-gray-500 dark:text-gray-400",
    value =
      "mt-1 break-words text-sm font-medium text-gray-900 dark:text-gray-100";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("benchmarkName", {
              id: benchmark.id,
              name:
                benchmark.crop_name ?? t("cropId", { id: benchmark.crop_id }),
            })}
          </h2>
          <Badge color={benchmark.is_active ? "success" : "light"}>
            {t(benchmark.is_active ? "active" : "inactive")}
          </Badge>
        </div>
        <CropYieldBenchmarkRowActions
          benchmark={benchmark}
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
                  {benchmark.crop_name ??
                    t("cropId", { id: benchmark.crop_id })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.crop_variety_id")}</dt>
                <dd className={value}>
                  {benchmark.crop_variety_id === null
                    ? t("allVarieties")
                    : (benchmark.crop_variety_name ??
                      t("varietyId", { id: benchmark.crop_variety_id }))}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.season_id")}</dt>
                <dd className={value}>
                  {benchmark.season_id === null
                    ? t("allSeasons")
                    : (benchmark.season_name ??
                      t("seasonId", { id: benchmark.season_id }))}
                </dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("form.yields")}>
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className={label}>{t("fields.yield_min_kg_ha")}</dt>
                <dd className={value}>
                  {benchmark.yield_min_kg_ha === null
                    ? unavailable
                    : t("yieldValue", { value: benchmark.yield_min_kg_ha })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.yield_avg_kg_ha")}</dt>
                <dd className={value}>
                  {t("yieldValue", { value: benchmark.yield_avg_kg_ha })}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.yield_max_kg_ha")}</dt>
                <dd className={value}>
                  {benchmark.yield_max_kg_ha === null
                    ? unavailable
                    : t("yieldValue", { value: benchmark.yield_max_kg_ha })}
                </dd>
              </div>
            </dl>
          </ComponentCard>
          <ComponentCard title={t("form.information")}>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className={label}>{t("fields.benchmark_type")}</dt>
                <dd className={value}>
                  {t(`types.${benchmark.benchmark_type}`)}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.reference_year")}</dt>
                <dd className={value}>
                  {benchmark.reference_year ?? unavailable}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className={label}>{t("fields.notes")}</dt>
                <dd className={`${value} whitespace-pre-wrap`}>
                  {benchmark.notes ?? unavailable}
                </dd>
              </div>
            </dl>
          </ComponentCard>
        </div>
        <aside className="space-y-5 xl:col-span-2">
          <ComponentCard title={t("form.regions")}>
            <Badge
              color={benchmark.region_scope === "all" ? "info" : "warning"}
            >
              {t(`scopes.${benchmark.region_scope}`)}
            </Badge>
            {benchmark.region_scope === "specific" ? (
              <ul className="space-y-2">
                {benchmark.regions.map((region) => (
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
                  {benchmark.source_title ?? unavailable}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.is_active")}</dt>
                <dd className={value}>
                  {t(benchmark.is_active ? "active" : "inactive")}
                </dd>
              </div>
              <div>
                <dt className={label}>{t("fields.created_at")}</dt>
                <dd className={value}>{benchmark.added_at ?? unavailable}</dd>
              </div>
            </dl>
          </ComponentCard>
        </aside>
      </div>
      <Link
        href="/admin/crop-yield-benchmarks"
        className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
      >
        {t("back")}
      </Link>
    </div>
  );
}
