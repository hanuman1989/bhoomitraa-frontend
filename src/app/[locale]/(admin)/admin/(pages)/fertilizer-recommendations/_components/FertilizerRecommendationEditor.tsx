import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { fertilizerRecommendationsAPI } from "@/lib/apis/admin/fertilizerRecommendations";
import {
  getTimelineOptions,
  getTimelineRegions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type {
  FertilizerRecommendation,
  FertilizerRecommendationOptions,
} from "@/types/admin/fertilizerRecommendation";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import FertilizerRecommendationForm from "./FertilizerRecommendationForm";
import FertilizerRecommendationDetails from "./FertilizerRecommendationDetails";

export default async function FertilizerRecommendationEditor({
  id,
  viewOnly = false,
}: {
  id?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("fertilizerRecommendations");
  let options: FertilizerRecommendationOptions | undefined;
  let recommendation: FertilizerRecommendation | null = null,
    choices: TimelineChoices = {},
    selections: TimelineSelections = {},
    states: TimelineState[] = [],
    canReview = false,
    maxReferenceYear = 0;
  try {
    canReview = (await requireAdmin()).is_super_user;
    maxReferenceYear = new Date().getUTCFullYear();
    const number = id === undefined ? null : Number(id);
    if (number !== null && (!Number.isSafeInteger(number) || number < 1))
      notFound();
    const [optionResponse, response] = await Promise.all([
      fertilizerRecommendationsAPI.options(),
      number === null ? undefined : fertilizerRecommendationsAPI.show(number),
    ]);
    if (
      !optionResponse.status ||
      !optionResponse.data ||
      !Array.isArray(optionResponse.data.nutrient_codes) ||
      !Array.isArray(optionResponse.data.recommendation_types)
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    options = optionResponse.data;
    if (response) {
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      recommendation = response.data;
    }
    if (!viewOnly && !(recommendation?.is_active && !canReview)) {
      const cropId = recommendation?.crop_id ?? null;
      const [crop, variety, season, source, regions] = await Promise.all([
        getTimelineOptions("crop", null, true),
        cropId ? getTimelineOptions("variety", cropId, true) : undefined,
        getTimelineOptions("season", null, true),
        getTimelineOptions("source", null, true),
        getTimelineRegions(recommendation?.regions ?? []),
      ]);
      choices = { crop, variety, season, source };
      states = regions;
      selections = await getTimelineSelections(choices, {
        crop: cropId,
        variety: recommendation?.crop_variety_id ?? null,
        season: recommendation?.season_id ?? null,
        source: recommendation?.source_id ?? null,
      });
    }
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("feedback.loadFailed"));
    return (
      <p
        role="alert"
        className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-5"
      >
        {failure.message}
      </p>
    );
  }
  return recommendation &&
    (viewOnly || (recommendation.is_active && !canReview)) ? (
    <>
      {!viewOnly && (
        <p
          role="status"
          className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 mb-5 rounded-xl p-4 text-sm"
        >
          {t("form.locked")}
        </p>
      )}
      <FertilizerRecommendationDetails
        recommendation={recommendation}
        options={options}
        canReview={canReview}
      />
    </>
  ) : (
    <FertilizerRecommendationForm
      key={recommendation?.id ?? "new"}
      recommendation={recommendation}
      options={options}
      choices={choices}
      selections={selections}
      states={states}
      canReview={canReview}
      maxReferenceYear={maxReferenceYear}
    />
  );
}
