"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { fertilizerRecommendationsAPI } from "@/lib/apis/admin/fertilizerRecommendations";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult, ApiResponse } from "@/types/api";
import type {
  FertilizerRecommendation,
  FertilizerRecommendationPayload,
} from "@/types/admin/fertilizerRecommendation";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/fertilizer-recommendations", "page");
  revalidatePath("/[locale]/admin/fertilizer-recommendations/[id]", "page");
  revalidatePath(
    "/[locale]/admin/fertilizer-recommendations/[id]/edit",
    "page",
  );
}
async function saved(
  response: ApiResponse<FertilizerRecommendation>,
): Promise<ActionResult<FertilizerRecommendation>> {
  if (!response.status || !response.data?.id)
    return {
      success: false,
      message: (await getTranslations("fertilizerRecommendations.feedback"))(
        "failed",
      ),
    };
  invalidate();
  return { success: true, message: response.message, data: response.data };
}
export async function saveFertilizerRecommendation(
  id: number | null,
  values: FertilizerRecommendationPayload,
): Promise<ActionResult<FertilizerRecommendation>> {
  const t = await getTranslations("fertilizerRecommendations.feedback");
  try {
    const admin = await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.crop_id) ||
      !validId(values.source_id) ||
      typeof values.is_active !== "boolean" ||
      !Array.isArray(values.nutrients)
    )
      return { success: false, message: t("invalid") };
    if (values.is_active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    const payload: FertilizerRecommendationPayload = {
      crop_id: values.crop_id,
      crop_variety_id: values.crop_variety_id,
      season_id: values.season_id,
      recommendation_type: values.recommendation_type,
      irrigation_condition: values.irrigation_condition,
      soil_condition: values.soil_condition,
      application_method: values.application_method,
      reference_code: values.reference_code,
      basal_dose_notes: values.basal_dose_notes,
      top_dressing_notes: values.top_dressing_notes,
      general_advisory: values.general_advisory,
      nutrients: values.nutrients.map(
        ({
          nutrient_code,
          recommended_quantity,
          unit_code,
          area_unit_code,
        }) => ({
          nutrient_code,
          recommended_quantity,
          unit_code,
          area_unit_code,
        }),
      ),
      source_id: values.source_id,
      reference_year: values.reference_year,
      notes: values.notes,
      is_active: values.is_active,
      region_scope: values.region_scope,
      region_ids: values.region_scope === "all" ? [] : values.region_ids,
    };
    return await saved(
      id === null
        ? await fertilizerRecommendationsAPI.create(payload)
        : await fertilizerRecommendationsAPI.update(id, payload),
    );
  } catch (error: unknown) {
    return handleActionError<FertilizerRecommendation>(error, t("failed"));
  }
}
export async function updateFertilizerRecommendationStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<FertilizerRecommendation>> {
  const t = await getTranslations("fertilizerRecommendations.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    if (active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    return await saved(
      await fertilizerRecommendationsAPI.updateStatus(id, active),
    );
  } catch (error: unknown) {
    return handleActionError<FertilizerRecommendation>(error, t("failed"));
  }
}
export async function deleteFertilizerRecommendation(
  id: number,
): Promise<ActionResult> {
  const t = await getTranslations("fertilizerRecommendations.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await fertilizerRecommendationsAPI.delete(id);
    if (!response.status) return { success: false, message: t("failed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}
