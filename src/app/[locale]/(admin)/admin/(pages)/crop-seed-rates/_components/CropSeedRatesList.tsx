import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlusIcon } from "@/icons";
import ImagePreview from "@/components/common/ImagePreview";
import Badge from "@/components/admin/ui/badge/Badge";
import UrlPagination from "@/components/admin/common/UrlPagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/admin/ui/table";
import type { CropSeedRatesResponse } from "@/types/admin/cropSeedRate";
import CropSeedRateRowActions from "./CropSeedRateRowActions";

export default function CropSeedRatesList({
  result,
  filtered,
  canReview,
}: {
  result: CropSeedRatesResponse;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("cropSeedRates"),
    ts = useTranslations("seeds"),
    locale = useLocale(),
    cell = "px-4 py-3 text-start text-sm text-gray-700 dark:text-gray-300";
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });
  return (
    <section
      aria-labelledby="rates-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <h2
            id="rates-list-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge color="primary">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/crop-seed-rates/create"
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
                "seed_id",
                "season_id",
                "material_type",
                "rate_recommended",
                "range",
                "region_scope",
                "source_id",
                "status",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-4 py-3 text-start text-xs font-medium text-gray-600 uppercase dark:text-gray-300"
                >
                  {t(`columns.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((rate, index) => (
              <TableRow
                key={rate.id}
                className="hover:bg-gray-25 dark:hover:bg-gray-800/40"
              >
                <TableCell className={cell}>
                  {(result.pagination.from ?? 1) + index}
                </TableCell>
                <TableCell className={`${cell} min-w-40`}>
                  <Link
                    href={`/admin/crop-seed-rates/${rate.id}`}
                    className="hover:text-brand-500 font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {rate.crop_name ?? t("cropId", { id: rate.crop_id })}
                  </Link>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {rate.crop_variety_id === null
                      ? t("allVarieties")
                      : (rate.crop_variety_name ??
                        t("varietyId", { id: rate.crop_variety_id }))}
                  </p>
                </TableCell>
                <TableCell className={`${cell} min-w-52`}>
                  {rate.seed_id === null ? (
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("general")}
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <ImagePreview
                        src={rate.seed?.primary_image?.image_url}
                        alt={
                          rate.seed?.primary_image?.alt_text ??
                          rate.seed?.name ??
                          t("notAvailable")
                        }
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {rate.seed?.name ??
                            t("recordId", { id: rate.seed_id })}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t("skuValue", {
                            sku: rate.seed?.sku ?? t("notAvailable"),
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <Badge color="primary">
                    {rate.season_id === null
                      ? t("allSeasons")
                      : (rate.season_name ??
                        t("seasonId", { id: rate.season_id }))}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      rate.material_type === "tuber" ||
                      rate.material_type === "sett"
                        ? "warning"
                        : rate.material_type === "grafted_plant"
                          ? "success"
                          : "info"
                    }
                  >
                    {ts(`materials.${rate.material_type}`)}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} font-semibold`}>
                  {t("rateValue", {
                    value: numbers.format(
                      rate.rate_recommended as Intl.StringNumericLiteral,
                    ),
                    unit: t(`units.${rate.rate_unit_code}`),
                    area: t(`areaCodes.${rate.area_unit_code}`),
                  })}
                </TableCell>
                <TableCell className={cell}>
                  {rate.rate_min !== null && rate.rate_max !== null
                    ? t("rangeValue", {
                        min: numbers.format(
                          rate.rate_min as Intl.StringNumericLiteral,
                        ),
                        max: numbers.format(
                          rate.rate_max as Intl.StringNumericLiteral,
                        ),
                        unit: t(`units.${rate.rate_unit_code}`),
                        area: t(`areaCodes.${rate.area_unit_code}`),
                      })
                    : rate.rate_min !== null
                      ? t("minimumValue", {
                          value: numbers.format(
                            rate.rate_min as Intl.StringNumericLiteral,
                          ),
                          unit: t(`units.${rate.rate_unit_code}`),
                          area: t(`areaCodes.${rate.area_unit_code}`),
                        })
                      : rate.rate_max !== null
                        ? t("maximumValue", {
                            value: numbers.format(
                              rate.rate_max as Intl.StringNumericLiteral,
                            ),
                            unit: t(`units.${rate.rate_unit_code}`),
                            area: t(`areaCodes.${rate.area_unit_code}`),
                          })
                        : t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={rate.region_scope === "all" ? "info" : "warning"}
                  >
                    {t(`scopes.${rate.region_scope}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  {rate.source_title ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={rate.is_active ? "success" : "light"}>
                    {t(rate.is_active ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <CropSeedRateRowActions rate={rate} canReview={canReview} />
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
                ? "/admin/crop-seed-rates"
                : "/admin/crop-seed-rates/create"
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
