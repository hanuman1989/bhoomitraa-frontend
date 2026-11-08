"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { cropYieldBenchmarksAPI } from "@/lib/apis/admin/cropYieldBenchmarks";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult, ApiResponse } from "@/types/api";
import type {
  CropYieldBenchmark,
  CropYieldBenchmarkPayload,
} from "@/types/admin/cropYieldBenchmark";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/crop-yield-benchmarks", "page");
  revalidatePath("/[locale]/admin/crop-yield-benchmarks/[id]", "page");
  revalidatePath("/[locale]/admin/crop-yield-benchmarks/[id]/edit", "page");
}
async function saved(
  response: ApiResponse<CropYieldBenchmark>,
): Promise<ActionResult<CropYieldBenchmark>> {
  if (!response.status || !response.data?.id)
    return {
      success: false,
      message: (await getTranslations("cropYieldBenchmarks.feedback"))(
        "failed",
      ),
    };
  invalidate();
  return { success: true, message: response.message, data: response.data };
}
export async function saveCropYieldBenchmark(
  id: number | null,
  values: CropYieldBenchmarkPayload,
): Promise<ActionResult<CropYieldBenchmark>> {
  const t = await getTranslations("cropYieldBenchmarks.feedback");
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
    const payload: CropYieldBenchmarkPayload = {
      crop_id: values.crop_id,
      crop_variety_id: values.crop_variety_id,
      season_id: values.season_id,
      yield_min_kg_ha: values.yield_min_kg_ha,
      yield_avg_kg_ha: values.yield_avg_kg_ha,
      yield_max_kg_ha: values.yield_max_kg_ha,
      benchmark_type: values.benchmark_type,
      source_id: values.source_id,
      reference_year: values.reference_year,
      notes: values.notes,
      is_active: values.is_active,
      region_scope: values.region_scope,
      region_ids: values.region_scope === "all" ? [] : values.region_ids,
    };
    return await saved(
      id === null
        ? await cropYieldBenchmarksAPI.create(payload)
        : await cropYieldBenchmarksAPI.update(id, payload),
    );
  } catch (error: unknown) {
    return handleActionError<CropYieldBenchmark>(error, t("failed"));
  }
}
export async function updateCropYieldBenchmarkStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<CropYieldBenchmark>> {
  const t = await getTranslations("cropYieldBenchmarks.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    if (active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    return await saved(await cropYieldBenchmarksAPI.updateStatus(id, active));
  } catch (error: unknown) {
    return handleActionError<CropYieldBenchmark>(error, t("failed"));
  }
}
export async function deleteCropYieldBenchmark(
  id: number,
): Promise<ActionResult> {
  const t = await getTranslations("cropYieldBenchmarks.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await cropYieldBenchmarksAPI.delete(id);
    if (!response.status) return { success: false, message: t("failed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}
