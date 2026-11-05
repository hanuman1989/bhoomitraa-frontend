import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import KnowledgeSourceForm from "./KnowledgeSourceForm";

export default async function KnowledgeSourceEditor({
  id,
  readOnly = false,
}: {
  id?: string;
  readOnly?: boolean;
}) {
  const t = await getTranslations("knowledgeSources");
  let source: KnowledgeSource | null = null;
  let canReview = false;
  try {
    const admin = await requireAdmin();
    canReview = admin.is_super_user;
    if (id !== undefined) {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
      const response = await knowledgeSourcesAPI.show(numericId);
      if (!response.status || !response.data)
        throw new ApiError(t("loadFailed"), 502);
      source = response.data;
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
    <KnowledgeSourceForm
      source={source}
      canReview={canReview}
      maxYear={new Date().getUTCFullYear() + 1}
      readOnly={readOnly}
    />
  );
}
