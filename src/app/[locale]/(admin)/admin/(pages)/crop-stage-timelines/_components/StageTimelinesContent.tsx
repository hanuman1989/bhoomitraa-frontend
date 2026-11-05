import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import {
  stageTimelinesAPI,
  getTimelineChoices,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageProps } from "@/types/api";
import type {
  StageTimelineFilters,
  StageTimelinesResponse,
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import TimelineFiltersUI from "./StageTimelineFilters";
import StageTimelineList from "./StageTimelineList";

export default async function StageTimelinesContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("stageTimelines");
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
  const filters: StageTimelineFilters = {
    keyword: value("keyword").trim().slice(0, 150),
    crop_id: id("crop_id"),
    crop_stage_id: id("crop_stage_id"),
    crop_variety_id: id("crop_variety_id"),
    season_id: id("season_id"),
    status: status === "1" || status === "0" ? status : "",
  };
  let result: StageTimelinesResponse | undefined;
  let choices: TimelineChoices = {};
  let selections: TimelineSelections = {};
  let failure = "";
  try {
    await requireAdmin();
    choices = await getTimelineChoices(
      filters.crop_id ? Number(filters.crop_id) : null,
      false,
      false,
    );
    const response = await stageTimelinesAPI.list({
      ...filters,
      page: id("page") ? Number(id("page")) : 1,
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
          pathname: "/admin/crop-stage-timelines",
          query: { ...filters, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
    selections = await getTimelineSelections(choices, {
      crop: filters.crop_id ? Number(filters.crop_id) : null,
      stage: filters.crop_stage_id ? Number(filters.crop_stage_id) : null,
      variety: filters.crop_variety_id ? Number(filters.crop_variety_id) : null,
      season: filters.season_id ? Number(filters.season_id) : null,
    });
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <TimelineFiltersUI
        key={JSON.stringify(params)}
        initialFilters={filters}
        choices={choices}
        selections={selections}
      />
      {failure ? (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {failure}
        </p>
      ) : result ? (
        <StageTimelineList
          result={result}
          filtered={Object.values(filters).some((value) => value !== "")}
        />
      ) : null}
    </div>
  );
}
