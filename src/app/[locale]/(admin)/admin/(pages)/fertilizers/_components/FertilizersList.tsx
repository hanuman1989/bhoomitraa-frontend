import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlusIcon } from "@/icons";
import Badge from "@/components/admin/ui/badge/Badge";
import ImagePreview from "@/components/common/ImagePreview";
import UrlPagination from "@/components/admin/common/UrlPagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/admin/ui/table";
import type { FertilizersResponse } from "@/types/admin/fertilizer";
import FertilizerRowActions from "./FertilizerRowActions";

export default function FertilizersList({
  result,
  filtered,
  canReview,
}: {
  result: FertilizersResponse;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("fertilizers"),
    locale = useLocale(),
    numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 });
  const cell = "px-3 py-3 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="fertilizers-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <h2
            id="fertilizers-list-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge>{t("count", { count: result.pagination.total })}</Badge>
        </div>
        <Link
          href="/admin/fertilizers/create"
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
                "fertilizer",
                "fertilizer_type",
                "form",
                "grade",
                "nutrients",
                "brand",
                "verification_status",
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
            {result.data.map((fertilizer, index) => (
              <TableRow
                key={fertilizer.id}
                className="hover:bg-gray-50/70 dark:hover:bg-white/3"
              >
                <TableCell className={cell}>
                  {(result.pagination.from ?? 1) + index}
                </TableCell>
                <TableCell className={cell}>
                  <div className="flex items-center gap-3">
                    <ImagePreview
                      src={fertilizer.primary_image?.image_url}
                      alt={
                        fertilizer.primary_image?.alt_text ??
                        fertilizer.name ??
                        t("recordId", { id: fertilizer.id })
                      }
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                    <div>
                      <Link
                        href={`/admin/fertilizers/${fertilizer.id}`}
                        className="hover:text-brand-500 font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {fertilizer.name ??
                          t("recordId", { id: fertilizer.id })}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {t("codeValue", {
                          code: fertilizer.fertilizer_code ?? t("notAvailable"),
                        })}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      fertilizer.fertilizer_type === "straight"
                        ? "primary"
                        : fertilizer.fertilizer_type === "complex" ||
                            fertilizer.fertilizer_type === "mixed"
                          ? "warning"
                          : fertilizer.fertilizer_type === "water_soluble"
                            ? "info"
                            : "success"
                    }
                  >
                    {t(`types.${fertilizer.fertilizer_type}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <Badge color="info">{t(`forms.${fertilizer.form}`)}</Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {fertilizer.grade ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <div className="flex flex-wrap gap-1.5">
                    {fertilizer.nutrients.map((row) => (
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
                        {t("composition.valueLabel", {
                          nutrient: row.nutrient_code,
                          value: numbers.format(
                            row.content_value as Intl.StringNumericLiteral,
                          ),
                          unit: t(`contentUnits.${row.content_unit_code}`),
                        })}
                      </Badge>
                    ))}
                    {!fertilizer.nutrients.length && t("notAvailable")}
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {fertilizer.brand_name ?? t("notAvailable")}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {fertilizer.manufacturer_name ?? t("notAvailable")}
                  </p>
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      fertilizer.verification_status === "verified"
                        ? "success"
                        : fertilizer.verification_status === "pending"
                          ? "warning"
                          : "error"
                    }
                  >
                    {t(`verification.${fertilizer.verification_status}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  {fertilizer.setup_status === "draft" ? (
                    <Badge color="warning">{t("setup.draft")}</Badge>
                  ) : (
                    <Badge color={fertilizer.is_active ? "success" : "light"}>
                      {t(fertilizer.is_active ? "active" : "inactive")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <FertilizerRowActions
                    fertilizer={fertilizer}
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
            href={filtered ? "/admin/fertilizers" : "/admin/fertilizers/create"}
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
