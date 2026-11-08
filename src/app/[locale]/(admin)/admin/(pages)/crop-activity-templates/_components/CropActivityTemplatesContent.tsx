import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import {
  cropActivityTemplatesAPI,
  getTemplateChoices,
} from "@/lib/apis/admin/cropActivityTemplates";
import { getTimelineSelections } from "@/lib/apis/admin/cropStageTimelines";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageProps } from "@/types/api";
import {
  templatePriorities,
  type CropActivityTemplateFilters,
  type CropActivityTemplatesResponse,
} from "@/types/admin/cropActivityTemplate";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import CropActivityTemplateFiltersUI from "./CropActivityTemplateFilters";
import CropActivityTemplateList from "./CropActivityTemplateList";

export default async function CropActivityTemplatesContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("cropActivityTemplates");
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
  const filters: CropActivityTemplateFilters = {
    keyword: value("keyword").trim().slice(0, 150),
    crop_id: id("crop_id"),
    category_id: id("category_id"),
    crop_variety_id: id("crop_variety_id"),
    crop_stage_id: id("crop_stage_id"),
    season_id: id("season_id"),
    priority:
      templatePriorities.find((priority) => priority === value("priority")) ??
      "",
    status: status === "0" || status === "1" ? status : "",
  };
  let result: CropActivityTemplatesResponse | undefined;
  let choices: TimelineChoices = {};
  let selections: TimelineSelections = {};
  let failure = "";
  let canReview = false;
  try {
    const admin = await requireAdmin();
    canReview = admin.is_super_user;
    const [options, response] = await Promise.all([
      getTemplateChoices(
        filters.crop_id ? Number(filters.crop_id) : null,
        false,
        false,
      ),
      cropActivityTemplatesAPI.list({
        ...filters,
        page: id("page") ? Number(id("page")) : 1,
        per_page: 15,
      }),
    ]);
    choices = options;
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
          pathname: "/admin/crop-activity-templates",
          query: { ...filters, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
    selections = await getTimelineSelections(choices, {
      crop: filters.crop_id ? Number(filters.crop_id) : null,
      category: filters.category_id ? Number(filters.category_id) : null,
      variety: filters.crop_variety_id ? Number(filters.crop_variety_id) : null,
      stage: filters.crop_stage_id ? Number(filters.crop_stage_id) : null,
      season: filters.season_id ? Number(filters.season_id) : null,
    });
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <CropActivityTemplateFiltersUI
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
        <CropActivityTemplateList
          result={result}
          filtered={Object.values(filters).some((value) => value !== "")}
          canReview={canReview}
        />
      ) : null}
    </div>
  );
}
