import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import UrlPagination from "@/components/admin/common/UrlPagination";
import Badge from "@/components/admin/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { PlusIcon } from "@/icons";
import type {
  CropFieldLayoutFilters,
  CropFieldLayoutOptions,
  CropFieldLayoutsResponse,
} from "@/types/admin/cropFieldLayout";
import { CropFieldLayoutSearch } from "./CropFieldLayoutFilters";
import CropFieldLayoutRowActions from "./CropFieldLayoutRowActions";
import FieldLayoutPreview from "./FieldLayoutPreview";

const columns = [
  "layout",
  "crops",
  "sowingMethod",
  "layoutType",
  "farmingType",
  "growingSystem",
  "status",
  "updatedOn",
  "actions",
] as const;
const cell = "px-3 py-3 text-sm text-gray-700 dark:text-gray-300";

export default function CropFieldLayoutsList({
  filters,
  options,
  result,
  failure,
}: {
  filters: CropFieldLayoutFilters;
  options?: CropFieldLayoutOptions;
  result?: CropFieldLayoutsResponse;
  failure: string;
}) {
  const t = useTranslations("cropFieldLayouts");
  const format = useFormatter();
  const filtered = Object.values(filters).some(Boolean);

  return (
    <section
      aria-labelledby="field-layout-list-title"
      className="shadow-theme-xs rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <h2
            id="field-layout-list-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            {t("listTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("listDescription")}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <CropFieldLayoutSearch
            key={JSON.stringify(filters)}
            filters={filters}
          />
          <Link
            href="/admin/crop-field-layouts/create"
            className="bg-brand-500 hover:bg-brand-600 inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("add")}
          </Link>
        </div>
      </div>
      {failure && (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300 mx-4 mb-4 rounded-lg p-4 text-sm sm:mx-5 sm:mb-5"
        >
          {failure}
        </p>
      )}
      {result && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">{t("listTitle")}</caption>
              <TableHeader className="bg-brand-50 dark:bg-brand-500/10">
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column}
                      isHeader
                      scope="col"
                      className="px-3 py-3 text-start text-xs font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                    >
                      {t(`columns.${column}`)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.data.map((layout) => {
                  const unpublishedDraft =
                    !layout.wizard.is_finalized &&
                    !layout.wizard.has_pending_edit;
                  const definition = options?.layout_types.find(
                    ({ value }) => value === layout.layout_type,
                  );
                  return (
                    <TableRow
                      key={layout.id}
                      className="hover:bg-gray-25 dark:hover:bg-gray-800/40"
                    >
                      <TableCell className={`${cell} min-w-40`}>
                        <div className="flex items-center gap-3">
                          {definition &&
                            Object.keys(layout.configuration).length > 0 && (
                              <div className="w-14 shrink-0">
                                <FieldLayoutPreview
                                  compact
                                  definition={definition}
                                  configuration={layout.configuration}
                                />
                              </div>
                            )}
                          <Link
                            href={`/admin/crop-field-layouts/${layout.id}`}
                            className="hover:text-brand-600 dark:hover:text-brand-300 font-semibold text-gray-900 dark:text-gray-100"
                          >
                            {layout.title}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className={`${cell} min-w-36`}>
                        <div className="flex flex-wrap gap-1">
                          {layout.crop_scope === "all" ? (
                            <Badge size="sm" color="primary">
                              {t("allCrops")}
                            </Badge>
                          ) : layout.crops.length ? (
                            <>
                              {layout.crops.slice(0, 3).map((crop) => (
                                <Badge size="sm" color="primary" key={crop.id}>
                                  {crop.name ?? t("recordId", { id: crop.id })}
                                </Badge>
                              ))}
                              {layout.crops.length > 3 && (
                                <Badge size="sm" color="primary">
                                  <span aria-hidden="true">
                                    +{layout.crops.length - 3}
                                  </span>
                                  <span className="sr-only">
                                    {layout.crops
                                      .slice(3)
                                      .map(
                                        (crop) =>
                                          crop.name ??
                                          t("recordId", { id: crop.id }),
                                      )
                                      .join(", ")}
                                  </span>
                                </Badge>
                              )}
                            </>
                          ) : (
                            t("notAvailable")
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cell}>
                        {layout.sowing_method?.title ??
                          (layout.sowing_method_id
                            ? t("recordId", { id: layout.sowing_method_id })
                            : t("notRestricted"))}
                      </TableCell>
                      <TableCell className={cell}>
                        {layout.layout_type_label ?? t("notAvailable")}
                      </TableCell>
                      <TableCell className={cell}>
                        {layout.farming_type_label ?? t("notAvailable")}
                      </TableCell>
                      <TableCell className={cell}>
                        {layout.growing_system_label ?? t("notAvailable")}
                      </TableCell>
                      <TableCell className={cell}>
                        <div className="flex flex-wrap gap-1">
                          {unpublishedDraft ? (
                            <Badge size="sm" color="warning">
                              {t("draft")}
                            </Badge>
                          ) : (
                            <Badge
                              size="sm"
                              color={layout.is_active ? "success" : "light"}
                            >
                              {t(layout.is_active ? "active" : "inactive")}
                            </Badge>
                          )}
                          {layout.wizard.has_pending_edit && (
                            <Badge size="sm" color="warning">
                              {t("draft")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`${cell} whitespace-nowrap`}>
                        {layout.updated_at ? (
                          <time dateTime={layout.updated_at}>
                            {format.dateTime(new Date(layout.updated_at), {
                              dateStyle: "medium",
                            })}
                          </time>
                        ) : (
                          t("notAvailable")
                        )}
                      </TableCell>
                      <TableCell className={cell}>
                        <CropFieldLayoutRowActions
                          id={layout.id}
                          name={layout.title}
                          isDraft={!layout.wizard.is_finalized}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {result.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {t(filtered ? "emptyFiltered" : "empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {result.pagination.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 sm:p-5 dark:border-gray-800">
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
          )}
        </>
      )}
    </section>
  );
}
