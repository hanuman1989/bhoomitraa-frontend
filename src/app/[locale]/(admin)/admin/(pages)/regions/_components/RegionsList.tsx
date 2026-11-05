import { getTranslations } from "next-intl/server";
import UrlPagination from "@/components/admin/common/UrlPagination";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import type { PaginationMeta } from "@/types/api";
import type { Region, RegionType } from "@/types/admin/region";
import { Link } from "@/i18n/navigation";
import { PlusIcon } from "@/icons";
import RegionActionButtons from "./RegionActionButtons";

interface RegionsListProps {
  regions: Region[];
  pagination: PaginationMeta;
  parentNames: Record<number, string | null>;
}

const typeClasses: Record<RegionType, string> = {
  country:
    "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  state:
    "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  district:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  subdistrict:
    "bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20 dark:text-theme-purple-500",
  village:
    "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
};
const cellClasses =
  "whitespace-nowrap px-5 py-3 text-sm text-gray-600 dark:text-gray-400";

export default async function RegionsList({
  regions,
  pagination,
  parentNames,
}: RegionsListProps) {
  const t = await getTranslations("regions");
  const headers = [
    "name",
    "code",
    "type",
    "parent",
    "status",
    "createdAt",
    "actions",
  ] as const;

  return (
    <section
      aria-labelledby="regions-table-title"
      className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center gap-3 px-5 py-5">
        <h2
          id="regions-table-title"
          className="text-2xl font-semibold text-gray-900 dark:text-white"
        >
          {t("title")}
        </h2>
        <span className="bg-brand-50 text-theme-xs text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 rounded-full px-3 py-1 font-medium">
          {t("records", { count: pagination.total })}
        </span>
        <Link
          href="/admin/regions/create"
          className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 ms-auto inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium text-white focus-visible:outline-2"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("actions.add")}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <TableHeader className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header}
                  isHeader
                  className="text-theme-xs px-5 py-3 text-start font-medium whitespace-nowrap text-gray-500 uppercase dark:text-gray-400"
                >
                  {t(`columns.${header}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {regions.map((region) => (
              <TableRow
                key={region.id}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <TableCell className={cellClasses}>
                  <span className="block font-medium text-gray-900 dark:text-gray-100">
                    {region.name ?? t("unnamed")}
                  </span>
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("regionId", { id: region.id })}
                  </span>
                </TableCell>
                <TableCell className={cellClasses}>
                  {region.code ?? "—"}
                </TableCell>
                <TableCell className={cellClasses}>
                  <span
                    className={`text-theme-xs inline-flex rounded-lg px-2.5 py-1 font-medium ${typeClasses[region.region_type]}`}
                  >
                    {t(`types.${region.region_type}`)}
                  </span>
                </TableCell>
                <TableCell className={cellClasses}>
                  {region.parent_id === null ? (
                    "—"
                  ) : (
                    <>
                      <span className="block">
                        {parentNames[region.parent_id] ?? t("unnamed")}
                      </span>
                      <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                        {t("regionId", { id: region.parent_id })}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell className={cellClasses}>
                  <Badge
                    size="sm"
                    color={region.is_active ? "success" : "error"}
                  >
                    {region.is_active
                      ? t("filters.active")
                      : t("filters.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={cellClasses}>
                  {region.added_at ?? "—"}
                </TableCell>
                <TableCell className={cellClasses}>
                  <RegionActionButtons region={region} />
                </TableCell>
              </TableRow>
            ))}
            {regions.length === 0 && (
              <TableRow>
                <td
                  colSpan={headers.length}
                  className="p-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {t("empty")}
                </td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("showing", {
            from: pagination.from ?? 0,
            to: pagination.to ?? 0,
            total: pagination.total,
          })}
        </p>
        {pagination.last_page > 1 && (
          <UrlPagination
            currentPage={pagination.current_page}
            totalPages={pagination.last_page}
          />
        )}
      </div>
    </section>
  );
}
