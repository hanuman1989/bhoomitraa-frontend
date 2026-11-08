"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { languages } from "@/i18n/languages";
import { cropActivityTemplatesAPI } from "@/lib/apis/admin/cropActivityTemplates";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import {
  maxTemplateOffset,
  templatePriorities,
  requiredTemplateLocales,
  type CropActivityTemplate,
  type CropActivityTemplatePayload,
} from "@/types/admin/cropActivityTemplate";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/crop-activity-templates", "page");
  revalidatePath("/[locale]/admin/crop-activity-templates/[id]/edit", "page");
  revalidatePath("/[locale]/admin/crop-activity-templates/[id]", "page");
}

export async function saveCropActivityTemplate(
  id: number | null,
  values: CropActivityTemplatePayload,
): Promise<ActionResult<CropActivityTemplate>> {
  const t = await getTranslations("cropActivityTemplates.feedback");
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.crop_id) ||
      !validId(values.category_id) ||
      !validId(values.season_id) ||
      !validId(values.source_id) ||
      (values.crop_variety_id !== null && !validId(values.crop_variety_id)) ||
      (values.crop_stage_id !== null && !validId(values.crop_stage_id)) ||
      values.schedule_type !== "after_sowing" ||
      !templatePriorities.some((priority) => priority === values.priority) ||
      !Number.isInteger(values.start_offset_days) ||
      values.start_offset_days < 0 ||
      values.start_offset_days > maxTemplateOffset ||
      !Number.isInteger(values.end_offset_days) ||
      values.end_offset_days < values.start_offset_days ||
      values.end_offset_days > maxTemplateOffset ||
      !["all", "specific"].includes(values.region_scope) ||
      !Array.isArray(values.region_ids) ||
      (values.region_scope === "specific" &&
        (!values.region_ids.length ||
          !values.region_ids.every(validId) ||
          new Set(values.region_ids).size !== values.region_ids.length)) ||
      !values.translations ||
      typeof values.translations !== "object" ||
      Array.isArray(values.translations) ||
      requiredTemplateLocales.some(
        (locale) => typeof values.translations[locale]?.title !== "string",
      )
    )
      return { success: false, message: t("invalid") };
    const translations: CropActivityTemplatePayload["translations"] = {};
    for (const { id: locale } of languages) {
      if (!Object.hasOwn(values.translations, locale)) continue;
      const fields = values.translations[locale];
      if (
        !fields ||
        typeof fields.title !== "string" ||
        (fields.description !== null &&
          typeof fields.description !== "string") ||
        (fields.instructions !== null &&
          typeof fields.instructions !== "string")
      )
        return { success: false, message: t("invalid") };
      translations[locale] = {
        title: fields.title,
        description: fields.description,
        instructions: fields.instructions,
      };
    }
    const payload: Omit<CropActivityTemplatePayload, "crop_id"> = {
      crop_variety_id: values.crop_variety_id,
      category_id: values.category_id,
      crop_stage_id: values.crop_stage_id,
      season_id: values.season_id,
      source_id: values.source_id,
      schedule_type: values.schedule_type,
      start_offset_days: values.start_offset_days,
      end_offset_days: values.end_offset_days,
      region_scope: values.region_scope,
      region_ids: values.region_scope === "all" ? [] : values.region_ids,
      priority: values.priority,
      translations,
    };
    const response =
      id === null
        ? await cropActivityTemplatesAPI.create({
            ...payload,
            crop_id: values.crop_id,
          })
        : await cropActivityTemplatesAPI.update(id, payload);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("saveFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("saved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<CropActivityTemplate>(error, t("saveFailed"));
  }
}

export async function updateCropActivityTemplateStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<CropActivityTemplate>> {
  const t = await getTranslations("cropActivityTemplates.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    if (active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    const response = await cropActivityTemplatesAPI.updateStatus(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("statusFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("statusSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<CropActivityTemplate>(error, t("statusFailed"));
  }
}

export async function deleteCropActivityTemplate(
  id: number,
): Promise<ActionResult> {
  const t = await getTranslations("cropActivityTemplates.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await cropActivityTemplatesAPI.delete(id);
    if (!response.status) return { success: false, message: t("deleteFailed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}
