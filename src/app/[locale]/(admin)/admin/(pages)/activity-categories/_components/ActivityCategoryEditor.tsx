import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { activityCategoriesAPI } from "@/lib/apis/admin/activityCategories";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { ActivityCategory } from "@/types/admin/activityCategory";
import ActivityCategoryForm from "./ActivityCategoryForm";

export default async function ActivityCategoryEditor({ id }: { id?: string }) {
  const t = await getTranslations("activityCategories");
  let category: ActivityCategory | null = null;
  let canManageSystem = false;
  try {
    const admin = await requireAdmin();
    canManageSystem = admin.is_super_user;
    if (id !== undefined) {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
      const response = await activityCategoriesAPI.show(numericId);
      if (!response.status || !response.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      category = response.data;
    }
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("feedback.loadFailed"));
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
    <ActivityCategoryForm
      key={category?.id ?? "new"}
      category={category}
      canManageSystem={canManageSystem}
    />
  );
}
