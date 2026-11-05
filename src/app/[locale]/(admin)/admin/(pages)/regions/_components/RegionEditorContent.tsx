import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { regionsAPI } from "@/lib/apis/admin/regions";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { Region } from "@/types/admin/region";
import RegionForm from "./RegionForm";

interface RegionEditorContentProps {
  id?: number;
}

export default async function RegionEditorContent({
  id,
}: RegionEditorContentProps) {
  const t = await getTranslations("regions");
  let region: Region | undefined;
  let errorMessage: string | undefined;
  try {
    await requireAdmin();
    if (id !== undefined) {
      const response = await regionsAPI.show(id);
      if (!response.status) errorMessage = response.message || t("loadFailed");
      else region = response.data;
    }
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const result = await handleActionError(error, t("loadFailed"));
    errorMessage = result.message;
  }
  if (errorMessage)
    return (
      <div className="space-y-4">
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-4 text-sm"
        >
          {errorMessage}
        </p>
        <Link
          href="/admin/regions"
          className="text-brand-600 dark:text-brand-400 underline"
        >
          {t("form.back")}
        </Link>
      </div>
    );
  return <RegionForm key={region?.id ?? "new"} region={region} />;
}
