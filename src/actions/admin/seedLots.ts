"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { seedLotsAPI } from "@/lib/apis/admin/seedLots";
import { handleActionError } from "@/lib/api/handleActionError";
import {
  verificationStatuses,
  type VerificationStatus,
} from "@/types/admin/knowledgeSource";
import type { ActionResult, ApiResponse } from "@/types/api";
import type { SeedLot, SeedLotPayload } from "@/types/admin/seedLot";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}
function invalidate() {
  revalidatePath("/[locale]/admin/seed-lots", "page");
  revalidatePath("/[locale]/admin/seed-lots/[id]", "page");
  revalidatePath("/[locale]/admin/seed-lots/[id]/edit", "page");
}
async function saved(
  response: ApiResponse<SeedLot>,
): Promise<ActionResult<SeedLot>> {
  if (!response.status || !response.data?.id)
    return {
      success: false,
      message: (await getTranslations("seedLots.feedback"))("failed"),
    };
  invalidate();
  return { success: true, message: response.message, data: response.data };
}
export async function saveSeedLot(
  id: number | null,
  values: SeedLotPayload,
  report?: FormData,
): Promise<ActionResult<SeedLot>> {
  const t = await getTranslations("seedLots.feedback");
  try {
    const admin = await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      !validId(values.seed_id) ||
      typeof values.lot_number !== "string" ||
      typeof values.is_active !== "boolean" ||
      (values.verification_status !== undefined &&
        !verificationStatuses.includes(values.verification_status)) ||
      (report !== undefined && !(report instanceof FormData))
    )
      return { success: false, message: t("invalid") };
    if (
      values.verification_status &&
      values.verification_status !== "pending" &&
      !admin.is_super_user
    )
      return { success: false, message: t("reviewRequired") };
    const files = report?.getAll("report_file") ?? [],
      file = files[0];
    if (
      files.length > 1 ||
      (files.length &&
        (!(file instanceof File) ||
          file.size === 0 ||
          file.size > 5 * 1024 * 1024 ||
          !/\.(pdf|jpe?g|png)$/i.test(file.name) ||
          !["application/pdf", "image/jpeg", "image/png"].includes(file.type)))
    )
      return {
        success: false,
        message: t("invalidReport"),
        errors: { report_file: [t("invalidReport")] },
      };
    const payload: SeedLotPayload = {
      seed_id: values.seed_id,
      lot_number: values.lot_number,
      seed_class: values.seed_class,
      seed_treatment_status: values.seed_treatment_status,
      production_date: values.production_date,
      test_date: values.test_date,
      valid_until: values.valid_until,
      germination_percentage: values.germination_percentage,
      physical_purity_percentage: values.physical_purity_percentage,
      genetic_purity_percentage: values.genetic_purity_percentage,
      certification_number: values.certification_number,
      certification_body: values.certification_body,
      notes: values.notes,
      is_active: values.is_active,
      ...(values.verification_status !== undefined && {
        verification_status: values.verification_status,
      }),
      ...(values.report_file === null &&
        !(file instanceof File) && { report_file: null }),
    };
    let data: SeedLotPayload | FormData = payload;
    if (file instanceof File) {
      data = new FormData();
      for (const [key, value] of Object.entries(payload))
        data.append(
          key,
          typeof value === "boolean"
            ? value
              ? "1"
              : "0"
            : value === null
              ? ""
              : String(value),
        );
      data.set("report_file", file);
    }
    return await saved(
      id === null
        ? await seedLotsAPI.create(data)
        : await seedLotsAPI.update(id, data),
    );
  } catch (error: unknown) {
    return handleActionError<SeedLot>(error, t("failed"));
  }
}
export async function updateSeedLotStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<SeedLot>> {
  const t = await getTranslations("seedLots.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    return await saved(await seedLotsAPI.updateStatus(id, active));
  } catch (error: unknown) {
    return handleActionError<SeedLot>(error, t("failed"));
  }
}
export async function updateSeedLotVerification(
  id: number,
  status: VerificationStatus,
): Promise<ActionResult<SeedLot>> {
  const t = await getTranslations("seedLots.feedback");
  try {
    const admin = await requireAdmin();
    if (!validId(id) || !verificationStatuses.includes(status))
      return { success: false, message: t("invalid") };
    if (!admin.is_super_user)
      return { success: false, message: t("reviewRequired") };
    return await saved(await seedLotsAPI.updateVerification(id, status));
  } catch (error: unknown) {
    return handleActionError<SeedLot>(error, t("failed"));
  }
}
export async function deleteSeedLot(id: number): Promise<ActionResult> {
  const t = await getTranslations("seedLots.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await seedLotsAPI.delete(id);
    if (!response.status) return { success: false, message: t("failed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}
