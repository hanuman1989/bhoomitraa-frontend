import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropSeedRatesAPI } from "@/lib/apis/admin/cropSeedRates";
import {
  getTimelineOptions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import { materialTypes } from "@/types/admin/seed";
import type {
  CropSeedRateFilters,
  CropSeedRatesResponse,
} from "@/types/admin/cropSeedRate";
import type { PageProps } from "@/types/api";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import CropSeedRatesFilters from "./CropSeedRatesFilters";
import CropSeedRatesList from "./CropSeedRatesList";

export default async function CropSeedRatesContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("cropSeedRates"),
    params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  };
  const id = (key: string) =>
    Number.isSafeInteger(Number(value(key))) && Number(value(key)) > 0
      ? String(Number(value(key)))
      : "";
  const filters: CropSeedRateFilters = {
    keyword: value("keyword").trim().slice(0, 150),
    crop_id: id("crop_id"),
    crop_variety_id: id("crop_id") ? id("crop_variety_id") : "",
    season_id: id("season_id"),
    material_type:
      materialTypes.find((type) => type === value("material_type")) ?? "",
    region_scope:
      value("region_scope") === "all"
        ? "all"
        : value("region_scope") === "specific"
          ? "specific"
          : "",
    is_active:
      value("is_active") === "0" ? "0" : value("is_active") === "1" ? "1" : "",
  };
  let result: CropSeedRatesResponse | undefined,
    choices: TimelineChoices = {},
    selections: TimelineSelections = {},
    failure = "",
    canReview = false;
  try {
    canReview = (await requireAdmin()).is_super_user;
    const [response, crop, variety, season] = await Promise.all([
      cropSeedRatesAPI.list({
        ...filters,
        page: id("page") ? Number(id("page")) : 1,
        per_page: 10,
      }),
      getTimelineOptions("crop", null, false),
      filters.crop_id
        ? getTimelineOptions("variety", Number(filters.crop_id), false)
        : undefined,
      getTimelineOptions("season", null, false),
    ]);
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    result = response;
    choices = { crop, variety, season };
    if (result.pagination.current_page > result.pagination.last_page)
      redirect({
        href: {
          pathname: "/admin/crop-seed-rates",
          query: { ...params, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
    selections = await getTimelineSelections(choices, {
      crop: filters.crop_id ? Number(filters.crop_id) : null,
      variety: filters.crop_variety_id ? Number(filters.crop_variety_id) : null,
      season: filters.season_id ? Number(filters.season_id) : null,
    });
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <CropSeedRatesFilters
        key={JSON.stringify(params)}
        initialFilters={filters}
        choices={choices}
        selections={selections}
      />
      {failure ? (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-5"
        >
          {failure}
        </p>
      ) : result ? (
        <CropSeedRatesList
          result={result}
          canReview={canReview}
          filtered={Object.values(filters).some((value) => value !== "")}
        />
      ) : null}
    </div>
  );
}
