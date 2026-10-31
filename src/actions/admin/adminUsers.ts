"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { adminUsersAPI } from "@/lib/apis/admin/adminUsers";
import type { ActionResult } from "@/types/api";
import { handleActionError } from "@/lib/api/handleActionError";
import type {
  AdminUser,
  ChangeAdminPasswordValues,
} from "@/types/admin/adminUser";

export async function changeAdminUserPassword(
  id: number,
  values: ChangeAdminPasswordValues,
): Promise<ActionResult> {
  const t = await getTranslations("adminUsers.passwordDialog");

  try {
    await requireAdmin();
    const response = await adminUsersAPI.changePassword(id, values);
    if (!response.status) {
      return { success: false, message: response.message || t("failed") };
    }

    return { success: true, message: response.message || t("saved") };
  } catch (error: unknown) {
    return handleActionError(error, t("failed"));
  }
}

export async function saveAdminUser(
  id: number | null,
  payload: AdminUser,
): Promise<ActionResult<AdminUser>> {
  const t = await getTranslations("serverActions.adminUsers");
  try {
    await requireAdmin();
    const response =
      id === null
        ? await adminUsersAPI.create(payload)
        : await adminUsersAPI.update(id, payload);

    if (!response.status) {
      return { success: false, message: response.message || t("saveFailed") };
    }

    revalidatePath("/admin/admin-users");
    return {
      success: true,
      message: response.message || t("saved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<AdminUser>(error, t("saveFailed"));
  }
}

export async function deleteAdminUser(id: number): Promise<ActionResult> {
  const t = await getTranslations("serverActions.adminUsers");
  try {
    const current = await requireAdmin();
    if (current.id === id) {
      return { success: false, message: t("cannotDeleteSelf") };
    }

    const response = await adminUsersAPI.delete(id);
    if (!response.status) {
      return { success: false, message: response.message || t("deleteFailed") };
    }
    revalidatePath("/admin/admin-users");
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}
