import { getLocale, getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropVarietiesAPI } from "@/lib/apis/admin/cropVarieties";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import type { PageProps } from "@/types/api";
import type { CropVarietiesFilterValues } from "@/types/admin/cropVariety";
import CropVarietiesFilters from "./CropVarietiesFilters";
import CropVarietiesList from "./CropVarietiesList";

export default async function CropVarietiesContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("cropVarieties");
  const params = await searchParams;
  const value = (key: string) => {
    const entry = params[key];
    return Array.isArray(entry) ? (entry[0] ?? "") : (entry ?? "");
  };
  const id = (key: string) => {
    const number = Number(value(key));
    return Number.isSafeInteger(number) && number > 0 ? String(number) : "";
  };
  const status = value("status");
  const filters: CropVarietiesFilterValues = {
    keyword: value("keyword").trim().slice(0, 150),
    crop_id: id("crop_id"),
    source_id: id("source_id"),
    status: status === "1" || status === "0" ? status : "",
  };
  let data: {
    filters: ComponentProps<typeof CropVarietiesFilters>;
    list: ComponentProps<typeof CropVarietiesList>;
  };
  try {
    await requireAdmin();
    const [result, crops, sources] = await Promise.all([
      cropVarietiesAPI.list({
        keyword: filters.keyword || undefined,
        crop_id: filters.crop_id ? Number(filters.crop_id) : undefined,
        source_id: filters.source_id ? Number(filters.source_id) : undefined,
        status: filters.status || undefined,
        page: id("page") ? Number(id("page")) : 1,
        per_page: 15,
      }),
      cropsAPI.list({ per_page: 20, page: 1 }),
      knowledgeSourcesAPI.list({
        per_page: 20,
        page: 1,
        sort_by: "title",
        sort_direction: "asc",
      }),
    ]);
    if (
      !result.status ||
      !result.pagination ||
      !Array.isArray(result.data) ||
      !crops.status ||
      !sources.status
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    if (result.pagination.current_page > result.pagination.last_page)
      redirect({
        href: {
          pathname: "/admin/crop-varieties",
          query: { ...filters, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
    const [selectedCrop, selectedSource] = await Promise.all([
      filters.crop_id
        ? cropsAPI.show(Number(filters.crop_id))
        : Promise.resolve(null),
      filters.source_id
        ? knowledgeSourcesAPI.show(Number(filters.source_id))
        : Promise.resolve(null),
    ]);
    data = {
      filters: {
        initialFilters: filters,
        crops,
        sources,
        selectedCrop: selectedCrop?.data ?? null,
        selectedSource: selectedSource?.data ?? null,
      },
      list: {
        result,
        filtered: Object.values(filters).some(Boolean),
      },
    };
  } catch (error: unknown) {
    const failure = await handleActionError(error, t("feedback.loadFailed"));
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
      >
        {failure.message}
      </p>
    );
  }
  return (
    <div className="min-w-0 space-y-5">
      <CropVarietiesFilters key={JSON.stringify(filters)} {...data.filters} />
      <CropVarietiesList {...data.list} />
    </div>
  );
}
