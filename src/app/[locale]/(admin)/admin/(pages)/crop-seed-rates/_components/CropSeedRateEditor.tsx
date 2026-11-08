import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropSeedRatesAPI } from "@/lib/apis/admin/cropSeedRates";
import {
  getTimelineOption,
  getTimelineOptions,
  getTimelineRegions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { CropSeedRate } from "@/types/admin/cropSeedRate";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import CropSeedRateForm from "./CropSeedRateForm";
import CropSeedRateDetails from "./CropSeedRateDetails";

export default async function CropSeedRateEditor({
  id,
  viewOnly = false,
}: {
  id?: string;
  viewOnly?: boolean;
}) {
  const t = await getTranslations("cropSeedRates");
  let rate: CropSeedRate | null = null,
    choices: TimelineChoices = {},
    selections: TimelineSelections = {},
    states: TimelineState[] = [],
    canReview = false;
  try {
    canReview = (await requireAdmin()).is_super_user;
    if (id !== undefined) {
      const number = Number(id);
      if (!Number.isSafeInteger(number) || number < 1) notFound();
      const response = await cropSeedRatesAPI.show(number);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      rate = response.data;
    }
    if (!viewOnly && !(rate?.is_active && !canReview)) {
      const cropId = rate?.crop_id ?? null;
      const [crop, variety, seed, season, source, regions] = await Promise.all([
        getTimelineOptions("crop", null, true),
        cropId ? getTimelineOptions("variety", cropId, true) : undefined,
        cropId ? getTimelineOptions("seed", cropId, true) : undefined,
        getTimelineOptions("season", null, true),
        getTimelineOptions("source", null, true),
        getTimelineRegions(rate?.regions ?? []),
      ]);
      choices = { crop, variety, seed, season, source };
      states = regions;
      selections = await getTimelineSelections(choices, {
        crop: cropId,
        variety: rate?.crop_variety_id ?? null,
        season: rate?.season_id ?? null,
        source: rate?.source_id ?? null,
      });
      if (rate?.seed_id) {
        const seedId = rate.seed_id;
        selections.seed = seed?.options.find((option) => option.id === seedId);
        if (!selections.seed) {
          try {
            selections.seed = await getTimelineOption("seed", seedId);
          } catch (error: unknown) {
            if (!(error instanceof ApiError) || error.status !== 404)
              throw error;
            selections.seed = {
              id: seedId,
              label: rate.seed?.name ?? t("recordId", { id: seedId }),
              is_active: false,
            };
          }
        }
      }
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
  return rate && (viewOnly || (rate.is_active && !canReview)) ? (
    <>
      {!viewOnly && (
        <p
          role="status"
          className="bg-warning-50 text-warning-800 dark:bg-warning-500/10 dark:text-warning-300 mb-5 rounded-xl p-4 text-sm"
        >
          {t("form.locked")}
        </p>
      )}
      <CropSeedRateDetails rate={rate} canReview={canReview} />
    </>
  ) : (
    <CropSeedRateForm
      key={rate?.id ?? "new"}
      rate={rate}
      choices={choices}
      selections={selections}
      states={states}
      canReview={canReview}
    />
  );
}
