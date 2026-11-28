"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import { cropFieldLayoutsAPI } from "@/lib/apis/admin/cropFieldLayouts";
import { sowingMethodsAPI } from "@/lib/apis/admin/sowingMethods";
import { languages } from "@/i18n/languages";
import type { ActionResult, ApiResponse } from "@/types/api";
import type { TimelineOptionPage } from "@/types/admin/cropStageTimeline";
import type {
  CropFieldLayoutBasicInput,
  FieldLayoutConfigurationInput,
  FieldLayoutTranslation,
} from "@/types/admin/cropFieldLayout";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

async function mutate<T>(
  id: number | null,
  request: () => Promise<ApiResponse<T>>,
  failure: "saveFailed" | "deleteFailed" = "saveFailed",
): Promise<ActionResult<T>> {
  const t = await getTranslations("cropFieldLayouts");
  try {
    await requireAdmin();
    if (id !== null && !validId(id))
      return { success: false, message: t(failure) };
    const response = await request();
    if (!response.status)
      return { success: false, message: response.message || t(failure) };
    revalidatePath("/[locale]/admin/crop-field-layouts", "page");
    if (id !== null) {
      revalidatePath("/[locale]/admin/crop-field-layouts/[id]", "page");
      revalidatePath("/[locale]/admin/crop-field-layouts/[id]/edit", "page");
    }
    return { success: true, message: response.message, data: response.data };
  } catch (error) {
    return handleActionError<T>(error, t(failure));
  }
}

export async function saveCropFieldLayoutBasic(
  id: number | null,
  revision: number,
  data: CropFieldLayoutBasicInput,
) {
  return mutate(id, () =>
    id === null
      ? cropFieldLayoutsAPI.create(data)
      : cropFieldLayoutsAPI.basic(id, revision, data),
  );
}

export async function saveCropFieldLayoutConfiguration(
  id: number,
  revision: number,
  data: FieldLayoutConfigurationInput,
) {
  return mutate(id, () =>
    cropFieldLayoutsAPI.configuration(id, revision, data),
  );
}

export async function saveCropFieldLayoutTranslations(
  id: number,
  revision: number,
  input: Record<string, FieldLayoutTranslation>,
) {
  return mutate(id, () => {
    const translations = Object.fromEntries(
      languages.flatMap(({ id: locale }) => {
        const entry = input[locale];
        if (!entry) return [];
        const { title, description, important_considerations } = entry;
        return [[locale, { title, description, important_considerations }]];
      }),
    );
    return cropFieldLayoutsAPI.translations(id, revision, translations);
  });
}

export async function finalizeCropFieldLayout(id: number, revision: number) {
  return mutate(id, () => cropFieldLayoutsAPI.finalize(id, revision));
}

export async function deleteCropFieldLayout(id: number) {
  return mutate(id, () => cropFieldLayoutsAPI.delete(id), "deleteFailed");
}

export async function searchFieldLayoutSowingMethods(
  keyword: string,
  page = 1,
  cropIds?: number[],
): Promise<ActionResult<TimelineOptionPage>> {
  const t = await getTranslations("cropFieldLayouts");
  try {
    await requireAdmin();
    const response = await sowingMethodsAPI.list({
      keyword: keyword.trim().slice(0, 150),
      page: validId(page) ? page : 1,
      per_page: 30,
      is_active: cropIds ? 1 : undefined,
      crop_id: cropIds?.[0],
      crop_scope: cropIds?.length === 0 ? "all" : undefined,
    });
    if (!response.status)
      return { success: false, message: t("filters.loadMethodsFailed") };
    const candidates = response.data.filter(
      (method) =>
        !cropIds ||
        method.crop_scope === "all" ||
        cropIds.every((id) => method.crops.some((crop) => crop.id === id)),
    );
    return {
      success: true,
      message: response.message,
      data: {
        options: candidates.map((method) => ({
          id: method.id,
          label: method.title || method.code,
          is_active: method.is_active,
        })),
        pagination: response.pagination,
      },
    };
  } catch (error) {
    return handleActionError<TimelineOptionPage>(
      error,
      t("filters.loadMethodsFailed"),
    );
  }
}
