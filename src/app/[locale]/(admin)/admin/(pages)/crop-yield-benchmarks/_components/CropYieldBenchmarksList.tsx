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
import type { CropYieldBenchmarksResponse } from "@/types/admin/cropYieldBenchmark";
import CropYieldBenchmarkRowActions from "./CropYieldBenchmarkRowActions";

export default function CropYieldBenchmarksList({
  result,
  filtered,
  canReview,
}: {
  result: CropYieldBenchmarksResponse;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("cropYieldBenchmarks"),
    locale = useLocale();
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const cell = "px-3 py-3 text-start text-sm text-gray-700 dark:text-gray-300",
    header =
      "px-3 py-2.5 text-start text-xs font-medium text-gray-600 uppercase dark:text-gray-300";
  return (
    <section
      aria-labelledby="benchmarks-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="benchmarks-list-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge>{t("count", { count: result.pagination.total })}</Badge>
        </div>
        <Link
          href="/admin/crop-yield-benchmarks/create"
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
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.number")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.crop")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.season_id")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.benchmark_type")}
              </TableCell>
              <TableCell
                isHeader
                colSpan={3}
                scope="colgroup"
                className="px-3 py-2.5 text-center text-xs font-medium text-gray-600 uppercase dark:text-gray-300"
              >
                {t("columns.yield")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.region_scope")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.reference_year")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.source_id")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.status")}
              </TableCell>
              <TableCell isHeader rowSpan={2} scope="col" className={header}>
                {t("columns.actions")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell isHeader scope="col" className={header}>
                {t("columns.minimum")}
              </TableCell>
              <TableCell isHeader scope="col" className={header}>
                {t("columns.average")}
              </TableCell>
              <TableCell isHeader scope="col" className={header}>
                {t("columns.maximum")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((benchmark, index) => (
              <TableRow
                key={benchmark.id}
                className="hover:bg-gray-50/70 dark:hover:bg-white/3"
              >
                <TableCell className={cell}>
                  {(result.pagination.from ?? 1) + index}
                </TableCell>
                <TableCell className={cell}>
                  <Link
                    href={`/admin/crop-yield-benchmarks/${benchmark.id}`}
                    className="hover:text-brand-500 block font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {benchmark.crop_name ??
                      t("cropId", { id: benchmark.crop_id })}
                  </Link>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {benchmark.crop_variety_id === null
                      ? t("allVarieties")
                      : (benchmark.crop_variety_name ??
                        t("varietyId", { id: benchmark.crop_variety_id }))}
                  </span>
                </TableCell>
                <TableCell className={cell}>
                  <Badge>
                    {benchmark.season_id === null
                      ? t("allSeasons")
                      : (benchmark.season_name ??
                        t("seasonId", { id: benchmark.season_id }))}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      benchmark.benchmark_type === "research_trial"
                        ? "info"
                        : benchmark.benchmark_type === "district_average" ||
                            benchmark.benchmark_type === "state_average"
                          ? "warning"
                          : benchmark.benchmark_type === "variety_potential"
                            ? "success"
                            : "primary"
                    }
                  >
                    {t(`types.${benchmark.benchmark_type}`)}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {benchmark.yield_min_kg_ha === null
                    ? t("notAvailable")
                    : numbers.format(
                        benchmark.yield_min_kg_ha as Intl.StringNumericLiteral,
                      )}
                </TableCell>
                <TableCell
                  className={`${cell} font-semibold whitespace-nowrap`}
                >
                  {numbers.format(
                    benchmark.yield_avg_kg_ha as Intl.StringNumericLiteral,
                  )}
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {benchmark.yield_max_kg_ha === null
                    ? t("notAvailable")
                    : numbers.format(
                        benchmark.yield_max_kg_ha as Intl.StringNumericLiteral,
                      )}
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      benchmark.region_scope === "all" ? "info" : "warning"
                    }
                  >
                    {t(`scopes.${benchmark.region_scope}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  {benchmark.reference_year ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  {benchmark.source_title ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={benchmark.is_active ? "success" : "light"}>
                    {t(benchmark.is_active ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <CropYieldBenchmarkRowActions
                    benchmark={benchmark}
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
                ? "/admin/crop-yield-benchmarks"
                : "/admin/crop-yield-benchmarks/create"
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
