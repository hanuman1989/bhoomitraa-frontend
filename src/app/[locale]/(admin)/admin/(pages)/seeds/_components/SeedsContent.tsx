import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { seedsAPI } from "@/lib/apis/admin/seeds";
import {
  getTimelineOptions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import {
  materialTypes,
  seedVerificationStatuses,
  type SeedFilters,
  type SeedsResponse,
} from "@/types/admin/seed";
import type { PageProps } from "@/types/api";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import SeedsFilters from "./SeedsFilters";
import SeedsList from "./SeedsList";

export default async function SeedsContent({ searchParams }: PageProps) {
  const t = await getTranslations("seeds");
  const params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  };
  const id = (key: string) =>
    Number.isSafeInteger(Number(value(key))) && Number(value(key)) > 0
      ? String(Number(value(key)))
      : "";
  const filters: SeedFilters = {
    keyword: value("keyword").trim().slice(0, 150),
    crop_id: id("crop_id"),
    crop_variety_id: id("crop_id") ? id("crop_variety_id") : "",
    material_type:
      materialTypes.find((type) => type === value("material_type")) ?? "",
    is_active:
      value("is_active") === "0" ? "0" : value("is_active") === "1" ? "1" : "",
    verification_status:
      seedVerificationStatuses.find(
        (status) => status === value("verification_status"),
      ) ?? "",
    setup_status:
      value("setup_status") === "draft"
        ? "draft"
        : value("setup_status") === "completed"
          ? "completed"
          : "",
  };
  let result: SeedsResponse | undefined,
    failure = "",
    canReview = false;
  let choices: TimelineChoices = {},
    selections: TimelineSelections = {};
  try {
    canReview = (await requireAdmin()).is_super_user;
    const [response, crop, variety] = await Promise.all([
      seedsAPI.list({
        ...filters,
        page: id("page") ? Number(id("page")) : 1,
        per_page: 10,
      }),
      getTimelineOptions("crop", null, false),
      filters.crop_id
        ? getTimelineOptions("variety", Number(filters.crop_id), false)
        : undefined,
    ]);
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    result = response;
    choices = { crop, variety };
    if (result.pagination.current_page > result.pagination.last_page)
      redirect({
        href: {
          pathname: "/admin/seeds",
          query: { ...params, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
    selections = await getTimelineSelections(choices, {
      crop: filters.crop_id ? Number(filters.crop_id) : null,
      variety: filters.crop_variety_id ? Number(filters.crop_variety_id) : null,
    });
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <SeedsFilters
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
        <SeedsList
          result={result}
          filtered={Object.values(filters).some((value) => value !== "")}
          canReview={canReview}
        />
      ) : null}
    </div>
  );
}
