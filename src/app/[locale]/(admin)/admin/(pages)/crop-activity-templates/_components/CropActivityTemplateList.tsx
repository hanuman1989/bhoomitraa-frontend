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
import type { CropActivityTemplatesResponse } from "@/types/admin/cropActivityTemplate";
import CropActivityTemplateRowActions from "./CropActivityTemplateRowActions";

export default function CropActivityTemplateList({
  result,
  filtered,
  canReview,
}: {
  result: CropActivityTemplatesResponse;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("cropActivityTemplates");
  const cell = "px-4 py-4 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="template-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="template-list-title"
            className="text-xl font-semibold text-gray-900 md:text-2xl dark:text-white"
          >
            {t("listTitle")}
          </h2>
          <Badge color="primary">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/crop-activity-templates/create"
          className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white focus-visible:outline-2"
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
                "cropVariety",
                "category",
                "stage",
                "season",
                "activityType",
                "schedule",
                "priority",
                "status",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-4 py-3 text-start text-xs font-semibold whitespace-nowrap text-gray-600 uppercase dark:text-gray-300"
                >
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((template) => (
              <TableRow
                key={template.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <TableCell className={`${cell} min-w-48 font-semibold`}>
                  <Link
                    href={`/admin/crop-activity-templates/${template.id}`}
                    className="hover:text-brand-500 text-gray-900 dark:text-gray-100"
                  >
                    {template.title ?? t("recordId", { id: template.id })}
                  </Link>
                </TableCell>
                <TableCell className={`${cell} min-w-36`}>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {template.crop_name ??
                      t("recordId", { id: template.crop_id })}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {template.variety_scope === "all" ? (
                      t("allVarieties")
                    ) : (
                      <>
                        <span className="sr-only">
                          {template.varieties
                            .map((variety) => variety.name)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                        <span aria-hidden="true">
                          {template.varieties.slice(0, 2).map((variety) => (
                            <span key={variety.id} className="me-1">
                              <Badge color="light" size="sm">
                                {variety.name ??
                                  t("recordId", { id: variety.id })}
                              </Badge>
                            </span>
                          ))}
                          {template.varieties.length > 2 &&
                            `+${template.varieties.length - 2}`}
                        </span>
                      </>
                    )}
                  </p>
                </TableCell>
                <TableCell className={cell}>
                  <Badge color="primary">
                    {template.category_name ??
                      t("recordId", { id: template.category_id })}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  {template.crop_stage_name ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  {template.season_scope === "all" ? (
                    t("allSeasons")
                  ) : (
                    <span>
                      <span className="sr-only">
                        {template.seasons
                          .map((season) => season.name)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                      <span aria-hidden="true">
                        {template.seasons.slice(0, 2).map((season) => (
                          <span key={season.id} className="me-1">
                            <Badge color="primary" size="sm">
                              {season.name ?? t("recordId", { id: season.id })}
                            </Badge>
                          </span>
                        ))}
                        {template.seasons.length > 2 &&
                          `+${template.seasons.length - 2}`}
                      </span>
                    </span>
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      template.activity_type === "task"
                        ? "primary"
                        : template.activity_type === "observation"
                          ? "warning"
                          : "light"
                    }
                  >
                    {t(`activityTypes.${template.activity_type}`)}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <p>{t(`schedule.${template.schedule_type}`)}</p>
                  {template.schedule_basis === "fixed_offsets" ? (
                    template.start_offset_days !== null &&
                    template.end_offset_days !== null && (
                      <p className="mt-1">
                        {template.start_offset_days === template.end_offset_days
                          ? t("daysSingle", {
                              days: template.start_offset_days,
                            })
                          : t("daysRange", {
                              min: template.start_offset_days,
                              max: template.end_offset_days,
                            })}
                      </p>
                    )
                  ) : (
                    <p className="mt-1">
                      {t("scheduleBases.growth_stage")}
                      {template.crop_stage_name
                        ? ` · ${template.crop_stage_name}`
                        : ""}
                    </p>
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      template.priority === "high"
                        ? "error"
                        : template.priority === "medium"
                          ? "warning"
                          : "primary"
                    }
                  >
                    {t(`priorities.${template.priority}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <Badge color={template.is_active ? "success" : "error"}>
                    {t(template.is_active ? "active" : "inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <CropActivityTemplateRowActions
                    template={template}
                    canReview={canReview}
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
                ? "/admin/crop-activity-templates"
                : "/admin/crop-activity-templates/create"
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
