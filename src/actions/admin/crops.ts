"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { languages } from "@/i18n/languages";
import { requireAdmin } from "@/lib/auth/dal";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import type { Crop, CropPayload } from "@/types/admin/crop";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/crops", "page");
  revalidatePath("/[locale]/admin/crops/[id]/edit", "page");
}

export async function saveCrop(
  id: number | null,
  values: CropPayload,
  imageData?: FormData,
): Promise<ActionResult<Crop>> {
  const t = await getTranslations("crops.feedback");
  try {
    const admin = await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.category_id) ||
      typeof values.slug !== "string" ||
      typeof values.is_active !== "boolean" ||
      languages.some(
        ({ id: locale }) =>
          typeof values.translations?.[locale]?.name !== "string",
      ) ||
      (values.ai_diagnosis_enabled !== undefined &&
        typeof values.ai_diagnosis_enabled !== "boolean")
    )
      return { success: false, message: t("invalidInput") };
    if (values.ai_diagnosis_enabled !== undefined && !admin.is_super_user)
      return { success: false, message: t("aiForbidden") };
    if (imageData !== undefined && !(imageData instanceof FormData))
      return { success: false, message: t("invalidInput") };
    const images = imageData?.getAll("image") ?? [];
    const image = images[0];
    if (
      images.length > 1 ||
      (images.length === 1 &&
        (!(image instanceof File) ||
          image.size === 0 ||
          image.size > 5 * 1024 * 1024 ||
          !/\.(jpe?g|png|webp)$/i.test(image.name) ||
          !["image/jpeg", "image/png", "image/webp"].includes(image.type)))
    )
      return {
        success: false,
        message: t("invalidImage"),
        errors: { image: [t("invalidImage")] },
      };
    // Only configured languages and writable translation fields reach Laravel.
    const payload: CropPayload = {
      ...(values.image === null && { image: null }),
      category_id: values.category_id,
      slug: values.slug,
      scientific_name: values.scientific_name,
      crop_code: values.crop_code,
      is_active: values.is_active,
      ...(values.ai_diagnosis_enabled !== undefined && {
        ai_diagnosis_enabled: values.ai_diagnosis_enabled,
      }),
      translations: Object.fromEntries(
        languages.map(({ id: locale }) => [
          locale,
          {
            name: values.translations[locale].name,
            description: values.translations[locale].description,
          },
        ]),
      ),
    };
    let data: CropPayload | FormData = payload;
    if (image instanceof File) {
      data = new FormData();
      data.append("category_id", String(payload.category_id));
      data.append("slug", payload.slug);
      data.append("scientific_name", payload.scientific_name ?? "");
      data.append("crop_code", payload.crop_code ?? "");
      data.append("is_active", payload.is_active ? "1" : "0");
      if (payload.ai_diagnosis_enabled !== undefined)
        data.append(
          "ai_diagnosis_enabled",
          payload.ai_diagnosis_enabled ? "1" : "0",
        );
      for (const [locale, translation] of Object.entries(
        payload.translations,
      )) {
        data.append(`translations[${locale}][name]`, translation.name);
        data.append(
          `translations[${locale}][description]`,
          translation.description ?? "",
        );
      }
      data.append("image", image);
    }
    const response =
      id === null
        ? await cropsAPI.create(data)
        : await cropsAPI.update(id, data);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("saveFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("saved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<Crop>(error, t("saveFailed"));
  }
}

export async function updateCropStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<Crop>> {
  const t = await getTranslations("crops.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalidInput") };
    const response = await cropsAPI.updateStatus(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("statusSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<Crop>(error, t("actionFailed"));
  }
}

export async function deleteCrop(id: number): Promise<ActionResult> {
  const t = await getTranslations("crops.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalidInput") };
    const response = await cropsAPI.delete(id);
    if (!response.status)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("actionFailed"));
  }
}
