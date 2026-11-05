import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageProps } from "@/types/api";
import type { CropsFilterValues, CropsListResponse } from "@/types/admin/crop";
import type { CropCategory } from "@/types/admin/cropCategory";
import loadCropCategories from "./loadCropCategories";
import CropsFilters from "./CropsFilters";
import CropsList from "./CropsList";

export default async function CropsContent({ searchParams }: PageProps) {
  const t = await getTranslations("crops");
  const params = await searchParams;
  const value = (key: string) => {
    const entry = params[key];
    return Array.isArray(entry) ? (entry[0] ?? "") : (entry ?? "");
  };
  const status = value("status");
  const categoryId = Number(value("category_id"));
  const requestedPage = Number(value("page"));
  const filters: CropsFilterValues = {
    keyword: value("keyword").trim().slice(0, 150),
    category_id:
      Number.isSafeInteger(categoryId) && categoryId > 0
        ? String(categoryId)
        : "",
    status: status === "1" || status === "0" ? status : "",
  };
  let categories: CropCategory[] = [];
  let result: CropsListResponse | undefined;
  let failure = "";
  try {
    await requireAdmin();
    const [options, response] = await Promise.all([
      loadCropCategories(false),
      cropsAPI.list({
        keyword: filters.keyword || undefined,
        category_id: filters.category_id || undefined,
        is_active: filters.status === "" ? undefined : filters.status,
        page:
          Number.isSafeInteger(requestedPage) && requestedPage > 0
            ? requestedPage
            : 1,
        per_page: 15,
      }),
    ]);
    categories = options;
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      failure = response.message || t("loadFailed");
    else result = response;
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("loadFailed"))).message;
  }
  if (result && result.pagination.current_page > result.pagination.last_page)
    redirect({
      href: {
        pathname: "/admin/crops",
        query: { ...filters, page: Math.max(1, result.pagination.last_page) },
      },
      locale: await getLocale(),
    });
  return (
    <div className="min-w-0">
      <CropsFilters
        key={JSON.stringify(filters)}
        initialFilters={filters}
        categories={categories}
      />
      {failure ? (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {failure}
        </p>
      ) : result ? (
        <CropsList
          categories={categories}
          crops={result.data}
          pagination={result.pagination}
          filtered={Object.values(filters).some(Boolean)}
        />
      ) : null}
    </div>
  );
}
