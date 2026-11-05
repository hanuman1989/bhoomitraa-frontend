"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { languages } from "@/i18n/languages";
import { requireAdmin } from "@/lib/auth/dal";
import { seasonsAPI } from "@/lib/apis/admin/seasons";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActionResult } from "@/types/api";
import {
  requiredSeasonLocales,
  type Season,
  type SeasonPayload,
} from "@/types/admin/season";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

function invalidate() {
  revalidatePath("/[locale]/admin/seasons", "page");
  revalidatePath("/[locale]/admin/seasons/[id]/edit", "page");
}

export async function saveSeason(
  id: number | null,
  values: SeasonPayload,
  active: boolean,
): Promise<ActionResult<Season>> {
  const t = await getTranslations("seasons.feedback");
  let persisted: Season | undefined;
  try {
    await requireAdmin();
    if (
      (id !== null && !validId(id)) ||
      typeof active !== "boolean" ||
      !values ||
      typeof values.slug !== "string" ||
      !values.translations ||
      typeof values.translations !== "object" ||
      Array.isArray(values.translations) ||
      requiredSeasonLocales.some(
        (locale) => typeof values.translations[locale]?.name !== "string",
      )
    )
      return { success: false, message: t("invalid") };

    const translations: SeasonPayload["translations"] = {};
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
    // Metadata endpoints reject is_active. Laravel preserves omitted translations.
    const payload: SeasonPayload = { slug: values.slug, translations };
    const response =
      id === null
        ? await seasonsAPI.create(payload)
        : await seasonsAPI.update(id, payload);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("saveFailed") };
    persisted = response.data;
    invalidate();

    if (persisted.is_active !== active) {
      const status = await seasonsAPI.updateStatus(persisted.id, active);
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
    const failure = await handleActionError<Season>(error, t("saveFailed"));
    // Return the committed record so retrying a failed activation updates its ID.
    return persisted
      ? {
          ...failure,
          message: t("statusSaveFailed", { message: failure.message }),
          data: persisted,
        }
      : failure;
  }
}

export async function updateSeasonStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<Season>> {
  const t = await getTranslations("seasons.feedback");
  try {
    await requireAdmin();
    if (!validId(id) || typeof active !== "boolean")
      return { success: false, message: t("invalid") };
    const response = await seasonsAPI.updateStatus(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("statusFailed") };
    invalidate();
    return {
      success: true,
      message: response.message || t("statusSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<Season>(error, t("statusFailed"));
  }
}

export async function deleteSeason(id: number): Promise<ActionResult> {
  const t = await getTranslations("seasons.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await seasonsAPI.delete(id);
    if (!response.status) return { success: false, message: t("deleteFailed") };
    invalidate();
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("deleteFailed"));
  }
}
