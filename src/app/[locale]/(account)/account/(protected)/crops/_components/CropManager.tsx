"use client";
import { useEffect, useRef, useState, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  getFarmerCrops,
  getCropSummary,
  getCropOptions,
} from "@/actions/account/farm-crops";
import type {
  CropCycle,
  CropSeason,
  CropSummary,
} from "@/types/account/farmCrop";
import type { PaginatedResponse } from "@/types/api";
import { useAccountFarms } from "../../_components/AccountFarmContext";
import { SproutIcon, PlusIcon, SearchIcon } from "@/icons";
import Pagination from "@/components/admin/tables/Pagination";
import CropListItem from "./CropListItem";
import CropSummaryCards from "./CropSummaryCards";
import { CropNotice, cropButton, cropControl, cropPrimary } from "./CropUi";
import { cropFilters } from "./cropFilters";
export default function CropManager({
  initialData,
  initialSummary,
  initialError,
}: {
  initialData: PaginatedResponse<CropCycle> | null;
  initialSummary: CropSummary | null;
  initialError?: string;
}) {
  const t = useTranslations("farmerCrops");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = searchParams.toString();
  const workspace = useAccountFarms();
  const [data, setData] = useState(initialData);
  const [summary, setSummary] = useState(initialSummary);
  const [seasons, setSeasons] = useState<CropSeason[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [attempt, setAttempt] = useState(0);
  const first = useRef(true);
  const filters = cropFilters(Object.fromEntries(searchParams));
  const tab =
    filters.status === "draft"
      ? "drafts"
      : filters.status === "active"
        ? "active"
        : "history";
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  }
  useEffect(() => {
    let active = true;
    void getCropOptions("seasons").then((result) => {
      if (active && result.success && result.data) setSeasons(result.data);
    });
    return () => {
      active = false;
    };
  }, []);
  const urlSearch = searchParams.get("search") ?? "";
  useEffect(() => {
    startTransition(() => setSearch(urlSearch));
  }, [urlSearch]);
  useEffect(() => {
    if (search === urlSearch) return;
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (search) next.set("search", search);
      else next.delete("search");
      next.set("page", "1");
      router.replace(`${pathname}?${next}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timeout);
  }, [search, urlSearch, params, router, pathname]);
  useEffect(() => {
    if (first.current && initialData) {
      first.current = false;
      return;
    }
    first.current = false;
    let active = true;
    startTransition(async () => {
      setLoading(true);
      setError("");
      const filters = cropFilters(
        Object.fromEntries(new URLSearchParams(params)),
      );
      const { status, page, per_page, ...summaryFilters } = filters;
      try {
        const [list, stats] = await Promise.all([
          getFarmerCrops(filters),
          getCropSummary(summaryFilters),
        ]);
        if (!active) return;
        if (list.success && list.data) {
          if (
            (filters.page ?? 1) > list.data.pagination.last_page &&
            list.data.pagination.last_page > 0
          ) {
            const next = new URLSearchParams(params);
            next.set("page", String(list.data.pagination.last_page));
            router.replace(`${pathname}?${next}`, { scroll: false });
          } else setData(list.data);
        } else setError(list.message);
        if (stats.success && stats.data) setSummary(stats.data);
        else setError(stats.message);
      } catch {
        if (active) setError(t("loadFailed"));
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [
    params,
    workspace.crops.revision,
    workspace.revision,
    attempt,
    initialData,
    router,
    pathname,
    t,
  ]);
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <span className="bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300 hidden rounded-full p-2.5 sm:block">
          <SproutIcon className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label={t("seasonFilter")}
            value={filters.season_id ?? ""}
            onChange={(e) => update({ season_id: e.target.value, page: "1" })}
            className={`${cropControl} !h-10 w-40 !rounded-lg text-xs sm:w-44`}
          >
            <option value="">{t("allSeasons")}</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${cropPrimary} !min-h-10 !rounded-lg px-4 py-2`}
            onClick={() => workspace.crops.open({ farmId: filters.farm_id })}
          >
            <PlusIcon className="size-4" />
            {t("plantCrop")}
          </button>
        </div>
      </header>
      <CropSummaryCards summary={summary} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav
          aria-label={t("cropTabs")}
          className="flex gap-2 border-b border-gray-200 dark:border-gray-700"
        >
          {(["active", "drafts", "history"] as const).map((key) => (
            <button
              type="button"
              key={key}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => update({ tab: key, page: "1" })}
              className={`border-b-3 px-2 py-2 text-xs font-semibold sm:text-sm ${tab === key ? "border-success-600 text-success-700 dark:text-success-300" : "border-transparent text-gray-500"}`}
            >
              {t(`tabs.${key}`, {
                count:
                  key === "active"
                    ? (summary?.active_crops ?? 0)
                    : key === "drafts"
                      ? (summary?.draft_crops ?? 0)
                      : (summary?.completed_crops ?? 0) +
                        (summary?.cancelled_crops ?? 0),
              })}
            </button>
          ))}
        </nav>
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <SearchIcon
            aria-hidden
            className="text-success-600 absolute start-3 top-3 size-4"
          />
          <input
            aria-label={t("search")}
            value={search}
            maxLength={150}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className={`${cropControl} !h-10 !rounded-lg ps-9 text-xs`}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {tab === "history" && (
          <select
            aria-label={t("historyStatus")}
            value={filters.status}
            onChange={(e) =>
              update({ history_status: e.target.value, page: "1" })
            }
            className={`${cropControl} !h-10 w-auto !rounded-lg text-xs`}
          >
            <option value="completed">{t("statuses.completed")}</option>
            <option value="cancelled">{t("statuses.cancelled")}</option>
          </select>
        )}
        {filters.farm_id && (
          <div className="bg-success-50 dark:bg-success-950 flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
            <span>
              {workspace.farms.find((f) => f.id === filters.farm_id)?.name ??
                t("farm")}
            </span>
            <button
              type="button"
              className="underline"
              onClick={() => update({ farm_id: "", page: "1" })}
            >
              {t("clearFilter")}
            </button>
          </div>
        )}
      </div>
      {workspace.crops.status === "error" && (
        <CropNotice error>
          {t("mapLoadFailed")}{" "}
          <button
            type="button"
            className="underline"
            onClick={workspace.crops.refresh}
          >
            {t("retry")}
          </button>
        </CropNotice>
      )}
      {error && (
        <CropNotice error>
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setAttempt((n) => n + 1)}
          >
            {t("retry")}
          </button>
        </CropNotice>
      )}
      {loading ? (
        <div role="status" className="animate-pulse space-y-2 py-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
          <span className="sr-only">{t("loading")}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.data.map((crop) => (
            <CropListItem key={crop.id} crop={crop} />
          ))}
          {!data?.data.length && !error && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
              <SproutIcon className="text-success-600 mx-auto size-10" />
              <h3 className="mt-3 text-lg font-semibold">{t("noCrops")}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t("noCropsDescription")}
              </p>
              <button
                type="button"
                className={`${cropButton} mt-4`}
                onClick={() =>
                  workspace.crops.open({ farmId: filters.farm_id })
                }
              >
                {t("plantCrop")}
              </button>
            </div>
          )}
        </div>
      )}
      {data && data.pagination.last_page > 1 && (
        <div className="flex justify-end">
          <Pagination
            currentPage={data.pagination.current_page}
            totalPages={data.pagination.last_page}
            onPageChange={(page) => update({ page: String(page) })}
          />
        </div>
      )}
      <p className="text-xs text-gray-500">{t("timelineUnavailable")}</p>
    </div>
  );
}
