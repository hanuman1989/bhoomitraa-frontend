"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import { sowingMethodsAPI } from "@/lib/apis/admin/sowingMethods";
import { languages } from "@/i18n/languages";
import type { ActionResult, ApiResponse } from "@/types/api";
import type {
  SowingMethodBasicInput,
  SowingMethodImageChanges,
  SowingMethodTranslation,
} from "@/types/admin/sowingMethod";

async function mutate<T>(
  id: number | null,
  request: () => Promise<ApiResponse<T>>,
): Promise<ActionResult<T>> {
  const t = await getTranslations("sowingMethods");
  try {
    await requireAdmin();
    if (id !== null && (!Number.isSafeInteger(id) || id < 1))
      return { success: false, message: t("failed") };
    const result = await request();
    if (!result.status)
      return { success: false, message: result.message || t("failed") };
    revalidatePath("/[locale]/admin/sowing-methods", "page");
    if (id !== null) {
      revalidatePath("/[locale]/admin/sowing-methods/[id]", "page");
      revalidatePath("/[locale]/admin/sowing-methods/[id]/edit", "page");
    }
    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return handleActionError<T>(error, t("failed"));
  }
}

export async function saveSowingMethodBasic(
  id: number | null,
  input: SowingMethodBasicInput,
) {
  return mutate(id, () =>
    id === null
      ? sowingMethodsAPI.create(input)
      : sowingMethodsAPI.update(id, input),
  );
}

export async function saveSowingMethodTranslations(
  id: number,
  input: Record<string, SowingMethodTranslation>,
) {
  const translations = Object.fromEntries(
    languages.flatMap(({ id: locale }) => {
      const content = input[locale];
      if (!content) return [];
      const {
        title,
        short_description,
        description,
        advantages,
        disadvantages,
        suitable_conditions,
        resource_requirements,
        economic_considerations,
        important_considerations,
      } = content;
      return [
        [
          locale,
          {
            title,
            short_description,
            description,
            advantages,
            disadvantages,
            suitable_conditions,
            resource_requirements,
            economic_considerations,
            important_considerations,
          },
        ],
      ];
    }),
  );
  return mutate(id, () => sowingMethodsAPI.translations(id, translations));
}

export async function saveSowingMethodImages(
  id: number,
  changes: SowingMethodImageChanges,
  uploads: FormData,
) {
  return mutate(id, () => sowingMethodsAPI.images(id, changes, uploads));
}

export async function finalizeSowingMethod(id: number, active: boolean) {
  return mutate(id, () => sowingMethodsAPI.finalize(id, active));
}

export async function updateSowingMethodStatus(id: number, active: boolean) {
  return mutate(id, () => sowingMethodsAPI.status(id, active));
}

export async function deleteSowingMethod(id: number) {
  return mutate(id, () => sowingMethodsAPI.delete(id));
}
