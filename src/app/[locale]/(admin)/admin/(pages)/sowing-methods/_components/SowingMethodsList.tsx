import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlusIcon } from "@/icons";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/admin/ui/table";
import UrlPagination from "@/components/admin/common/UrlPagination";
import ImagePreview from "@/components/common/ImagePreview";
import type {
  SowingMethodOptions,
  SowingMethodsResponse,
} from "@/types/admin/sowingMethod";
import MethodRowActions from "./MethodRowActions";

const columns = [
  "method",
  "establishment_type",
  "crop_scope",
  "machinery_requirement",
  "cost_level",
  "is_active",
  "actions",
] as const;
const cell = "px-2 py-2 text-start text-sm text-gray-700 dark:text-gray-300";

export default function SowingMethodsList({
  result,
  options,
}: {
  result: SowingMethodsResponse;
  options: SowingMethodOptions;
}) {
  const t = useTranslations("sowingMethods");
  const option = (items: SowingMethodOptions["cost_levels"], value: string) =>
    value === "varies"
      ? t("varies")
      : (items.find((item) => item.value === value)?.label ?? value);
  return (
    <section
      aria-labelledby="sowing-method-list"
      className="shadow-theme-xs min-w-0 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <h2
          id="sowing-method-list"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          {t("title")}
        </h2>
        <Link
          href="/admin/sowing-methods/create"
          className="bg-brand-500 hover:bg-brand-600 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("add")}
        </Link>
      </div>
      <div className="overflow-x-auto px-4 sm:px-5">
        <Table>
          <caption className="sr-only">{t("description")}</caption>
          <TableHeader className="bg-brand-50 dark:bg-brand-500/10">
            <TableRow>
              {columns.map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  scope="col"
                  className="px-2 py-3 text-start text-xs font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                >
                  {t(`columns.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((method) => (
              <TableRow
                key={method.id}
                className="hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <TableCell className={cell}>
                  <div className="flex min-w-56 items-center gap-3">
                    <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md">
                      <ImagePreview
                        src={method.cover_image?.image_url}
                        alt={method.title || method.code}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <Link
                        className="block font-semibold text-gray-900 hover:underline dark:text-white"
                        href={`/admin/sowing-methods/${method.id}`}
                      >
                        {method.title || method.code}
                      </Link>
                      {method.title && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {method.code}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  {option(
                    options.establishment_types,
                    method.establishment_type,
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <div className="flex min-w-32 flex-wrap gap-1">
                    {method.crop_scope === "all" ? (
                      <Badge size="sm" color="primary">
                        {t("allCrops")}
                      </Badge>
                    ) : method.crops.length === 0 ? (
                      t("notAvailable")
                    ) : (
                      <>
                        {method.crops.slice(0, 3).map((crop) => (
                          <Badge key={crop.id} size="sm" color="primary">
                            {crop.name ?? crop.id}
                          </Badge>
                        ))}
                        {method.crops.length > 3 && (
                          <Badge size="sm" color="primary">
                            <span
                              aria-label={t("otherCrops", {
                                count: method.crops.length - 3,
                              })}
                            >
                              +{method.crops.length - 3}
                            </span>
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  {option(
                    options.machinery_requirements,
                    method.machinery_requirement,
                  )}
                </TableCell>
                <TableCell className={cell}>
                  {option(options.cost_levels, method.cost_level)}
                </TableCell>
                <TableCell className={cell}>
                  <MethodRowActions method={method} part="status" />
                </TableCell>
                <TableCell className={cell}>
                  <MethodRowActions method={method} part="actions" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {result.data.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("empty")}
        </p>
      )}
      {result.pagination.total > 0 && (
        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 py-4 sm:mx-5 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("results", {
              from: result.pagination.from ?? 0,
              to: result.pagination.to ?? 0,
              total: result.pagination.total,
            })}
          </p>
          {result.pagination.last_page > 1 && (
            <UrlPagination
              currentPage={result.pagination.current_page}
              totalPages={result.pagination.last_page}
            />
          )}
        </div>
      )}
    </section>
  );
}
