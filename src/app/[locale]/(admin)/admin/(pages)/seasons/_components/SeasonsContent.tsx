import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { seasonsAPI } from "@/lib/apis/admin/seasons";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageProps } from "@/types/api";
import type {
  SeasonsFilterValues,
  SeasonsListResponse,
} from "@/types/admin/season";
import SeasonsFilters from "./SeasonsFilters";
import SeasonList from "./SeasonList";

export default async function SeasonsContent({ searchParams }: PageProps) {
  const t = await getTranslations("seasons");
  const params = await searchParams;
  const value = (key: string) => {
    const entry = params[key];
    return Array.isArray(entry) ? (entry[0] ?? "") : (entry ?? "");
  };
  const status = value("status");
  const filters: SeasonsFilterValues = {
    keyword: value("keyword").trim().slice(0, 150),
    status: status === "1" || status === "0" ? status : "",
  };
  const requestedPage = Number(value("page"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  let result: SeasonsListResponse | undefined;
  let failure = "";
  try {
    await requireAdmin();
    const response = await seasonsAPI.list({ ...filters, page, per_page: 15 });
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    result = response;
    if (result.pagination.current_page > result.pagination.last_page) {
      redirect({
        href: {
          pathname: "/admin/seasons",
          query: { ...filters, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
    }
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <SeasonsFilters key={JSON.stringify(params)} initialFilters={filters} />
      {failure ? (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {failure}
        </p>
      ) : result ? (
        <SeasonList
          result={result}
          filtered={filters.keyword !== "" || filters.status !== ""}
        />
      ) : null}
    </div>
  );
}
