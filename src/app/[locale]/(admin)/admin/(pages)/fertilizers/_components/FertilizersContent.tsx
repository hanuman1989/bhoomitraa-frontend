import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { fertilizersAPI } from "@/lib/apis/admin/fertilizers";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import {
  fertilizerTypes,
  fertilizerForms,
  fertilizerVerificationStatuses,
  type FertilizerFilters,
  type FertilizersResponse,
} from "@/types/admin/fertilizer";
import type { PageProps } from "@/types/api";
import FertilizersFilters from "./FertilizersFilters";
import FertilizersList from "./FertilizersList";

export default async function FertilizersContent({ searchParams }: PageProps) {
  const t = await getTranslations("fertilizers"),
    params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  };
  const filters: FertilizerFilters = {
    keyword: value("keyword").trim().slice(0, 150),
    fertilizer_type:
      fertilizerTypes.find((type) => type === value("fertilizer_type")) ?? "",
    form: fertilizerForms.find((form) => form === value("form")) ?? "",
    verification_status:
      fertilizerVerificationStatuses.find(
        (status) => status === value("verification_status"),
      ) ?? "",
    is_active:
      value("is_active") === "0" ? "0" : value("is_active") === "1" ? "1" : "",
  };
  let result: FertilizersResponse | undefined,
    failure = "",
    canReview = false;
  try {
    canReview = (await requireAdmin()).is_super_user;
    const response = await fertilizersAPI.list({
      ...filters,
      page:
        Number.isSafeInteger(Number(value("page"))) && Number(value("page")) > 0
          ? Number(value("page"))
          : 1,
      per_page: 10,
    });
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    result = response;
    if (result.pagination.current_page > result.pagination.last_page)
      redirect({
        href: {
          pathname: "/admin/fertilizers",
          query: { ...params, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <FertilizersFilters
        key={JSON.stringify(params)}
        initialFilters={filters}
      />
      {failure ? (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-5"
        >
          {failure}
        </p>
      ) : result ? (
        <FertilizersList
          result={result}
          filtered={Object.values(filters).some((value) => value !== "")}
          canReview={canReview}
        />
      ) : null}
    </div>
  );
}
