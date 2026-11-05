import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import {
  cropStagesAPI,
  getCropStageCropOptions,
} from "@/lib/apis/admin/cropStages";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageProps } from "@/types/api";
import type {
  CropStageCropOption,
  CropStagesFilterValues,
  CropStagesListResponse,
} from "@/types/admin/cropStage";
import CropStagesFilters from "./CropStagesFilters";
import CropStagesList from "./CropStagesList";

export default async function CropStagesContent({ searchParams }: PageProps) {
  const t = await getTranslations("cropStages");
  const params = await searchParams;
  const value = (key: string) => {
    const entry = params[key];
    return Array.isArray(entry) ? (entry[0] ?? "") : (entry ?? "");
  };
  const cropId = Number(value("crop_id"));
  const status = value("status");
  const filters: CropStagesFilterValues = {
    keyword: value("keyword").trim().slice(0, 150),
    crop_id: Number.isSafeInteger(cropId) && cropId > 0 ? String(cropId) : "",
    status: status === "1" || status === "0" ? status : "",
  };
  const requestedPage = Number(value("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  let result: CropStagesListResponse | undefined;
  let crops: CropStageCropOption[] = [];
  let failure = "";
  try {
    await requireAdmin();
    crops = await getCropStageCropOptions(false);
    const response = await cropStagesAPI.list({
      ...filters,
      crop_id: filters.crop_id ? Number(filters.crop_id) : undefined,
      page,
      per_page: 15,
    });
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    result = response;
    if (result.pagination.current_page > result.pagination.last_page)
      redirect({
        href: {
          pathname: "/admin/crop-stages",
          query: { ...filters, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <CropStagesFilters
        key={JSON.stringify(params)}
        initialFilters={filters}
        crops={crops}
      />
      {failure ? (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {failure}
        </p>
      ) : result ? (
        <CropStagesList
          result={result}
          filtered={Object.values(filters).some((value) => value !== "")}
        />
      ) : null}
    </div>
  );
}
