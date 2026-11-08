import { useFormatter, useLocale, useTranslations } from "next-intl";
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
import type { SeedPricesResponse } from "@/types/admin/seedPrice";
import SeedPriceRowActions from "./SeedPriceRowActions";

export default function SeedPricesList({
  result,
  filtered,
  canReview,
}: {
  result: SeedPricesResponse;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("seedPrices"),
    formatter = useFormatter(),
    locale = useLocale(),
    cell = "px-4 py-3 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="prices-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <h2
            id="prices-list-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge color="primary">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/seed-prices/create"
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
                "seed_id",
                "package",
                "price_type",
                "package_price",
                "region_scope",
                "period",
                "source_id",
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
            {result.data.map((price, index) => (
              <TableRow
                key={price.id}
                className="hover:bg-gray-25 dark:hover:bg-gray-800/40"
              >
                <TableCell className={cell}>
                  {(result.pagination.from ?? 1) + index}
                </TableCell>
                <TableCell className={`${cell} min-w-56`}>
                  <div className="flex items-center gap-3">
                    <ImagePreview
                      src={price.seed?.primary_image?.image_url}
                      alt={
                        price.seed?.primary_image?.alt_text ??
                        price.seed?.name ??
                        t("notAvailable")
                      }
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                    <div>
                      <Link
                        href={`/admin/seed-prices/${price.id}`}
                        className="hover:text-brand-500 font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {price.seed?.name ??
                          t("recordId", { id: price.seed_id })}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t("skuValue", {
                          sku: price.seed?.sku ?? t("notAvailable"),
                        })}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {t("packageValue", {
                    quantity: new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 4,
                    }).format(
                      price.package_quantity as Intl.StringNumericLiteral,
                    ),
                    unit: t(`units.${price.package_unit_code}`),
                  })}
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      price.price_type === "wholesale"
                        ? "success"
                        : price.price_type === "indicative"
                          ? "warning"
                          : price.price_type === "retail"
                            ? "info"
                            : "primary"
                    }
                  >
                    {t(`types.${price.price_type}`)}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`${cell} font-semibold whitespace-nowrap`}
                >
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: price.currency_code,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  }).format(price.package_price as Intl.StringNumericLiteral)}
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <Badge
                    color={price.region_scope === "all" ? "info" : "warning"}
                  >
                    {t(`scopes.${price.region_scope}`)}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {price.effective_to
                    ? t("periodRange", {
                        from: formatter.dateTime(
                          new Date(`${price.effective_from}T00:00:00Z`),
                          { dateStyle: "medium", timeZone: "UTC" },
                        ),
                        to: formatter.dateTime(
                          new Date(`${price.effective_to}T00:00:00Z`),
                          { dateStyle: "medium", timeZone: "UTC" },
                        ),
                      })
                    : t("periodFrom", {
                        from: formatter.dateTime(
                          new Date(`${price.effective_from}T00:00:00Z`),
                          { dateStyle: "medium", timeZone: "UTC" },
                        ),
                      })}
                </TableCell>
                <TableCell className={cell}>
                  {price.source_title ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={price.is_active ? "success" : "light"}>
                    {t(price.is_active ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <SeedPriceRowActions price={price} canReview={canReview} />
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
            href={filtered ? "/admin/seed-prices" : "/admin/seed-prices/create"}
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
