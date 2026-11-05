import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import { regionsAPI } from "@/lib/apis/admin/regions";
import { requireAdmin } from "@/lib/auth/dal";
import type { PageProps, PageSearchParams } from "@/types/api";
import type {
  RegionFilterValues,
  RegionsListResponse,
  RegionType,
} from "@/types/admin/region";
import RegionsFilters from "./RegionsFilters";
import RegionsList from "./RegionsList";

function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function positiveInteger(value: string): number | undefined {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function regionType(value: string): RegionType | "" {
  switch (value) {
    case "country":
    case "state":
    case "district":
    case "subdistrict":
    case "village":
      return value;
    default:
      return "";
  }
}

export default async function RegionsContent({ searchParams }: PageProps) {
  const t = await getTranslations("regions");
  const params = await searchParams;
  const selectedType = regionType(queryValue(params.region_type));
  const parentId = selectedType
    ? positiveInteger(queryValue(params.parent_id))
    : undefined;
  const status = queryValue(params.is_active);
  const filters: RegionFilterValues = {
    keyword: queryValue(params.keyword).trim(),
    region_type: selectedType,
    parent_id: parentId === undefined ? "" : String(parentId),
    is_active: status === "1" || status === "0" ? status : "",
  };

  let result: RegionsListResponse | undefined;
  let errorMessage: string | undefined;
  let parentNames: Record<number, string | null> = {};
  try {
    await requireAdmin();
    const response = await regionsAPI.list({
      keyword: filters.keyword || undefined,
      region_type: filters.region_type || undefined,
      parent_id: parentId,
      is_active: filters.is_active === "" ? undefined : filters.is_active,
      page: positiveInteger(queryValue(params.page)) ?? 1,
      per_page: 10,
    });

    if (!response.status) {
      errorMessage = response.message || t("loadFailed");
    } else {
      result = response;
      const parentIds = [
        ...new Set([
          ...response.data.flatMap((region) =>
            region.parent_id === null ? [] : [region.parent_id],
          ),
          ...(parentId === undefined ? [] : [parentId]),
        ]),
      ];
      parentNames = Object.fromEntries(
        await Promise.all(
          parentIds.map(async (id) => {
            const visibleParent = response.data.find(
              (region) => region.id === id,
            );
            if (visibleParent) return [id, visibleParent.name] as const;
            let parent;
            try {
              parent = await regionsAPI.show(id);
            } catch (error: unknown) {
              if (
                id === parentId &&
                error instanceof ApiError &&
                error.status === 404
              )
                return [id, null] as const;
              throw error;
            }
            if (!parent.status)
              throw new Error("Unable to retrieve parent region");
            return [id, parent.data.name] as const;
          }),
        ),
      );
    }
  } catch (error: unknown) {
    const failure = await handleActionError(error, t("loadFailed"));
    errorMessage = failure.message;
  }

  if (result && result.pagination.current_page > result.pagination.last_page) {
    const query: PageSearchParams = {
      ...params,
      page: String(Math.max(1, result.pagination.last_page)),
    };
    delete query.locale;
    redirect({
      href: { pathname: "/admin/regions", query },
      locale: await getLocale(),
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <RegionsFilters
        key={JSON.stringify(filters)}
        initialFilters={filters}
        initialParent={
          parentId === undefined
            ? null
            : {
                id: parentId,
                name: parentNames[parentId] ?? t("regionId", { id: parentId }),
              }
        }
      />
      {errorMessage ? (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
        >
          {errorMessage}
        </p>
      ) : result ? (
        <RegionsList
          regions={result.data}
          pagination={result.pagination}
          parentNames={parentNames}
        />
      ) : null}
    </div>
  );
}
