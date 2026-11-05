import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import {
  stageTimelinesAPI,
  getTimelineChoices,
  getTimelineSelections,
  getTimelineRegions,
} from "@/lib/apis/admin/cropStageTimelines";
import type {
  StageTimeline,
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import StageTimelineForm from "./StageTimelineForm";

export default async function StageTimelineEditor({ id }: { id?: string }) {
  const t = await getTranslations("stageTimelines");
  let timeline: StageTimeline | null = null;
  let choices: TimelineChoices;
  let selections: TimelineSelections;
  let states: TimelineState[];
  try {
    await requireAdmin();
    if (id !== undefined) {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
      const r = await stageTimelinesAPI
        .show(numericId)
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 404) notFound();
          throw error;
        });
      if (!r.status || !r.data?.id || !r.data.crop_id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      timeline = r.data;
    }
    [choices, states] = await Promise.all([
      getTimelineChoices(timeline?.crop_id ?? null, true, true),
      getTimelineRegions(timeline?.regions),
    ]);
    selections = timeline
      ? await getTimelineSelections(choices, {
          crop: timeline.crop_id,
          stage: timeline.crop_stage_id,
          variety: timeline.crop_variety_id,
          season: timeline.season_id,
          source: timeline.source_id,
        })
      : {};
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
    <StageTimelineForm
      key={timeline?.id ?? "new"}
      timeline={timeline}
      choices={choices}
      selections={selections}
      states={states}
    />
  );
}
