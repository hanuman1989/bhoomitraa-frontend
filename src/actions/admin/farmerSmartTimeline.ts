"use server";

import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { generateFarmerSmartTimelinePreview } from "@/lib/apis/admin/farmerSmartTimeline";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import type {
  TimelinePreviewData,
  TimelinePreviewInput,
} from "@/types/admin/farmerSmartTimeline";

export async function generateFarmerSmartTimelinePreviewAction(
  input: TimelinePreviewInput,
): Promise<ActionResult<TimelinePreviewData>> {
  const t = await getTranslations("farmerSmartTimeline.feedback");
  try {
    await requireAdmin();
    const validId = (value: number) => Number.isSafeInteger(value) && value > 0;
    if (
      !input ||
      !validId(input.crop_id) ||
      !validId(input.season_id) ||
      !validId(input.district_id) ||
      (input.crop_variety_id !== null && !validId(input.crop_variety_id)) ||
      typeof input.sowing_date !== "string" ||
      !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(input.sowing_date)
    ) {
      return { success: false, message: t("invalid") };
    }
    const response = await generateFarmerSmartTimelinePreview({
      crop_id: input.crop_id,
      crop_variety_id: input.crop_variety_id,
      season_id: input.season_id,
      sowing_date: input.sowing_date,
      district_id: input.district_id,
    });
    if (
      !response.status ||
      response.data?.preview_only !== true ||
      !Array.isArray(response.data.growth_stages) ||
      !Array.isArray(response.data.activities) ||
      !Array.isArray(response.data.warnings) ||
      !response.data.summary ||
      !response.data.selection ||
      !response.data.input
    ) {
      return { success: false, message: t("failed") };
    }
    return {
      success: true,
      message: response.message || t("generated"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<TimelinePreviewData>(error, t("failed"));
  }
}
