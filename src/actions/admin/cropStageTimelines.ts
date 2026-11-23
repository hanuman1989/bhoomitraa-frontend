"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import {
  stageTimelinesAPI,
  getTimelineOptions,
} from "@/lib/apis/admin/cropStageTimelines";
import type { ActionResult } from "@/types/api";
import type {
  StageTimeline,
  StageTimelinePayload,
  TimelineOptionPage,
  TimelineRelationKind,
} from "@/types/admin/cropStageTimeline";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function validIds(ids: unknown): ids is number[] {
  return (
    Array.isArray(ids) &&
    ids.every((id) => validId(id)) &&
    new Set(ids).size === ids.length
  );
}
const scopes = ["all", "specific"];
function invalidate() {
  revalidatePath("/[locale]/admin/crop-stage-timelines", "page");
  revalidatePath("/[locale]/admin/crop-stage-timelines/[id]/edit", "page");
}

export async function saveStageTimeline(
  id: number | null,
  values: StageTimelinePayload,
): Promise<ActionResult<StageTimeline>> {
  const t = await getTranslations("stageTimelines.feedback");
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.crop_stage_id) ||
      !scopes.includes(values.variety_scope) ||
      !validIds(values.crop_variety_ids) ||
      !scopes.includes(values.season_scope) ||
      !validIds(values.season_ids) ||
      !validIds(values.knowledge_source_ids) ||
      !scopes.includes(values.region_scope) ||
      !validIds(values.region_ids) ||
      [values.days_after_sowing_min, values.days_after_sowing_max].some(
        (day) => !Number.isSafeInteger(day) || day < 0 || day > 4294967295,
      )
    )
      return { success: false, message: t("invalid") };
    // Full final state: All scopes never carry hidden selections; an empty
    // knowledge_source_ids explicitly clears sources (verified Laravel sync).
    const payload: StageTimelinePayload = {
      crop_stage_id: values.crop_stage_id,
      variety_scope: values.variety_scope,
      crop_variety_ids:
        values.variety_scope === "all" ? [] : values.crop_variety_ids,
      season_scope: values.season_scope,
      season_ids: values.season_scope === "all" ? [] : values.season_ids,
      knowledge_source_ids: values.knowledge_source_ids,
      region_scope: values.region_scope,
      region_ids: values.region_scope === "all" ? [] : values.region_ids,
      days_after_sowing_min: values.days_after_sowing_min,
      days_after_sowing_max: values.days_after_sowing_max,
    };
    const r =
      id === null
        ? await stageTimelinesAPI.create(payload)
        : await stageTimelinesAPI.update(id, payload);
    if (!r.status || !r.data?.id)
      return { success: false, message: t("saveFailed") };
    invalidate();
    return { success: true, message: r.message || t("saved"), data: r.data };
  } catch (error: unknown) {
    return handleActionError<StageTimeline>(error, t("saveFailed"));
  }
}
export async function updateStageTimelineStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<StageTimeline>> {
  const t = await getTranslations("stageTimelines.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    const r = await stageTimelinesAPI.updateStatus(id, active);
    if (!r.status || !r.data?.id)
      return { success: false, message: t("statusFailed") };
    invalidate();
    return {
      success: true,
      message: r.message || t("statusSaved"),
      data: r.data,
    };
  } catch (error: unknown) {
    return handleActionError<StageTimeline>(error, t("statusFailed"));
  }
}
export async function deleteStageTimeline(id: number): Promise<ActionResult> {
  const t = await getTranslations("stageTimelines.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const r = await stageTimelinesAPI.delete(id);
    if (!r.status) return { success: false, message: t("deleteFailed") };
    invalidate();
    return { success: true, message: r.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}
export async function searchTimelineOptions(
  kind: TimelineRelationKind,
  cropId: number | null,
  eligible: boolean,
  keyword: string,
  page: number,
): Promise<ActionResult<TimelineOptionPage>> {
  const t = await getTranslations("stageTimelines.feedback");
  try {
    await requireAdmin();
    if (
      ![
        "crop",
        "stage",
        "variety",
        "season",
        "source",
        "category",
        "district",
        "seed",
      ].includes(kind) ||
      (cropId !== null && !validId(cropId)) ||
      typeof eligible !== "boolean" ||
      typeof keyword !== "string" ||
      !validId(page)
    )
      return { success: false, message: t("invalid") };
    return {
      success: true,
      message: "",
      data: await getTimelineOptions(
        kind,
        cropId,
        eligible,
        keyword.trim().slice(0, 150),
        page,
      ),
    };
  } catch (error: unknown) {
    console.log(error, "error----");
    return handleActionError<TimelineOptionPage>(error, t("loadFailed"));
  }
}
