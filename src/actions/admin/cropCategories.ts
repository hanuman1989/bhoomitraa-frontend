"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { languages } from "@/i18n/languages";
import { requireAdmin } from "@/lib/auth/dal";
import { cropCategoriesAPI } from "@/lib/apis/admin/cropCategories";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import type {
  CropCategory,
  CropCategoryPayload,
} from "@/types/admin/cropCategory";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

function invalidate() {
  revalidatePath("/[locale]/admin/crop-categories", "page");
  revalidatePath("/[locale]/admin/crop-categories/[id]/edit", "page");
}

export async function saveCropCategory(
  id: number | null,
  values: CropCategoryPayload,
  active: boolean,
): Promise<ActionResult<CropCategory>> {
  const t = await getTranslations("cropCategories.feedback");
  let persisted: CropCategory | undefined;
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      typeof active !== "boolean" ||
      !values ||
      typeof values.slug !== "string" ||
      languages.some(
        ({ id }) => typeof values.translations?.[id]?.name !== "string",
      )
    )
      return { success: false, message: t("invalidInput") };
    // Only writable metadata is sent here. Laravel upserts these locales and
    // preserves all omitted translations, including unsupported legacy locales.
    const payload: CropCategoryPayload = {
      slug: values.slug,
      translations: Object.fromEntries(
        languages.map(({ id }) => [
          id,
          {
            name: values.translations[id].name,
            description: values.translations[id].description,
          },
        ]),
      ),
    };
    const response =
      id === null
        ? await cropCategoriesAPI.create(payload)
        : await cropCategoriesAPI.update(id, payload);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("saveFailed") };
    persisted = response.data;
    invalidate();
    // Metadata endpoints deliberately ignore is_active; publication is separate.
    if (persisted.is_active !== active) {
      const status = await cropCategoriesAPI.updateStatus(persisted.id, active);
      if (!status.status || !status.data?.id)
        return {
          success: false,
          message: t("statusSaveFailed", {
            message: status.message || t("statusFailed"),
          }),
          data: persisted,
        };
      persisted = status.data;
      invalidate();
    }
    return { success: true, message: t("saved"), data: persisted };
  } catch (error: unknown) {
    const failure = await handleActionError<CropCategory>(
      error,
      t("saveFailed"),
    );
    // Retain the committed ID so retrying a create cannot duplicate the category.
    return persisted
      ? {
          ...failure,
          message: t("statusSaveFailed", { message: failure.message }),
          data: persisted,
        }
      : failure;
  }
}

export async function updateCropCategoryStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<CropCategory>> {
  const t = await getTranslations("cropCategories.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalidInput") };
    const response = await cropCategoriesAPI.updateStatus(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("statusFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("statusSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<CropCategory>(error, t("statusFailed"));
  }
}

export async function deleteCropCategory(id: number): Promise<ActionResult> {
  const t = await getTranslations("cropCategories.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalidInput") };
    const response = await cropCategoriesAPI.delete(id);
    if (!response.status)
      return { success: false, message: response.message || t("deleteFailed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}
