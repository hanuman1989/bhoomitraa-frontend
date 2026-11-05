"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { regionsAPI } from "@/lib/apis/admin/regions";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import type {
  Region,
  RegionPayload,
  RegionsListResponse,
  RegionType,
} from "@/types/admin/region";

export async function saveRegion(
  id: number | null,
  payload: RegionPayload,
): Promise<ActionResult<Region>> {
  const t = await getTranslations("regions.feedback");
  try {
    await requireAdmin();
    const response =
      id === null
        ? await regionsAPI.create(payload)
        : await regionsAPI.update(id, payload);
    if (!response.status)
      return { success: false, message: response.message || t("saveFailed") };
    revalidatePath("/[locale]/admin/regions", "page");
    if (id !== null)
      revalidatePath("/[locale]/admin/regions/[id]/edit", "page");
    return {
      success: true,
      message: response.message || t("saved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<Region>(error, t("saveFailed"));
  }
}

export async function deleteRegion(id: number): Promise<ActionResult> {
  const t = await getTranslations("regions.feedback");
  try {
    await requireAdmin();
    const response = await regionsAPI.delete(id);
    if (!response.status)
      return { success: false, message: response.message || t("deleteFailed") };
    revalidatePath("/[locale]/admin/regions", "page");
    revalidatePath("/[locale]/admin/regions/[id]/edit", "page");
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}

export async function searchRegionParents(
  type: RegionType,
  keyword: string,
  page: number,
): Promise<ActionResult<RegionsListResponse>> {
  const t = await getTranslations("regions.feedback");
  try {
    await requireAdmin();
    const response = await regionsAPI.list({
      region_type: type,
      keyword: keyword || undefined,
      page,
      per_page: 20,
    });
    if (!response.status)
      return {
        success: false,
        message: response.message || t("parentsFailed"),
      };
    return { success: true, message: response.message, data: response };
  } catch (error: unknown) {
    return handleActionError<RegionsListResponse>(error, t("parentsFailed"));
  }
}
