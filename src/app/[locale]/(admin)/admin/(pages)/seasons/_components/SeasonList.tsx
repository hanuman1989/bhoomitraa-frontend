import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalenderIcon, PlusIcon } from "@/icons";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import UrlPagination from "@/components/admin/common/UrlPagination";
import type { SeasonsListResponse } from "@/types/admin/season";
import SeasonRowActions from "./SeasonRowActions";

export default function SeasonList({
  result,
  filtered,
}: {
  result: SeasonsListResponse;
  filtered: boolean;
}) {
  const t = useTranslations("seasons");
  const cell = "px-5 py-4 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="season-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="season-list-title"
            className="text-xl font-semibold text-gray-900 md:text-2xl dark:text-white"
          >
            {t("listTitle")}
          </h2>
          <Badge color="success">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/seasons/create"
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
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
              {["name", "slug", "status", "addedAt", "actions"].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-5 py-3 text-start text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                >
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((season) => {
              return (
                <TableRow
                  key={season.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <TableCell className={`${cell} max-w-lg min-w-60`}>
                    <Link
                      href={`/admin/seasons/${season.id}/edit`}
                      className="hover:text-brand-600 dark:hover:text-brand-400 font-semibold text-gray-900 dark:text-gray-100"
                    >
                      {season.name ?? season.slug}
                    </Link>
                    {season.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                        {season.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className={cell}>{season.slug}</TableCell>
                  <TableCell className={cell}>
                    <Badge color={season.is_active ? "success" : "error"}>
                      {season.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className={`${cell} whitespace-nowrap`}>
                    {season.added_at ?? t("notAvailable")}
                  </TableCell>
                  <TableCell className={cell}>
                    <SeasonRowActions
                      season={season}
                      name={season.name ?? season.slug}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {result.data.length === 0 && (
        <div className="space-y-3 p-10 text-center">
          <CalenderIcon
            aria-hidden="true"
            className="mx-auto size-10 text-gray-400"
          />
          <p className="text-gray-700 dark:text-gray-300">
            {t(filtered ? "emptyFiltered" : "empty")}
          </p>
          <Link
            href={filtered ? "/admin/seasons" : "/admin/seasons/create"}
            className="text-brand-600 dark:text-brand-400 inline-block text-sm font-medium hover:underline"
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
