"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { cropSeedRatesAPI } from "@/lib/apis/admin/cropSeedRates";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult, ApiResponse } from "@/types/api";
import type {
  CropSeedRate,
  CropSeedRatePayload,
} from "@/types/admin/cropSeedRate";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/crop-seed-rates", "page");
  revalidatePath("/[locale]/admin/crop-seed-rates/[id]", "page");
  revalidatePath("/[locale]/admin/crop-seed-rates/[id]/edit", "page");
}
async function saved(
  response: ApiResponse<CropSeedRate>,
): Promise<ActionResult<CropSeedRate>> {
  if (!response.status || !response.data?.id)
    return {
      success: false,
      message: (await getTranslations("cropSeedRates.feedback"))("failed"),
    };
  invalidate();
  return { success: true, message: response.message, data: response.data };
}
export async function saveCropSeedRate(
  id: number | null,
  values: CropSeedRatePayload,
): Promise<ActionResult<CropSeedRate>> {
  const t = await getTranslations("cropSeedRates.feedback");
  try {
    const admin = await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.crop_id) ||
      !validId(values.source_id) ||
      typeof values.is_active !== "boolean"
    )
      return { success: false, message: t("invalid") };
    if (values.is_active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    const payload: CropSeedRatePayload = {
      crop_id: values.crop_id,
      crop_variety_id: values.crop_variety_id,
      seed_id: values.seed_id,
      season_id: values.season_id,
      material_type: values.material_type,
      sowing_method: values.sowing_method,
      irrigation_condition: values.irrigation_condition,
      rate_basis: values.rate_basis,
      rate_min: values.rate_min,
      rate_recommended: values.rate_recommended,
      rate_max: values.rate_max,
      rate_unit_code: values.rate_unit_code,
      area_unit_code: values.area_unit_code,
      spacing_row_cm: values.spacing_row_cm,
      spacing_plant_cm: values.spacing_plant_cm,
      source_id: values.source_id,
      notes: values.notes,
      is_active: values.is_active,
      region_scope: values.region_scope,
      region_ids: values.region_scope === "all" ? [] : values.region_ids,
    };
    return await saved(
      id === null
        ? await cropSeedRatesAPI.create(payload)
        : await cropSeedRatesAPI.update(id, payload),
    );
  } catch (error: unknown) {
    return handleActionError<CropSeedRate>(error, t("failed"));
  }
}
export async function updateCropSeedRateStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<CropSeedRate>> {
  const t = await getTranslations("cropSeedRates.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    if (active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    return await saved(await cropSeedRatesAPI.updateStatus(id, active));
  } catch (error: unknown) {
    return handleActionError<CropSeedRate>(error, t("failed"));
  }
}
export async function deleteCropSeedRate(id: number): Promise<ActionResult> {
  const t = await getTranslations("cropSeedRates.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await cropSeedRatesAPI.delete(id);
    if (!response.status) return { success: false, message: t("failed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}
