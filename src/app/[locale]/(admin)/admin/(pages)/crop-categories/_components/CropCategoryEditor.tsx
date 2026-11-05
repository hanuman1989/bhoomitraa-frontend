import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cropCategoriesAPI } from "@/lib/apis/admin/cropCategories";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { CropCategory } from "@/types/admin/cropCategory";
import CropCategoryForm from "./CropCategoryForm";

export default async function CropCategoryEditor({ id }: { id?: string }) {
  const t = await getTranslations("cropCategories");
  let category: CropCategory | undefined;
  try {
    await requireAdmin();
    if (id !== undefined) {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
      const response = await cropCategoriesAPI.show(numericId);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("loadFailed"), 502);
      category = response.data;
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
  return <CropCategoryForm key={category?.id ?? "new"} category={category} />;
}
