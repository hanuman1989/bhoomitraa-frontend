import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlusIcon } from "@/icons";
import Badge from "@/components/admin/ui/badge/Badge";
import UrlPagination from "@/components/admin/common/UrlPagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/admin/ui/table";
import type {
  FertilizerRecommendationsResponse,
  FertilizerRecommendationOptions,
} from "@/types/admin/fertilizerRecommendation";
import FertilizerRecommendationRowActions from "./FertilizerRecommendationRowActions";

export default function FertilizerRecommendationsList({
  result,
  options,
  filtered,
  canReview,
}: {
  result: FertilizerRecommendationsResponse;
  options: FertilizerRecommendationOptions;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("fertilizerRecommendations"),
    locale = useLocale(),
    numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });
  const cell = "px-3 py-3 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="recommendations-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="recommendations-list-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge>{t("count", { count: result.pagination.total })}</Badge>
        </div>
        <Link
          href="/admin/fertilizer-recommendations/create"
          className="bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("add")}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{t("description")}</caption>
          <TableHeader className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
            <TableRow>
              {[
                "number",
                "crop",
                "season_id",
                "recommendation_type",
                "nutrients",
                "region_scope",
                "source_id",
                "status",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  scope="col"
                  className="px-3 py-3 text-start text-xs font-medium text-gray-600 uppercase dark:text-gray-300"
                >
                  {t(`columns.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((recommendation, index) => (
              <TableRow
                key={recommendation.id}
                className="hover:bg-gray-50/70 dark:hover:bg-white/3"
              >
                <TableCell className={cell}>
                  {(result.pagination.from ?? 1) + index}
                </TableCell>
                <TableCell className={cell}>
                  <Link
                    href={`/admin/fertilizer-recommendations/${recommendation.id}`}
                    className="hover:text-brand-500 block font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {recommendation.crop_name ??
                      t("cropId", { id: recommendation.crop_id })}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {recommendation.crop_variety_id === null
                      ? t("allVarieties")
                      : (recommendation.crop_variety_name ??
                        t("varietyId", { id: recommendation.crop_variety_id }))}
                  </p>
                  {recommendation.reference_code && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {t("referenceCodeValue", {
                        code: recommendation.reference_code,
                      })}
                    </p>
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <Badge>
                    {recommendation.season_id === null
                      ? t("allSeasons")
                      : (recommendation.season_name ??
                        t("seasonId", { id: recommendation.season_id }))}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge color="info">
                      {options.recommendation_types.find(
                        (option) =>
                          option.value === recommendation.recommendation_type,
                      )?.label ?? recommendation.recommendation_type}
                    </Badge>
                    {recommendation.irrigation_condition && (
                      <Badge color="light">
                        {options.irrigation_conditions.find(
                          (option) =>
                            option.value ===
                            recommendation.irrigation_condition,
                        )?.label ?? recommendation.irrigation_condition}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  <div className="flex flex-wrap gap-1.5">
                    {recommendation.nutrients.map((row) => (
                      <Badge
                        key={row.id}
                        size="sm"
                        color={
                          row.nutrient_code === "P2O5"
                            ? "primary"
                            : row.nutrient_code === "K2O" ||
                                row.nutrient_code === "S"
                              ? "warning"
                              : "info"
                        }
                      >
                        {t("nutrientValue", {
                          nutrient: row.nutrient_code,
                          value: numbers.format(
                            row.recommended_quantity as Intl.StringNumericLiteral,
                          ),
                          unit: row.unit_code,
                          area: row.area_unit_code,
                        })}
                      </Badge>
                    ))}
                    {!recommendation.nutrients.length && t("notAvailable")}
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      recommendation.region_scope === "all" ? "info" : "warning"
                    }
                  >
                    {options.region_scopes.find(
                      (option) => option.value === recommendation.region_scope,
                    )?.label ?? recommendation.region_scope}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  {recommendation.source_title ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={recommendation.is_active ? "success" : "light"}>
                    {t(recommendation.is_active ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <FertilizerRecommendationRowActions
                    recommendation={recommendation}
                    canReview={canReview}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!result.data.length && (
        <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t(filtered ? "emptyFiltered" : "empty")}</p>
          <Link
            href={
              filtered
                ? "/admin/fertilizer-recommendations"
                : "/admin/fertilizer-recommendations/create"
            }
            className="text-brand-500 mt-3 inline-block hover:underline"
          >
            {t(filtered ? "filters.reset" : "add")}
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 p-5 dark:border-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("showing", {
            from: result.pagination.from ?? 0,
            to: result.pagination.to ?? 0,
            total: result.pagination.total,
          })}
        </p>
        <UrlPagination
          currentPage={result.pagination.current_page}
          totalPages={result.pagination.last_page}
        />
      </div>
    </section>
  );
}
