import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropYieldBenchmarksAPI } from "@/lib/apis/admin/cropYieldBenchmarks";
import {
  getTimelineOptions,
  getTimelineRegions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { CropYieldBenchmark } from "@/types/admin/cropYieldBenchmark";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import CropYieldBenchmarkForm from "./CropYieldBenchmarkForm";
import CropYieldBenchmarkDetails from "./CropYieldBenchmarkDetails";

export default async function CropYieldBenchmarkEditor({
  id,
  viewOnly = false,
}: {
  id?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("cropYieldBenchmarks");
  let benchmark: CropYieldBenchmark | null = null,
    choices: TimelineChoices = {},
    selections: TimelineSelections = {},
    states: TimelineState[] = [],
    canReview = false,
    maxReferenceYear = 0;
  try {
    canReview = (await requireAdmin()).is_super_user;
    maxReferenceYear = new Date().getUTCFullYear();
    if (id !== undefined) {
      const number = Number(id);
      if (!Number.isSafeInteger(number) || number < 1) notFound();
      const response = await cropYieldBenchmarksAPI.show(number);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      benchmark = response.data;
    }
    if (!viewOnly && !(benchmark?.is_active && !canReview)) {
      const cropId = benchmark?.crop_id ?? null;
      const [crop, variety, season, source, regions] = await Promise.all([
        getTimelineOptions("crop", null, true),
        cropId ? getTimelineOptions("variety", cropId, true) : undefined,
        getTimelineOptions("season", null, true),
        getTimelineOptions("source", null, true),
        getTimelineRegions(benchmark?.regions ?? []),
      ]);
      choices = { crop, variety, season, source };
      states = regions;
      selections = await getTimelineSelections(choices, {
        crop: cropId,
        variety: benchmark?.crop_variety_id ?? null,
        season: benchmark?.season_id ?? null,
        source: benchmark?.source_id ?? null,
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
  return benchmark && (viewOnly || (benchmark.is_active && !canReview)) ? (
    <>
      {!viewOnly && (
        <p
          role="status"
          className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 mb-5 rounded-xl p-4 text-sm"
        >
          {t("form.locked")}
        </p>
      )}
      <CropYieldBenchmarkDetails benchmark={benchmark} canReview={canReview} />
    </>
  ) : (
    <CropYieldBenchmarkForm
      key={benchmark?.id ?? "new"}
      benchmark={benchmark}
      choices={choices}
      selections={selections}
      states={states}
      canReview={canReview}
      maxReferenceYear={maxReferenceYear}
    />
  );
}
