import { useFormatter, useTranslations } from "next-intl";
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
import type { SeedLotsResponse } from "@/types/admin/seedLot";
import SeedLotRowActions from "./SeedLotRowActions";

export default function SeedLotsList({
  result,
  filtered,
  canReview,
}: {
  result: SeedLotsResponse;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("seedLots"),
    formatter = useFormatter(),
    cell = "px-4 py-3 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="lots-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <h2
            id="lots-list-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge color="primary">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/seed-lots/create"
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
                "lot_number",
                "seed_id",
                "quality",
                "certification",
                "validity",
                "verification_status",
                "status",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-4 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-600 uppercase dark:text-gray-300"
                >
                  {t(`columns.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((lot, index) => (
              <TableRow
                key={lot.id}
                className="hover:bg-gray-25 dark:hover:bg-gray-800/40"
              >
                <TableCell className={cell}>
                  {(result.pagination.current_page - 1) *
                    result.pagination.per_page +
                    index +
                    1}
                </TableCell>
                <TableCell className={`${cell} min-w-44`}>
                  <Link
                    href={`/admin/seed-lots/${lot.id}`}
                    className="hover:text-brand-500 font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {lot.lot_number}
                  </Link>
                  {lot.test_date ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t("tested", {
                        date: formatter.dateTime(
                          new Date(`${lot.test_date}T00:00:00Z`),
                          { dateStyle: "medium", timeZone: "UTC" },
                        ),
                      })}
                    </p>
                  ) : lot.seed_class ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t(`classes.${lot.seed_class}`)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className={`${cell} min-w-56`}>
                  <div className="flex items-center gap-3">
                    <ImagePreview
                      src={lot.seed?.primary_image?.image_url}
                      alt={
                        lot.seed?.primary_image?.alt_text ??
                        lot.seed?.name ??
                        t("notAvailable")
                      }
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {lot.seed?.name ?? t("recordId", { id: lot.seed_id })}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t("skuValue", {
                          sku: lot.seed?.sku ?? t("notAvailable"),
                        })}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <p>
                    {t("germinationValue", {
                      value:
                        lot.germination_percentage === null
                          ? t("notAvailable")
                          : t("percentageValue", {
                              value: lot.germination_percentage,
                            }),
                    })}
                  </p>
                  <p className="mt-1">
                    {t("purityValue", {
                      value:
                        lot.physical_purity_percentage === null
                          ? t("notAvailable")
                          : t("percentageValue", {
                              value: lot.physical_purity_percentage,
                            }),
                    })}
                  </p>
                </TableCell>
                <TableCell className={cell}>
                  <p className="font-medium">
                    {lot.certification_number ?? t("notAvailable")}
                  </p>
                  {lot.certification_body && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {lot.certification_body}
                    </p>
                  )}
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {lot.valid_until && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("validTill")}
                        </p>
                        <p>
                          {formatter.dateTime(
                            new Date(`${lot.valid_until}T00:00:00Z`),
                            { dateStyle: "medium", timeZone: "UTC" },
                          )}
                        </p>
                      </div>
                    )}
                    <Badge
                      color={
                        lot.computed_validity_status === "valid"
                          ? "success"
                          : lot.computed_validity_status === "expired"
                            ? "error"
                            : lot.computed_validity_status === "expiring_soon"
                              ? "warning"
                              : "light"
                      }
                    >
                      {t(`validity.${lot.computed_validity_status}`)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      lot.verification_status === "verified"
                        ? "success"
                        : lot.verification_status === "pending"
                          ? "warning"
                          : "error"
                    }
                  >
                    {t(`verification.${lot.verification_status}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={lot.is_active ? "success" : "error"}>
                    {t(lot.is_active ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <SeedLotRowActions lot={lot} canReview={canReview} />
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
            href={filtered ? "/admin/seed-lots" : "/admin/seed-lots/create"}
            className="text-brand-500 mt-3 inline-block hover:underline"
          >
            {t(filtered ? "filters.reset" : "add")}
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 p-5 dark:border-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("showing", {
            from: result.data.length
              ? (result.pagination.current_page - 1) *
                  result.pagination.per_page +
                1
              : 0,
            to:
              (result.pagination.current_page - 1) *
                result.pagination.per_page +
              result.data.length,
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
