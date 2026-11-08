import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { seedPricesAPI } from "@/lib/apis/admin/seedPrices";
import {
  getTimelineOptions,
  getTimelineSelections,
} from "@/lib/apis/admin/cropStageTimelines";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import {
  seedPriceTypes,
  type SeedPriceFilters,
  type SeedPricesResponse,
} from "@/types/admin/seedPrice";
import type { PageProps } from "@/types/api";
import type {
  TimelineOption,
  TimelineOptionPage,
} from "@/types/admin/cropStageTimeline";
import SeedPricesFilters from "./SeedPricesFilters";
import SeedPricesList from "./SeedPricesList";

export default async function SeedPricesContent({ searchParams }: PageProps) {
  const t = await getTranslations("seedPrices"),
    params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  };
  const id = (key: string) =>
    Number.isSafeInteger(Number(value(key))) && Number(value(key)) > 0
      ? String(Number(value(key)))
      : "";
  const filters: SeedPriceFilters = {
    keyword: value("keyword").trim().slice(0, 150),
    seed_id: id("seed_id"),
    price_type:
      seedPriceTypes.find((type) => type === value("price_type")) ?? "",
    region_scope:
      value("region_scope") === "all"
        ? "all"
        : value("region_scope") === "specific"
          ? "specific"
          : "",
    is_active:
      value("is_active") === "0" ? "0" : value("is_active") === "1" ? "1" : "",
  };
  let result: SeedPricesResponse | undefined,
    choices: TimelineOptionPage | undefined,
    selection: TimelineOption | null = null,
    failure = "",
    canReview = false;
  try {
    canReview = (await requireAdmin()).is_super_user;
    const [response, seed] = await Promise.all([
      seedPricesAPI.list({
        ...filters,
        page: id("page") ? Number(id("page")) : 1,
        per_page: 10,
      }),
      getTimelineOptions("seed", null, false),
    ]);
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError(t("feedback.loadFailed"), 502);
    result = response;
    choices = seed;
    if (result.pagination.current_page > result.pagination.last_page)
      redirect({
        href: {
          pathname: "/admin/seed-prices",
          query: { ...params, page: Math.max(1, result.pagination.last_page) },
        },
        locale: await getLocale(),
      });
    selection =
      (
        await getTimelineSelections(
          { seed },
          { seed: filters.seed_id ? Number(filters.seed_id) : null },
        )
      ).seed ?? null;
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  return (
    <div className="min-w-0 space-y-5">
      <SeedPricesFilters
        key={JSON.stringify(params)}
        initialFilters={filters}
        choices={choices}
        selection={selection}
      />
      {failure ? (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-5"
        >
          {failure}
        </p>
      ) : result ? (
        <SeedPricesList
          result={result}
          canReview={canReview}
          filtered={Object.values(filters).some((value) => value !== "")}
        />
      ) : null}
    </div>
  );
}
