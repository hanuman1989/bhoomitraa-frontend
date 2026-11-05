"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { languages } from "@/i18n/languages";
import { requireAdmin } from "@/lib/auth/dal";
import { cropStagesAPI } from "@/lib/apis/admin/cropStages";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import {
  requiredStageLocales,
  type CropStage,
  type CropStagePayload,
} from "@/types/admin/cropStage";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/crop-stages", "page");
  revalidatePath("/[locale]/admin/crop-stages/[id]/edit", "page");
}

export async function saveCropStage(
  id: number | null,
  values: CropStagePayload,
  active: boolean,
): Promise<ActionResult<CropStage>> {
  const t = await getTranslations("cropStages.feedback");
  let persisted: CropStage | undefined;
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.crop_id) ||
      typeof values.code !== "string" ||
      !Number.isSafeInteger(values.sequence) ||
      values.sequence < 1 ||
      values.sequence > 65535 ||
      typeof active !== "boolean" ||
      !values.translations ||
      typeof values.translations !== "object" ||
      Array.isArray(values.translations) ||
      requiredStageLocales.some(
        (locale) => typeof values.translations[locale]?.name !== "string",
      )
    )
      return { success: false, message: t("invalid") };

    const translations: CropStagePayload["translations"] = {};
    for (const { id: locale } of languages) {
      if (!Object.hasOwn(values.translations, locale)) continue;
      const translation = values.translations[locale];
      if (
        !translation ||
        typeof translation.name !== "string" ||
        (translation.description !== null &&
          typeof translation.description !== "string")
      )
        return { success: false, message: t("invalid") };
      translations[locale] = {
        name: translation.name,
        description: translation.description,
      };
    }
    const metadata = {
      code: values.code,
      sequence: values.sequence,
      translations,
    };
    const response =
      id === null
        ? await cropStagesAPI.create({ crop_id: values.crop_id, ...metadata })
        : await cropStagesAPI.update(id, metadata);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("saveFailed") };
    persisted = response.data;
    invalidate();
    if (persisted.is_active !== active) {
      const status = await cropStagesAPI.updateStatus(persisted.id, active);
      if (!status.status || !status.data?.id)
        return {
          success: false,
          message: t("statusSaveFailed", { message: t("statusFailed") }),
          data: persisted,
        };
      persisted = status.data;
      invalidate();
    }
    return { success: true, message: t("saved"), data: persisted };
  } catch (error: unknown) {
    const failure = await handleActionError<CropStage>(error, t("saveFailed"));
    return persisted
      ? {
          ...failure,
          message: t("statusSaveFailed", { message: failure.message }),
          data: persisted,
        }
      : failure;
  }
}

export async function updateCropStageStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<CropStage>> {
  const t = await getTranslations("cropStages.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    const response = await cropStagesAPI.updateStatus(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("statusFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("statusSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<CropStage>(error, t("statusFailed"));
  }
}

export async function deleteCropStage(id: number): Promise<ActionResult> {
  const t = await getTranslations("cropStages.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await cropStagesAPI.delete(id);
    if (!response.status) return { success: false, message: t("deleteFailed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}
