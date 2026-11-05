import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { cropCategoriesAPI } from "@/lib/apis/admin/cropCategories";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { Crop } from "@/types/admin/crop";
import type { CropCategory } from "@/types/admin/cropCategory";
import loadCropCategories from "./loadCropCategories";
import CropForm from "./CropForm";

export default async function CropEditor({ id }: { id?: string }) {
  const t = await getTranslations("crops");
  let crop: Crop | null = null;
  let categories: CropCategory[] = [];
  let canManageAI = false;
  try {
    const admin = await requireAdmin();
    canManageAI = admin.is_super_user;
    const numericId = id === undefined ? null : Number(id);
    if (
      numericId !== null &&
      (!Number.isSafeInteger(numericId) || numericId < 1)
    )
      notFound();
    const [options, response] = await Promise.all([
      loadCropCategories(true),
      numericId === null ? Promise.resolve(null) : cropsAPI.show(numericId),
    ]);
    categories = options;
    if (numericId !== null) {
      if (!response?.status || !response.data?.id)
        throw new ApiError(t("loadFailed"), 502);
      crop = response.data;
      // Preserve an inactive current category instead of silently choosing another.
      if (!categories.some((category) => category.id === crop?.category_id)) {
        try {
          const currentCategory = await cropCategoriesAPI.show(
            crop.category_id,
          );
          if (!currentCategory.status || !currentCategory.data)
            throw new ApiError(t("loadFailed"), 502);
          categories.push(currentCategory.data);
        } catch (error: unknown) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("loadFailed"));
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
      >
        {failure.message}
      </p>
    );
  }
  return (
    <CropForm
      key={crop?.id ?? "new"}
      crop={crop}
      categories={categories}
      canManageAI={canManageAI}
    />
  );
}
