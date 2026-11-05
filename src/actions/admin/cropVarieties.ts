"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { languages } from "@/i18n/languages";
import { requireAdmin } from "@/lib/auth/dal";
import { cropVarietiesAPI } from "@/lib/apis/admin/cropVarieties";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import {
  requiredVarietyLocales,
  type CropVariety,
  type CropVarietyPayload,
  type VarietyRelationPage,
} from "@/types/admin/cropVariety";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/crop-varieties", "page");
  revalidatePath("/[locale]/admin/crop-varieties/[id]/edit", "page");
}
export async function saveCropVariety(
  id: number | null,
  values: CropVarietyPayload,
): Promise<ActionResult<CropVariety>> {
  const t = await getTranslations("cropVarieties.feedback");
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.crop_id) ||
      typeof values.slug !== "string" ||
      typeof values.is_active !== "boolean" ||
      (values.source_id !== null && !validId(values.source_id)) ||
      [values.maturity_days_min, values.maturity_days_max].some(
        (value) =>
          value !== null && (!Number.isSafeInteger(value) || value < 1),
      ) ||
      requiredVarietyLocales.some(
        (locale) => typeof values.translations?.[locale]?.name !== "string",
      )
    )
      return { success: false, message: t("invalid") };
    const payload: CropVarietyPayload = {
      crop_id: values.crop_id,
      slug: values.slug,
      variety_code: values.variety_code,
      maturity_days_min: values.maturity_days_min,
      maturity_days_max: values.maturity_days_max,
      source_id: values.source_id,
      is_active: values.is_active,
      translations: Object.fromEntries(
        Object.entries(values.translations)
          .filter(([locale]) =>
            languages.some((language) => language.id === locale),
          )
          .map(([locale, translation]) => [
            locale,
            {
              name: translation.name,
              description: translation.description,
              region_notes: translation.region_notes,
            },
          ]),
      ),
    };
    const response =
      id === null
        ? await cropVarietiesAPI.create(payload)
        : await cropVarietiesAPI.update(id, payload);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("saveFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("saved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<CropVariety>(error, t("saveFailed"));
  }
}
export async function updateCropVarietyStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<CropVariety>> {
  const t = await getTranslations("cropVarieties.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    const response = await cropVarietiesAPI.updateStatus(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("statusSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<CropVariety>(error, t("actionFailed"));
  }
}
export async function deleteCropVariety(id: number): Promise<ActionResult> {
  const t = await getTranslations("cropVarieties.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await cropVarietiesAPI.delete(id);
    if (!response.status)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("actionFailed"));
  }
}
export async function searchVarietyRelations(
  kind: "crop" | "source",
  keyword: string,
  page: number,
  eligible: boolean,
): Promise<ActionResult<VarietyRelationPage>> {
  const t = await getTranslations("cropVarieties.feedback");
  try {
    await requireAdmin();
    if (
      !["crop", "source"].includes(kind) ||
      typeof keyword !== "string" ||
      !validId(page) ||
      typeof eligible !== "boolean"
    )
      return { success: false, message: t("invalid") };
    const params = {
      keyword: keyword.trim().slice(0, 150) || undefined,
      page,
      per_page: 20,
      ...(eligible && { is_active: 1 }),
    };
    const response =
      kind === "crop"
        ? await cropsAPI.list(params)
        : await knowledgeSourcesAPI.list({
            ...params,
            ...(eligible && { verification_status: "verified" }),
            sort_by: "title",
            sort_direction: "asc",
          });
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      return { success: false, message: response.message || t("loadFailed") };
    return { success: true, message: response.message, data: response };
  } catch (error: unknown) {
    return handleActionError<VarietyRelationPage>(error, t("loadFailed"));
  }
}
