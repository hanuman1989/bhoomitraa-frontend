import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropCategoriesAPI } from "@/lib/apis/admin/cropCategories";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageProps } from "@/types/api";
import type {
  CropCategoriesFilterValues,
  CropCategoriesListResponse,
} from "@/types/admin/cropCategory";
import CropCategoriesFilters from "./CropCategoriesFilters";
import CropCategoriesList from "./CropCategoriesList";

export default async function CropCategoriesContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("cropCategories");
  const params = await searchParams;
  const value = (key: string) => {
    const entry = params[key];
    return Array.isArray(entry) ? (entry[0] ?? "") : (entry ?? "");
  };
  const status = value("status");
  const filters: CropCategoriesFilterValues = {
    keyword: value("keyword").trim().slice(0, 150),
    status: status === "1" || status === "0" ? status : "",
  };
  const requestedPage = Number(value("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  let result: CropCategoriesListResponse | undefined;
  let failure = "";
  try {
    await requireAdmin();
    const response = await cropCategoriesAPI.list({
      keyword: filters.keyword || undefined,
      is_active: filters.status === "" ? undefined : filters.status,
      page,
      per_page: 15,
    });
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
        pathname: "/admin/crop-categories",
        query: { ...filters, page: Math.max(1, result.pagination.last_page) },
      },
      locale: await getLocale(),
    });
  return (
    <div className="min-w-0">
      <CropCategoriesFilters
        key={JSON.stringify(filters)}
        initialFilters={filters}
      />
      {failure ? (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {failure}
        </p>
      ) : result ? (
        <CropCategoriesList
          categories={result.data}
          pagination={result.pagination}
          filtered={filters.keyword !== "" || filters.status !== ""}
        />
      ) : null}
    </div>
  );
}
