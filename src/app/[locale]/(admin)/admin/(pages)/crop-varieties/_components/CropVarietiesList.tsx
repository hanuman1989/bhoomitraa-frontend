import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlusIcon, DocsIcon, CropCategoryIcon } from "@/icons";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import UrlPagination from "@/components/admin/common/UrlPagination";
import type { CropVarietiesListResponse } from "@/types/admin/cropVariety";
import CropVarietyRowActions from "./CropVarietyRowActions";

export default function CropVarietiesList({
  result,
  filtered,
}: {
  result: CropVarietiesListResponse;
  filtered: boolean;
}) {
  const t = useTranslations("cropVarieties");
  const cell = "px-4 py-4 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("listTitle")}
          </h2>
          <Badge color="success">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/crop-varieties/create"
          className="bg-success-700 hover:bg-success-800 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white"
        >
          <PlusIcon aria-hidden="true" className="size-5" />
          {t("add")}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{t("description")}</caption>
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              {[
                "name",
                "crop",
                "code",
                "maturity",
                "source",
                "status",
                "addedAt",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-4 py-3 text-start text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                >
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((variety) => (
              <TableRow
                key={variety.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <TableCell className={`${cell} min-w-40 font-semibold`}>
                  <Link
                    href={`/admin/crop-varieties/${variety.id}/edit`}
                    className="text-brand-600 dark:text-brand-400"
                  >
                    {variety.name ?? variety.slug}
                  </Link>
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color="warning"
                    startIcon={
                      <CropCategoryIcon
                        aria-hidden="true"
                        className="block size-4 shrink-0"
                      />
                    }
                  >
                    {variety.crop_name ??
                      variety.crop_slug ??
                      t("notAvailable")}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {variety.variety_code ?? t("notAvailable")}
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {variety.maturity_days_min !== null &&
                  variety.maturity_days_max !== null
                    ? t("maturity.range", {
                        min: variety.maturity_days_min,
                        max: variety.maturity_days_max,
                      })
                    : variety.maturity_days_min !== null
                      ? t("maturity.from", { min: variety.maturity_days_min })
                      : variety.maturity_days_max !== null
                        ? t("maturity.to", { max: variety.maturity_days_max })
                        : t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  {variety.source_id && variety.source_title ? (
                    <Link
                      href={`/admin/knowledge-sources/${variety.source_id}`}
                    >
                      <Badge
                        color="info"
                        startIcon={
                          <DocsIcon
                            aria-hidden="true"
                            className="block size-4 shrink-0"
                          />
                        }
                      >
                        {variety.source_title}
                      </Badge>
                    </Link>
                  ) : (
                    t("notLinked")
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={variety.is_active ? "success" : "light"}>
                    {variety.is_active ? t("active") : t("inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {variety.added_at ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <CropVarietyRowActions variety={variety} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {result.data.length === 0 && (
        <div className="p-10 text-center">
          <CropCategoryIcon
            aria-hidden="true"
            className="mx-auto mb-3 size-10 text-gray-400"
          />
          <p className="text-gray-700 dark:text-gray-300">
            {t(filtered ? "emptyFiltered" : "empty")}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 p-5 dark:border-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("results", {
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
