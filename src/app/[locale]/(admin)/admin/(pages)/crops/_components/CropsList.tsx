import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ImagePreview from "@/components/common/ImagePreview";
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
import type { Crop } from "@/types/admin/crop";
import type { CropCategory } from "@/types/admin/cropCategory";
import CropRowActions from "./CropRowActions";

const cell = "px-4 py-3 text-start text-sm text-gray-700 dark:text-gray-300";

export default function CropsList({
  crops,
  pagination,
  filtered,
  categories,
}: {
  crops: Crop[];
  pagination: PaginationMeta;
  filtered: boolean;
  categories: CropCategory[];
}) {
  const t = useTranslations("crops");
  return (
    <section
      aria-label={t("title")}
      className="shadow-theme-xs overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">{t("description")}</caption>
          <TableHeader className="bg-brand-50/70 border-b border-gray-200 dark:border-gray-800 dark:bg-gray-800">
            <TableRow>
              {[
                "image",
                "name",
                "category",
                "scientificName",
                "slug",
                "status",
                "addedAt",
                "actions",
              ].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-4 py-3 text-start text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                >
                  {t(`fields.${key}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {crops.map((crop) => (
              <TableRow
                key={crop.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <TableCell className={cell}>
                  <ImagePreview
                    src={crop.image_url}
                    alt={t("image.alt", { name: crop.name ?? crop.slug })}
                    width={80}
                    height={56}
                    className="h-14 w-20 rounded-lg object-cover"
                  />
                </TableCell>
                <TableCell className={`${cell} min-w-36 font-semibold`}>
                  <Link
                    href={`/admin/crops/${crop.id}/edit`}
                    className="hover:text-brand-600 dark:hover:text-brand-300 text-gray-900 dark:text-gray-100"
                  >
                    {crop.name ?? t("unnamed")}
                  </Link>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  <Badge color="primary">
                    {crop.category_name ?? t("notAvailable")}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} min-w-40 italic`}>
                  {crop.scientific_name || t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>{crop.slug}</TableCell>
                <TableCell className={cell}>
                  <Badge color={crop.is_active ? "success" : "light"}>
                    {crop.is_active ? t("active") : t("inactive")}
                  </Badge>
                </TableCell>
                <TableCell className={`${cell} whitespace-nowrap`}>
                  {crop.added_at ?? t("notAvailable")}
                </TableCell>
                <TableCell className={cell}>
                  <CropRowActions
                    crop={crop}
                    canActivate={categories.some(
                      (category) =>
                        category.id === crop.category_id && category.is_active,
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {crops.length === 0 && (
        <div className="px-5 py-12 text-center">
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {filtered ? t("emptyFiltered") : t("empty")}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {filtered ? t("emptyFilteredHelp") : t("emptyHelp")}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
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
    </section>
  );
}
