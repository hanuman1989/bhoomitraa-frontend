"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { languages } from "@/i18n/languages";
import { isActivityCategoryIcon } from "@/icons/activityCategoryIcons";
import { requireAdmin } from "@/lib/auth/dal";
import { activityCategoriesAPI } from "@/lib/apis/admin/activityCategories";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import {
  requiredActivityCategoryLocales,
  type ActivityCategory,
  type ActivityCategoryPayload,
} from "@/types/admin/activityCategory";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

function invalidate() {
  revalidatePath("/[locale]/admin/activity-categories", "page");
  revalidatePath("/[locale]/admin/activity-categories/[id]/edit", "page");
}

export async function saveActivityCategory(
  id: number | null,
  values: ActivityCategoryPayload,
): Promise<ActionResult<ActivityCategory>> {
  const t = await getTranslations("activityCategories.feedback");
  try {
    const admin = await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      !values ||
      typeof values.slug !== "string" ||
      typeof values.is_system !== "boolean" ||
      (values.icon !== null &&
        (typeof values.icon !== "string" ||
          !isActivityCategoryIcon(values.icon))) ||
      !values.translations ||
      typeof values.translations !== "object" ||
      Array.isArray(values.translations) ||
      requiredActivityCategoryLocales.some(
        (locale) => typeof values.translations[locale]?.name !== "string",
      )
    )
      return { success: false, message: t("invalid") };

    if (id === null && values.is_system && !admin.is_super_user)
      return {
        success: false,
        message: t("systemForbidden"),
        errors: { is_system: [t("systemForbidden")] },
      };

    const translations: ActivityCategoryPayload["translations"] = {};
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
    const payload = { slug: values.slug, icon: values.icon, translations };
    // Updates cannot change is_system or is_active. Omitted translations are retained by Laravel.
    const response =
      id === null
        ? await activityCategoriesAPI.create({
            ...payload,
            is_system: values.is_system,
          })
        : await activityCategoriesAPI.update(id, payload);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("saveFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("saved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<ActivityCategory>(error, t("saveFailed"));
  }
}

export async function updateActivityCategoryStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<ActivityCategory>> {
  const t = await getTranslations("activityCategories.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    const response = await activityCategoriesAPI.updateStatus(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("statusFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("statusSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<ActivityCategory>(error, t("statusFailed"));
  }
}

export async function deleteActivityCategory(
  id: number,
): Promise<ActionResult> {
  const t = await getTranslations("activityCategories.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await activityCategoriesAPI.delete(id);
    if (!response.status) return { success: false, message: t("deleteFailed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}
