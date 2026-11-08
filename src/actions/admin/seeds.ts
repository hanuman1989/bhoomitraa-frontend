"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { seedsAPI } from "@/lib/apis/admin/seeds";
import { handleActionError } from "@/lib/api/handleActionError";
import { languages } from "@/i18n/languages";
import type { ActionResult, ApiResponse } from "@/types/api";
import type {
  Seed,
  SeedBasicPayload,
  SeedMediaPayload,
  SeedTranslation,
} from "@/types/admin/seed";
import { seedVerificationStatuses } from "@/types/admin/seed";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/seeds", "page");
  revalidatePath("/[locale]/admin/seeds/[id]", "page");
  revalidatePath("/[locale]/admin/seeds/[id]/step/[step]", "page");
}
async function saved(response: ApiResponse<Seed>): Promise<ActionResult<Seed>> {
  if (!response.status || !response.data?.id)
    return {
      success: false,
      message: (await getTranslations("seeds.feedback"))("failed"),
    };
  invalidate();
  return { success: true, message: response.message, data: response.data };
}
export async function saveSeedBasic(
  id: number | null,
  values: SeedBasicPayload,
): Promise<ActionResult<Seed>> {
  const t = await getTranslations("seeds.feedback");
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.crop_id) ||
      (values.crop_variety_id !== null && !validId(values.crop_variety_id)) ||
      typeof values.name !== "string" ||
      typeof values.slug !== "string"
    )
      return { success: false, message: t("invalid") };
    const payload: SeedBasicPayload = {
      crop_id: values.crop_id,
      crop_variety_id: values.crop_variety_id,
      name: values.name,
      slug: values.slug,
      sku: values.sku,
      brand_name: values.brand_name,
      producer_name: values.producer_name,
      material_type: values.material_type,
      seed_type: values.seed_type,
      propagation_method: values.propagation_method,
      seed_class: values.seed_class,
      treatment_status: values.treatment_status,
      default_unit_code: values.default_unit_code,
      reference_pack_quantity: values.reference_pack_quantity,
      reference_pack_unit_code: values.reference_pack_unit_code,
      seeds_per_gram: values.seeds_per_gram,
      germination_reference_pct: values.germination_reference_pct,
      purity_reference_pct: values.purity_reference_pct,
      is_f1_hybrid: values.is_f1_hybrid,
      is_organic: values.is_organic,
      is_pelleted: values.is_pelleted,
    };
    return saved(
      id === null
        ? await seedsAPI.createStepOne(payload)
        : await seedsAPI.updateStepOne(id, payload),
    );
  } catch (error: unknown) {
    return handleActionError<Seed>(error, t("failed"));
  }
}
export async function saveSeedTranslations(
  id: number,
  values: Record<string, SeedTranslation>,
): Promise<ActionResult<Seed>> {
  const t = await getTranslations("seeds.feedback");
  try {
    await requireAdmin();
    if (
      !validId(id) ||
      !values ||
      languages.some(({ id }) => typeof values[id]?.name !== "string")
    )
      return { success: false, message: t("invalid") };
    const translations: Record<string, SeedTranslation> = {};
    for (const { id: locale } of languages) {
      const value = values[locale];
      if (
        (value.description !== null && typeof value.description !== "string") ||
        (value.planting_instructions !== null &&
          typeof value.planting_instructions !== "string")
      )
        return { success: false, message: t("invalid") };
      translations[locale] = {
        name: value.name,
        description: value.description,
        planting_instructions: value.planting_instructions,
      };
    }
    return saved(await seedsAPI.saveTranslations(id, translations));
  } catch (error: unknown) {
    return handleActionError<Seed>(error, t("failed"));
  }
}
export async function saveSeedMedia(
  id: number,
  values: SeedMediaPayload,
  uploads: FormData,
): Promise<ActionResult<Seed>> {
  const t = await getTranslations("seeds.feedback");
  try {
    const admin = await requireAdmin();
    if (
      !validId(id) ||
      !values ||
      !(uploads instanceof FormData) ||
      (values.source_id !== null && !validId(values.source_id)) ||
      !seedVerificationStatuses.includes(values.verification_status) ||
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
    return saved(await seedsAPI.saveMedia(id, data));
  } catch (error: unknown) {
    return handleActionError<Seed>(error, t("failed"));
  }
}
export async function finalizeSeed(id: number): Promise<ActionResult<Seed>> {
  const t = await getTranslations("seeds.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    return saved(await seedsAPI.finalize(id));
  } catch (error: unknown) {
    return handleActionError<Seed>(error, t("failed"));
  }
}
export async function updateSeedStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<Seed>> {
  const t = await getTranslations("seeds.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    if (active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    return saved(await seedsAPI.updateStatus(id, active));
  } catch (error: unknown) {
    return handleActionError<Seed>(error, t("failed"));
  }
}
export async function deleteSeed(id: number): Promise<ActionResult> {
  const t = await getTranslations("seeds.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await seedsAPI.delete(id);
    if (!response.status) return { success: false, message: t("failed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}
