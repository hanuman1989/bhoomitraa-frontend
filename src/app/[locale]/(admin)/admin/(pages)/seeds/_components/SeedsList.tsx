import { useTranslations } from "next-intl";
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
import type { SeedsResponse } from "@/types/admin/seed";
import SeedRowActions from "./SeedRowActions";

export default function SeedsList({
  result,
  filtered,
  canReview,
}: {
  result: SeedsResponse;
  filtered: boolean;
  canReview: boolean;
}) {
  const t = useTranslations("seeds"),
    cell = "px-4 py-3 text-start text-sm text-gray-700 dark:text-gray-300";
  return (
    <section
      aria-labelledby="seeds-list-title"
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <h2
            id="seeds-list-title"
            className="text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t("listTitle")}
          </h2>
          <Badge color="primary">
            {t("count", { count: result.pagination.total })}
          </Badge>
        </div>
        <Link
          href="/admin/seeds/create"
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
                "product",
                "crop_id",
                "crop_variety_id",
                "material_type",
                "brandProducer",
                "verification_status",
                "is_active",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-4 py-3 text-start text-xs font-medium whitespace-nowrap text-gray-600 uppercase dark:text-gray-300"
                >
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((seed, index) => (
              <TableRow
                key={seed.id}
                className="hover:bg-gray-25 dark:hover:bg-gray-800/40"
              >
                <TableCell className={`${cell} min-w-56`}>
                  <div className="flex items-center gap-3">
                    <ImagePreview
                      src={seed.primary_image?.image_url}
                      alt={
                        seed.primary_image?.alt_text ??
                        seed.name ??
                        t("recordId", { id: seed.id })
                      }
                      width={48}
                      height={48}
                      className="size-12 shrink-0 rounded-lg object-cover"
                    />
                    <div>
                      <Link
                        href={`/admin/seeds/${seed.id}`}
                        className="hover:text-brand-500 font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {seed.name ?? t("recordId", { id: seed.id })}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t("skuValue", { sku: seed.sku ?? t("notAvailable") })}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  {seed.crop_name ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  {seed.crop_variety_name ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      seed.material_type === "tuber"
                        ? "warning"
                        : [
                              "grafted_plant",
                              "seedling",
                              "rooted_cutting",
                            ].includes(seed.material_type)
                          ? "success"
                          : seed.material_type === "sett"
                            ? "error"
                            : "primary"
                    }
                  >
                    {t(`materials.${seed.material_type}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <p>{seed.brand_name ?? t("notAvailable")}</p>
                  {seed.producer_name && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {seed.producer_name}
                    </p>
                  )}
                </TableCell>
                <TableCell className={cell}>
                  <Badge
                    color={
                      seed.verification_status === "verified"
                        ? "success"
                        : seed.verification_status === "pending"
                          ? "warning"
                          : "error"
                    }
                  >
                    {t(`verification.${seed.verification_status}`)}
                  </Badge>
                </TableCell>
                <TableCell className={cell}>
                  <div className="space-y-1">
                    <Badge color={seed.is_active ? "success" : "light"}>
                      {t(seed.is_active ? "active" : "inactive")}
                    </Badge>
                    {seed.setup_status === "draft" && (
                      <div>
                        <Badge color="warning" size="sm">
                          {t("setup.draft")}
                        </Badge>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className={cell}>
                  <SeedRowActions seed={seed} canReview={canReview} />
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
            href={filtered ? "/admin/seeds" : "/admin/seeds/create"}
            className="text-brand-500 mt-3 inline-block hover:underline"
          >
            {t(filtered ? "filters.reset" : "add")}
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 p-5 dark:border-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
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
