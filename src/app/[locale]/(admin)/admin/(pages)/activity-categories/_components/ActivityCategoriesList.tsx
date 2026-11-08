import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlusIcon, TaskIcon } from "@/icons";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import UrlPagination from "@/components/admin/common/UrlPagination";
import type { ActivityCategoriesListResponse } from "@/types/admin/activityCategory";
import ActivityIconPreview from "./ActivityIconPreview";
import ActivityCategoryRowActions from "./ActivityCategoryRowActions";

export default function ActivityCategoriesList({
  result,
  filtered,
  canManageSystem,
}: {
  result: ActivityCategoriesListResponse;
  filtered: boolean;
  canManageSystem: boolean;
}) {
  const t = useTranslations("activityCategories");
  const cell = "px-5 py-4 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="activity-category-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="activity-category-list-title"
            className="text-xl font-semibold text-gray-900 md:text-2xl dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge color="primary">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/activity-categories/create"
          className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <PlusIcon aria-hidden="true" className="size-5" />
          {t("add")}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{t("description")}</caption>
          <TableHeader className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <TableRow>
              {[
                "name",
                "slug",
                "icon",
                "system",
                "status",
                "addedAt",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-5 py-3 text-start text-xs font-semibold whitespace-nowrap text-gray-600 uppercase dark:text-gray-300"
                >
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((category) => (
              <TableRow
                key={category.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <TableCell className={`${cell} min-w-48 font-semibold`}>
                  {category.is_system && !canManageSystem ? (
                    (category.name ?? category.slug)
                  ) : (
                    <Link
                      href={`/admin/activity-categories/${category.id}/edit`}
                      className="hover:text-brand-500 text-gray-900 dark:text-gray-100"
                    >
                      {category.name ?? category.slug}
                    </Link>
                  )}
                </TableCell>
                <TableCell className={cell}>{category.slug}</TableCell>
                <TableCell className={cell}>
                  <span className="inline-flex items-center gap-2">
                    <ActivityIconPreview value={category.icon} />
                    {category.icon ?? t("notAvailable")}
                  </span>
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={category.is_system ? "success" : "light"}>
                    {t(category.is_system ? "yes" : "no")}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={category.is_active ? "success" : "error"}>
                    {t(category.is_active ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {category.added_at ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <ActivityCategoryRowActions
                    category={category}
                    canManageSystem={canManageSystem}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!result.data.length && (
        <div className="space-y-3 p-10 text-center">
          <TaskIcon
            aria-hidden="true"
            className="mx-auto size-10 text-gray-400"
          />
          <p className="text-gray-700 dark:text-gray-300">
            {t(filtered ? "emptyFiltered" : "empty")}
          </p>
          <Link
            href={
              filtered
                ? "/admin/activity-categories"
                : "/admin/activity-categories/create"
            }
            className="text-brand-500 dark:text-brand-400 text-sm hover:underline"
          >
            {t(filtered ? "filters.reset" : "add")}
          </Link>
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
