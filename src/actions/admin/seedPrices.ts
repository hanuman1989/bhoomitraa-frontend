"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { seedPricesAPI } from "@/lib/apis/admin/seedPrices";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult, ApiResponse } from "@/types/api";
import type { SeedPrice, SeedPricePayload } from "@/types/admin/seedPrice";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/seed-prices", "page");
  revalidatePath("/[locale]/admin/seed-prices/[id]", "page");
  revalidatePath("/[locale]/admin/seed-prices/[id]/edit", "page");
}
async function saved(
  response: ApiResponse<SeedPrice>,
): Promise<ActionResult<SeedPrice>> {
  if (!response.status || !response.data?.id)
    return {
      success: false,
      message: (await getTranslations("seedPrices.feedback"))("failed"),
    };
  invalidate();
  return { success: true, message: response.message, data: response.data };
}
export async function saveSeedPrice(
  id: number | null,
  values: SeedPricePayload,
): Promise<ActionResult<SeedPrice>> {
  const t = await getTranslations("seedPrices.feedback");
  try {
    const admin = await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.seed_id) ||
      typeof values.is_active !== "boolean"
    )
      return { success: false, message: t("invalid") };
    if (values.is_active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    const payload: SeedPricePayload = {
      seed_id: values.seed_id,
      seller_name: values.seller_name,
      price_type: values.price_type,
      package_quantity: values.package_quantity,
      package_unit_code: values.package_unit_code,
      package_price: values.package_price,
      currency_code: values.currency_code,
      region_scope: values.region_scope,
      region_ids: values.region_scope === "all" ? [] : values.region_ids,
      effective_from: values.effective_from,
      effective_to: values.effective_to,
      source_id: values.source_id,
      is_active: values.is_active,
    };
    return await saved(
      id === null
        ? await seedPricesAPI.create(payload)
        : await seedPricesAPI.update(id, payload),
    );
  } catch (error: unknown) {
    return handleActionError<SeedPrice>(error, t("failed"));
  }
}
export async function updateSeedPriceStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<SeedPrice>> {
  const t = await getTranslations("seedPrices.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    if (active && !admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    return await saved(await seedPricesAPI.updateStatus(id, active));
  } catch (error: unknown) {
    return handleActionError<SeedPrice>(error, t("failed"));
  }
}
export async function deleteSeedPrice(id: number): Promise<ActionResult> {
  const t = await getTranslations("seedPrices.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await seedPricesAPI.delete(id);
    if (!response.status) return { success: false, message: t("failed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}
