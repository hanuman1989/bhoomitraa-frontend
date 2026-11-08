"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { fertilizersAPI } from "@/lib/apis/admin/fertilizers";
import { handleActionError } from "@/lib/api/handleActionError";
import { languages } from "@/i18n/languages";
import type { ActionResult, ApiResponse } from "@/types/api";
import type {
  Fertilizer,
  FertilizerBasicPayload,
  FertilizerMediaPayload,
  FertilizerTranslation,
  FertilizerNutrientsPayload,
} from "@/types/admin/fertilizer";
import { fertilizerVerificationStatuses } from "@/types/admin/fertilizer";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/fertilizers", "page");
  revalidatePath("/[locale]/admin/fertilizers/[id]", "page");
  revalidatePath("/[locale]/admin/fertilizers/[id]/step/[step]", "page");
}
async function saved(
  response: ApiResponse<Fertilizer>,
): Promise<ActionResult<Fertilizer>> {
  if (!response.status || !response.data?.id)
    return {
      success: false,
      message: (await getTranslations("fertilizers.feedback"))("failed"),
    };
  invalidate();
  return { success: true, message: response.message, data: response.data };
}
export async function saveFertilizerBasic(
  id: number | null,
  values: FertilizerBasicPayload,
): Promise<ActionResult<Fertilizer>> {
  const t = await getTranslations("fertilizers.feedback");
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      typeof values.name !== "string" ||
      typeof values.slug !== "string"
    )
      return { success: false, message: t("invalid") };
    const payload: FertilizerBasicPayload = {
      name: values.name,
      slug: values.slug,
      fertilizer_code: values.fertilizer_code,
      fertilizer_type: values.fertilizer_type,
      form: values.form,
      grade: values.grade,
      brand_name: values.brand_name,
      manufacturer_name: values.manufacturer_name,
      default_unit_code: values.default_unit_code,
      reference_pack_quantity: values.reference_pack_quantity,
      reference_pack_unit_code: values.reference_pack_unit_code,
      application_method: values.application_method,
    };
    return await saved(
      id === null
        ? await fertilizersAPI.createStepOne(payload)
        : await fertilizersAPI.updateStepOne(id, payload),
    );
  } catch (error: unknown) {
    return handleActionError<Fertilizer>(error, t("failed"));
  }
}

export async function saveFertilizerNutrients(
  id: number,
  values: FertilizerNutrientsPayload,
): Promise<ActionResult<Fertilizer>> {
  const t = await getTranslations("fertilizers.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || !values || !Array.isArray(values.nutrients))
      return { success: false, message: t("invalid") };
    return await saved(
      await fertilizersAPI.saveNutrients(id, {
        nutrients: values.nutrients.map(
          ({ nutrient_code, content_value, content_unit_code }) => ({
            nutrient_code,
            content_value,
            content_unit_code,
          }),
        ),
        composition_notes: values.composition_notes,
      }),
    );
  } catch (error: unknown) {
    return handleActionError<Fertilizer>(error, t("failed"));
  }
}

export async function saveFertilizerTranslations(
  id: number,
  values: Record<string, FertilizerTranslation>,
): Promise<ActionResult<Fertilizer>> {
  const t = await getTranslations("fertilizers.feedback");
  try {
    await requireAdmin();
    if (
      !validId(id) ||
      !values ||
      languages.some(({ id }) => typeof values[id]?.name !== "string")
    )
      return { success: false, message: t("invalid") };
    const translations: Record<string, FertilizerTranslation> = {};
    for (const { id: locale } of languages) {
      const value = values[locale];
      if (
        (value.description !== null && typeof value.description !== "string") ||
        (value.usage_instructions !== null &&
          typeof value.usage_instructions !== "string")
      )
        return { success: false, message: t("invalid") };
      translations[locale] = {
        name: value.name,
        description: value.description,
        usage_instructions: value.usage_instructions,
      };
    }
    return await saved(await fertilizersAPI.saveTranslations(id, translations));
  } catch (error: unknown) {
    return handleActionError<Fertilizer>(error, t("failed"));
  }
}
export async function saveFertilizerMedia(
  id: number,
  values: FertilizerMediaPayload,
  uploads: FormData,
): Promise<ActionResult<Fertilizer>> {
  const t = await getTranslations("fertilizers.feedback");
  try {
    const admin = await requireAdmin();
    if (
      !validId(id) ||
      !values ||
      !(uploads instanceof FormData) ||
      (values.source_id !== null && !validId(values.source_id)) ||
      !fertilizerVerificationStatuses.includes(values.verification_status) ||
      typeof values.is_active !== "boolean" ||
      !Array.isArray(values.retain_image_ids) ||
      !Array.isArray(values.remove_image_ids) ||
      !Array.isArray(values.image_order) ||
      [...values.retain_image_ids, ...values.remove_image_ids].some(
        (id) => !validId(id),
      ) ||
      values.image_order.length > 8 ||
      values.image_order.some(
        (token) =>
          typeof token !== "string" ||
          !/^(?:id:[1-9][0-9]*|new:[a-zA-Z0-9_-]{1,50})$/.test(token),
      ) ||
      new Set(values.image_order).size !== values.image_order.length
    )
      return { success: false, message: t("invalid") };
    if (
      !admin.is_super_user &&
      (values.verification_status !== "pending" || values.is_active)
    )
      return { success: false, message: t("reviewRequired") };
    const data = new FormData();
    let count = 0;
    for (const [key, file] of uploads.entries()) {
      if (
        !/^images\[[a-zA-Z0-9_-]{1,50}\]$/.test(key) ||
        !(file instanceof File) ||
        file.size === 0 ||
        file.size > 5 * 1024 * 1024 ||
        !/\.(jpe?g|png|webp)$/i.test(file.name) ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        return {
          success: false,
          message: t("invalidImage"),
          errors: { images: [t("invalidImage")] },
        };
      count++;
      data.append(key, file);
    }
    if (count + values.retain_image_ids.length > 8)
      return {
        success: false,
        message: t("imageCount"),
        errors: { images: [t("imageCount")] },
      };
    data.set(
      "source_id",
      values.source_id === null ? "" : String(values.source_id),
    );
    data.set("verification_status", values.verification_status);
    data.set("is_active", values.is_active ? "1" : "0");
    for (const value of values.retain_image_ids)
      data.append("retain_image_ids[]", String(value));
    for (const value of values.remove_image_ids)
      data.append("remove_image_ids[]", String(value));
    for (const value of values.image_order) data.append("image_order[]", value);
    return await saved(await fertilizersAPI.saveMedia(id, data));
  } catch (error: unknown) {
    return handleActionError<Fertilizer>(error, t("failed"));
  }
}
export async function finalizeFertilizer(
  id: number,
): Promise<ActionResult<Fertilizer>> {
  const t = await getTranslations("fertilizers.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    return await saved(await fertilizersAPI.finalize(id));
  } catch (error: unknown) {
    return handleActionError<Fertilizer>(error, t("failed"));
  }
}
export async function updateFertilizerStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<Fertilizer>> {
  const t = await getTranslations("fertilizers.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    if (active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    return await saved(await fertilizersAPI.updateStatus(id, active));
  } catch (error: unknown) {
    return handleActionError<Fertilizer>(error, t("failed"));
  }
}
export async function deleteFertilizer(id: number): Promise<ActionResult> {
  const t = await getTranslations("fertilizers.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await fertilizersAPI.delete(id);
    if (!response.status) return { success: false, message: t("failed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}
