import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageProps } from "@/types/api";
import {
  sourceTypes,
  verificationStatuses,
  type KnowledgeSourcesFilterValues,
  type KnowledgeSourcesListResponse,
} from "@/types/admin/knowledgeSource";
import KnowledgeSourcesFilters from "./KnowledgeSourcesFilters";
import KnowledgeSourcesList from "./KnowledgeSourcesList";

export default async function KnowledgeSourcesContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("knowledgeSources");
  const params = await searchParams;
  const value = (key: string) => {
    const entry = params[key];
    return Array.isArray(entry) ? (entry[0] ?? "") : (entry ?? "");
  };
  const language = value("language");
  const filters: KnowledgeSourcesFilterValues = {
    keyword: value("keyword").trim().slice(0, 150),
    source_type:
      sourceTypes.find((type) => type === value("source_type")) ?? "",
    verification_status:
      verificationStatuses.find(
        (status) => status === value("verification_status"),
      ) ?? "",
    language: language === "en" || language === "hi" ? language : "",
  };
  const requestedPage = Number(value("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  let result: KnowledgeSourcesListResponse | undefined;
  let failure = "";
  let canReview = false;
  try {
    const admin = await requireAdmin();
    canReview = admin.is_super_user;
    const response = await knowledgeSourcesAPI.list({
      ...filters,
      page,
      per_page: 15,
    });
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      failure = response.message || t("loadFailed");
    else result = response;
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("loadFailed"))).message;
  }
  if (result && result.pagination.current_page > result.pagination.last_page) {
    redirect({
      href: {
        pathname: "/admin/knowledge-sources",
        query: { ...filters, page: Math.max(1, result.pagination.last_page) },
      },
      locale: await getLocale(),
    });
  }
  return (
    <div className="min-w-0">
      <KnowledgeSourcesFilters
        key={JSON.stringify(filters)}
        initialFilters={filters}
      />
      {failure ? (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {failure}
        </p>
      ) : result ? (
        <KnowledgeSourcesList
          sources={result.data}
          pagination={result.pagination}
          canReview={canReview}
          filtered={Object.values(filters).some(Boolean)}
        />
      ) : null}
    </div>
  );
}
