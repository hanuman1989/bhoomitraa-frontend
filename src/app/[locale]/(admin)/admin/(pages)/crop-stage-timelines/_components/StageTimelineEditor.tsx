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
  getTimelineOption,
} from "@/lib/apis/admin/cropStageTimelines";
import type { PageSearchParams } from "@/types/api";
import type {
  StageTimeline,
  StageTimelineMultiSelections,
  TimelineChoices,
  TimelineSelections,
  TimelineState,
  TimelineRelationKind,
} from "@/types/admin/cropStageTimeline";
import StageTimelineForm from "./StageTimelineForm";
import StageTimelineCreateReset from "./StageTimelineCreateReset";

export default async function StageTimelineEditor({
  id,
  searchParams,
}: {
  id?: string;
  searchParams?: Promise<PageSearchParams>;
}) {
  const t = await getTranslations("stageTimelines");
  let timeline: StageTimeline | null = null;
  let choices: TimelineChoices;
  let selections: TimelineSelections;
  let multiSelections: StageTimelineMultiSelections;
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
    let querySelections: TimelineSelections = {};
    if (!timeline && searchParams) {
      const params = await searchParams;
      const queryId = (field: string) => {
        const entry = params[field];
        return Number(Array.isArray(entry) ? entry[0] : entry);
      };
      async function selection(kind: TimelineRelationKind, numericId: number) {
        if (!Number.isSafeInteger(numericId) || numericId < 1) return;
        try {
          const option = await getTimelineOption(kind, numericId);
          if (kind === "source" || option.is_active) return option;
        } catch (error: unknown) {
          if (error instanceof ApiError && error.status === 404) return;
          throw error;
        }
      }
      const [crop, stage, variety, season, source] = await Promise.all([
        selection("crop", queryId("crop_id")),
        selection("stage", queryId("crop_stage_id")),
        selection("variety", queryId("crop_variety_id")),
        selection("season", queryId("season_id")),
        selection("source", queryId("source_id")),
      ]);
      querySelections = { crop, stage, variety, season, source };
      if (!params.crop_id) {
        const cropId = stage?.crop_id ?? variety?.crop_id;
        if (cropId) querySelections.crop = await selection("crop", cropId);
      }
      if (!querySelections.crop || stage?.crop_id !== querySelections.crop.id)
        querySelections.stage = undefined;
      if (!querySelections.crop || variety?.crop_id !== querySelections.crop.id)
        querySelections.variety = undefined;
    }
    [choices, states] = await Promise.all([
      getTimelineChoices(
        timeline?.crop_id ?? querySelections.crop?.id ?? null,
        true,
        true,
      ),
      getTimelineRegions(timeline?.regions),
    ]);
    selections = timeline
      ? await getTimelineSelections(choices, {
          crop: timeline.crop_id,
          stage: timeline.crop_stage_id,
        })
      : querySelections;
    // Chip labels come from the saved relations so selections outside the
    // first options page (including inactive ones) render by name.
    multiSelections = timeline
      ? {
          varieties: timeline.varieties.map(({ id, name }) => ({
            id,
            label: name ?? t("recordId", { id }),
          })),
          seasons: timeline.seasons.map(({ id, name }) => ({
            id,
            label: name ?? t("recordId", { id }),
          })),
          knowledgeSources: timeline.knowledge_sources.map(
            ({ id, title, is_active, verification_status }) => ({
              id,
              label: title ?? t("recordId", { id }),
              is_active,
              verified: verification_status === "verified",
            }),
          ),
        }
      : {
          varieties: querySelections.variety ? [querySelections.variety] : [],
          seasons: querySelections.season ? [querySelections.season] : [],
          knowledgeSources: querySelections.source
            ? [querySelections.source]
            : [],
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
  const form = (
    <StageTimelineForm
      key={timeline?.id ?? "new"}
      timeline={timeline}
      choices={choices}
      selections={selections}
      multiSelections={multiSelections}
      states={states}
    />
  );
  // Only the Add form starts fresh from the URL on each navigation; Edit keeps
  // its existing behavior.
  return timeline ? (
    form
  ) : (
    <StageTimelineCreateReset>{form}</StageTimelineCreateReset>
  );
}
