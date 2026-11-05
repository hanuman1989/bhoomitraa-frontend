import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircleIcon, CropCategoryIcon } from "@/icons";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import UrlPagination from "@/components/admin/common/UrlPagination";
import type { PaginationMeta } from "@/types/api";
import type { CropCategory } from "@/types/admin/cropCategory";
import CropCategoryRowActions from "./CropCategoryRowActions";

const cell = "px-6 py-4 text-start text-sm text-gray-700 dark:text-gray-300";

export default function CropCategoriesList({
  categories,
  pagination,
  filtered,
}: {
  categories: CropCategory[];
  pagination: PaginationMeta;
  filtered: boolean;
}) {
  const t = useTranslations("cropCategories");
  return (
    <>
      <section
        aria-label={t("title")}
        className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="overflow-x-auto">
          <Table>
            <caption className="sr-only">{t("description")}</caption>
            <TableHeader className="border-b border-gray-200 bg-gray-100/70 dark:border-gray-800 dark:bg-gray-800">
              <TableRow>
                {["name", "slug", "status", "addedAt", "actions"].map((key) => (
                  <TableCell
                    key={key}
                    isHeader
                    className="px-6 py-3 text-start text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                  >
                    {t(`fields.${key}`)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {categories.map((category) => (
                <TableRow
                  key={category.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <TableCell className={`${cell} min-w-48 font-semibold`}>
                    <Link
                      href={`/admin/crop-categories/${category.id}/edit`}
                      className="hover:text-brand-600 dark:hover:text-brand-300 text-gray-900 dark:text-gray-100"
                    >
                      {category.name ?? t("unnamed")}
                    </Link>
                  </TableCell>
                  <TableCell className={cell}>
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 font-medium break-all dark:bg-gray-800">
                      {category.slug}
                    </span>
                  </TableCell>
                  <TableCell className={cell}>
                    <Badge
                      color={category.is_active ? "success" : "light"}
                      startIcon={
                        category.is_active ? (
                          <CheckCircleIcon
                            aria-hidden="true"
                            className="block size-4 shrink-0"
                          />
                        ) : undefined
                      }
                    >
                      {category.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className={`${cell} whitespace-nowrap`}>
                    {category.added_at ?? t("notAvailable")}
                  </TableCell>
                  <TableCell className={cell}>
                    <CropCategoryRowActions category={category} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {categories.length === 0 && (
          <div className="px-5 py-12 text-center">
            <CropCategoryIcon
              aria-hidden="true"
              className="mx-auto mb-3 size-10 text-gray-400"
            />
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {filtered ? t("emptyFiltered") : t("empty")}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {filtered ? t("emptyFilteredHelp") : t("emptyHelp")}
            </p>
          </div>
        )}
      </section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t("results", {
            from: pagination.from ?? 0,
            to: pagination.to ?? 0,
            total: pagination.total,
          })}
        </p>
        <UrlPagination
          currentPage={pagination.current_page}
          totalPages={pagination.last_page}
        />
      </div>
    </>
  );
}
