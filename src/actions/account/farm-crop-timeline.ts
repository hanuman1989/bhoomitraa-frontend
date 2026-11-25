"use server";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/userAuth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import { accountCropTimelineAPI } from "@/lib/apis/account/farm-crop-timeline";
import type { ActionResult, ApiResponse } from "@/types/api";
import type {
  ActivityMutationData,
  CropTimelineData,
  NoteInput,
  RescheduleInput,
} from "@/types/account/cropTimeline";

/** Rejects anything that is not a positive whole-number record id before it reaches a URL. */
function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

async function run<T>(
  id: number,
  request: () => Promise<ApiResponse<T>>,
  fallbackKey: "loadFailed" | "saveFailed" | "generateFailed",
): Promise<ActionResult<T>> {
  const t = await getTranslations("farmerCropTimeline");
  if (!validId(id)) return { success: false, message: t(fallbackKey) };
  try {
    await requireUser();
    const response = await request();
    return {
      success: response.status,
      data: response.data,
      message: response.status ? response.message : t(fallbackKey),
    };
  } catch (error) {
    return handleActionError<T>(error, t(fallbackKey));
  }
}

export async function getCropTimeline(
  cycleId: number,
): Promise<ActionResult<CropTimelineData>> {
  return run(cycleId, () => accountCropTimelineAPI.get(cycleId), "loadFailed");
}

export async function generateCropTimeline(
  cycleId: number,
): Promise<ActionResult<CropTimelineData>> {
  const result = await run(
    cycleId,
    () => accountCropTimelineAPI.generate(cycleId),
    "generateFailed",
  );
  // The crop list shows View Timeline once a timeline exists.
  if (result.success) revalidatePath("/account/crops");
  return result;
}

export async function markTimelineAlertSeen(
  cycleId: number,
): Promise<ActionResult<{ alert: { show: boolean } }>> {
  return run(
    cycleId,
    () => accountCropTimelineAPI.alertSeen(cycleId),
    "saveFailed",
  );
}

export async function updateActivityStatus(
  activityId: number,
  action: "complete" | "reopen",
): Promise<ActionResult<ActivityMutationData>> {
  if (action !== "complete" && action !== "reopen") {
    const t = await getTranslations("farmerCropTimeline");
    return { success: false, message: t("saveFailed") };
  }
  return run(
    activityId,
    () => accountCropTimelineAPI.status(activityId, action),
    "saveFailed",
  );
}

export async function rescheduleActivity(
  activityId: number,
  input: RescheduleInput,
): Promise<ActionResult<ActivityMutationData>> {
  const data: RescheduleInput = input.reset
    ? { reset: true }
    : { start_date: input.start_date, end_date: input.end_date };
  return run(
    activityId,
    () => accountCropTimelineAPI.schedule(activityId, data),
    "saveFailed",
  );
}

export async function addActivityNote(
  activityId: number,
  input: NoteInput,
): Promise<ActionResult<ActivityMutationData>> {
  return run(
    activityId,
    () =>
      accountCropTimelineAPI.addNote(activityId, {
        note: input.note,
        note_date: input.note_date,
      }),
    "saveFailed",
  );
}

export async function deleteActivityNote(
  noteId: number,
): Promise<ActionResult<ActivityMutationData>> {
  return run(
    noteId,
    () => accountCropTimelineAPI.deleteNote(noteId),
    "saveFailed",
  );
}
