import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlusIcon, DocsIcon, FileIcon } from "@/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import Badge from "@/components/admin/ui/badge/Badge";
import UrlPagination from "@/components/admin/common/UrlPagination";
import type { PaginationMeta } from "@/types/api";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import KnowledgeSourceStatus from "./KnowledgeSourceStatus";
import KnowledgeSourceRowActions from "./KnowledgeSourceRowActions";

const cell = "px-5 py-4 text-start text-sm text-gray-600 dark:text-gray-400";

export default function KnowledgeSourcesList({
  sources,
  pagination,
  canReview,
  filtered,
}: {
  sources: KnowledgeSource[];
  pagination: PaginationMeta;
  canReview: boolean;
  filtered: boolean;
}) {
  const t = useTranslations("knowledgeSources");
  return (
    <section
      aria-labelledby="sources-table-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="sources-table-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("title")}
          </h2>
          <Badge color="success">
            {t("sourceCount", { count: pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/knowledge-sources/create"
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium text-white focus-visible:outline-2"
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
                "title",
                "publisher",
                "source_type",
                "language",
                "verification_status",
                "attachments",
                "added_at",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-5 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-600 uppercase dark:text-gray-400"
                >
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sources.map((source) => (
              <TableRow
                key={source.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <TableCell className={`${cell} min-w-52 font-medium`}>
                  <Link
                    href={`/admin/knowledge-sources/${source.id}`}
                    className="hover:text-brand-600 text-gray-900 dark:text-white"
                  >
                    {source.title}
                  </Link>
                </TableCell>
                <TableCell className={`${cell} min-w-44`}>
                  {source.publisher}
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <Badge
                    color="info"
                    startIcon={
                      <DocsIcon
                        aria-hidden="true"
                        className="block size-4 shrink-0"
                      />
                    }
                  >
                    {t(`types.${source.source_type}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  {source.language
                    ? t(`languages.${source.language}`)
                    : t("notSet")}
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <KnowledgeSourceStatus status={source.verification_status} />
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                    {source.is_active ? t("active") : t("inactive")}
                  </span>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <Link
                    href={`/admin/knowledge-sources/${source.id}/edit#attachments`}
                    className="hover:text-brand-600 inline-flex items-center gap-2"
                  >
                    <FileIcon aria-hidden="true" className="size-5" />
                    {t("attachments.count", {
                      count: source.attachments.length,
                    })}
                  </Link>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {source.added_at ?? t("notSet")}
                </TableCell>
                <TableCell className={cell}>
                  <KnowledgeSourceRowActions
                    source={source}
                    canReview={canReview}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {sources.length === 0 && (
        <div className="px-5 py-12 text-center">
          <DocsIcon
            aria-hidden="true"
            className="mx-auto mb-3 size-10 text-gray-400"
          />
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {filtered ? t("emptyFiltered") : t("empty")}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filtered ? t("emptyFilteredHelp") : t("emptyHelp")}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
    </section>
  );
}
