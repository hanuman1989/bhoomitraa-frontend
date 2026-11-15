"use client";
import { startTransition, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea } from "@/lib/areaUnits";
import { useSearchParams } from "next/navigation";
import { farmFilters } from "./farmFilters";
import toast from "react-hot-toast";
import {
  getFarmerFarm,
  getFarmerFarms,
  updateFarmerFarmStatus,
} from "@/actions/account/farms";
import type { Farm, FarmFilters } from "@/types/account/farm";
import type { PaginatedResponse } from "@/types/api";
import { cn } from "@/utils";
import type { FarmSatelliteSources } from "@/components/common/maps/farmStaticMap";
import {
  AgricultureIcon,
  FarmFieldIcon,
  SproutIcon,
  TimeIcon,
  PlusIcon,
  SearchIcon,
} from "@/icons";
import Pagination from "@/components/admin/tables/Pagination";
import BoundaryConfirmDialog from "@/components/common/maps/BoundaryConfirmDialog";
import { useAccountFarms } from "../../_components/AccountFarmContext";
import FarmList from "./FarmList";
import { farmControl, farmPrimaryButton } from "./farmFormTypes";
export default function FarmManager({
  initialData,
  initialError,
  initialSatellitePreviews,
}: {
  initialData: PaginatedResponse<Farm> | null;
  initialError: string;
  initialSatellitePreviews?: FarmSatelliteSources;
}) {
  const t = useTranslations("farmerFarms");
  const ta = useTranslations("areaUnits");
  const locale = useLocale();
  const metadata = useAreaUnits();
  const workspace = useAccountFarms();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const urlFilters = farmFilters(
    searchParams.get("search"),
    searchParams.get("status"),
    searchParams.get("page"),
  );
  const [data, setData] = useState(initialData),
    [error, setError] = useState(initialError),
    [loading, setLoading] = useState(false);
  const [satellitePreviews, setSatellitePreviews] = useState(
    initialSatellitePreviews,
  );
  const [search, setSearch] = useState(urlFilters.search),
    [query, setQuery] = useState(urlFilters.search),
    [status, setStatus] = useState<NonNullable<FarmFilters["status"]>>(
      urlFilters.status,
    ),
    [page, setPage] = useState(urlFilters.page),
    [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null),
    [statusFarm, setStatusFarm] = useState<Farm | null>(null);
  const pending = useRef(false);
  const request = useRef(0);
  const initial = useRef(
    `${urlFilters.search}:${urlFilters.status}:${urlFilters.page}`,
  );
  const initialRevision = useRef(workspace.revision);
  function updateUrl(changes: Record<string, string>) {
    const params = new URLSearchParams(urlQuery);
    for (const [key, value] of Object.entries(changes)) {
      if (
        !value ||
        (key === "page" && value === "1") ||
        (key === "status" && value === "all")
      )
        params.delete(key);
      else params.set(key, value);
    }
    const next = params.toString();
    window.history.pushState(
      null,
      "",
      next ? `?${next}` : window.location.pathname,
    );
  }
  useEffect(() => {
    const params = new URLSearchParams(urlQuery);
    const filters = farmFilters(
      params.get("search"),
      params.get("status"),
      params.get("page"),
    );
    startTransition(() => {
      setSearch(filters.search);
      setQuery(filters.search);
      setStatus(filters.status);
      setPage(filters.page);
    });
  }, [urlQuery]);
  useEffect(() => {
    if (search.trim() === query) return;
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
      const params = new URLSearchParams(urlQuery);
      params.delete("page");
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      const next = params.toString();
      window.history.pushState(
        null,
        "",
        next ? `?${next}` : window.location.pathname,
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [search, query, urlQuery]);
  useEffect(() => {
    if (
      request.current === 0 &&
      initial.current === `${query}:${status}:${page}` &&
      attempt === 0 &&
      workspace.revision === initialRevision.current
    ) {
      return;
    }
    const id = ++request.current;
    let active = true;
    startTransition(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getFarmerFarms({
          search: query,
          status,
          page,
          per_page: 15,
        });
        if (!active || request.current !== id) return;
        if (result.success && result.data) {
          if (page > result.data.pagination.last_page) {
            setPage(Math.max(1, result.data.pagination.last_page));
            return;
          }
          setData(result.data);
          setSatellitePreviews(result.satellitePreviews);
        } else setError(result.message || t("loadFailed"));
      } catch {
        if (active && request.current === id) setError(t("loadFailed"));
      } finally {
        if (active && request.current === id) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [query, status, page, attempt, workspace.revision, t]);
  async function edit(farm: Farm) {
    if (pending.current) return;
    pending.current = true;
    setBusyId(farm.id);
    try {
      const result = await getFarmerFarm(farm.id);
      if (result.success && result.data) workspace.openFarm(result.data);
      else toast.error(result.message || t("loadFailed"));
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  }
  async function changeStatus(farm: Farm) {
    if (pending.current) return;
    pending.current = true;
    setBusyId(farm.id);
    setStatusFarm(null);
    try {
      const result = await updateFarmerFarmStatus(farm.id, !farm.is_active);
      if (result.success && result.data) {
        toast.success(result.message || t("updated"));
        workspace.refresh();
      } else toast.error(result.message || t("saveFailed"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      pending.current = false;
      setBusyId(null);
    }
  }
  const summary = workspace.summary;
  const selectedFarm = workspace.farms.find(
    (farm) => farm.id === workspace.selectedFarmId,
  );
  const selectionOutsidePage =
    selectedFarm && !data?.data.some((farm) => farm.id === selectedFarm.id);
  const total = summary?.total_land_area;
  const totalValue = formatArea(total?.value, locale);
  const totalArea =
    total?.conversion_available && totalValue !== null
      ? `${totalValue} ${metadata.label(total.unit)}`
      : total?.breakdown.length
        ? total.breakdown
            .map(
              (group) =>
                `${formatArea(group.value, locale) ?? "—"} ${metadata.label(group.unit)}`,
            )
            .join(" + ")
        : summary
          ? ta("conversionUnavailable")
          : "—";
  const stats = [
    { key: "totalFarms", value: summary?.total_farms, Icon: AgricultureIcon },
    { key: "totalArea", value: totalArea, Icon: FarmFieldIcon },
    { key: "activeFarms", value: summary?.active_farms, Icon: SproutIcon },
    { key: "inactiveFarms", value: summary?.inactive_farms, Icon: TimeIcon },
  ];
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-4">
        <span className="bg-success-50 text-success-700 dark:bg-success-950 hidden rounded-full p-3 sm:block">
          <AgricultureIcon className="size-9" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("title")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("description")}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          <label className="sr-only" htmlFor="farm-status">
            {t("statusFilter")}
          </label>
          <select
            id="farm-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
              updateUrl({ status: event.target.value, page: "1" });
            }}
            className={cn(
              farmControl,
              "border-success-500 text-success-700 h-9 w-auto max-w-full px-2.5 text-xs font-semibold",
            )}
          >
            <option value="all">{t("allStatuses")}</option>
            <option value="active">{t("activeFarms")}</option>
            <option value="inactive">{t("inactiveFarms")}</option>
          </select>
          <button
            type="button"
            onClick={() => workspace.openFarm()}
            className={cn(
              farmPrimaryButton,
              "h-9 min-h-9 shrink-0 gap-1.5 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap",
            )}
          >
            <PlusIcon className="size-4 shrink-0" />
            {t("addFarm")}
          </button>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {stats.map(({ key, value, Icon }, index) => (
          <section
            key={key}
            className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 ${index === 3 ? "border-warning-100 bg-warning-50/70 dark:border-warning-900 dark:bg-warning-950/40" : "border-success-100 bg-success-50/70 dark:border-success-900 dark:bg-success-950/40"}`}
          >
            <span
              className={`hidden shrink-0 rounded-full p-2 sm:block ${index === 3 ? "bg-warning-100 text-warning-600" : "bg-success-100 text-success-700"}`}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {t(key)}
              </h3>
              <p className="mt-0.5 text-lg leading-6 font-bold break-words">
                {value ?? "—"}
              </p>
              {index === 1 && total && !total.conversion_available && (
                <p className="text-warning-700 dark:text-warning-300 mt-1 text-xs">
                  {ta(
                    total.unresolved_farms_count > 0
                      ? "unresolvedTotal"
                      : "conversionUnavailable",
                  )}
                </p>
              )}
              {index === 1 && total?.preference_resolution_required && (
                <p className="text-warning-700 dark:text-warning-300 mt-1 text-xs">
                  {ta("confirmPreference")}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
      {(workspace.status === "error" ||
        workspace.summaryStatus === "error") && (
        <p role="alert" className="text-error-600 text-sm">
          {t("summaryFailed")}{" "}
          <button
            type="button"
            onClick={
              workspace.status === "error"
                ? workspace.refresh
                : workspace.refreshSummary
            }
            className="underline"
          >
            {t("retry")}
          </button>
        </p>
      )}
      {workspace.summaryStatus === "loading" && (
        <p role="status" className="text-xs text-gray-500 dark:text-gray-400">
          {ta("summaryLoading")}
        </p>
      )}
      {metadata.status === "error" && (
        <p
          role="alert"
          className="text-warning-700 dark:text-warning-300 text-xs"
        >
          {ta("loadFailed")}{" "}
          <button type="button" onClick={metadata.retry} className="underline">
            {ta("retry")}
          </button>
        </p>
      )}
      {selectionOutsidePage && (
        <section aria-label={t("selectedFarm")} className="space-y-2">
          <h3 className="text-success-700 dark:text-success-300 text-sm font-semibold">
            {t("selectedFarm")}
          </h3>
          <FarmList
            farms={[selectedFarm]}
            satellitePreviews={workspace.satellitePreviews}
            selectedId={workspace.selectedFarmId}
            busyId={busyId}
            onSelect={workspace.selectFarm}
            onEdit={(farm) => startTransition(() => void edit(farm))}
            onStatus={setStatusFarm}
          />
        </section>
      )}
      <section aria-labelledby="my-farms">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 id="my-farms" className="text-xl font-bold">
            {t("myFarms")}
          </h3>
          <div className="relative w-full sm:w-96">
            <SearchIcon className="text-success-700 pointer-events-none absolute start-3 top-3 size-5" />
            <label htmlFor="farm-search" className="sr-only">
              {t("searchLabel")}
            </label>
            <input
              id="farm-search"
              type="search"
              maxLength={150}
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${farmControl} ps-10`}
            />
          </div>
        </div>
        <div aria-busy={loading}>
          {loading ? (
            <div role="status" className="space-y-2 py-2">
              <p className="sr-only">{t("loading")}</p>
              {[0, 1, 2].map((n) => (
                <div
                  key={n}
                  className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="border-error-200 bg-error-50 text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200 rounded-xl border p-5 text-sm"
            >
              {error}{" "}
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="font-semibold underline"
              >
                {t("retry")}
              </button>
            </div>
          ) : data?.data.length ? (
            <FarmList
              farms={data.data}
              satellitePreviews={satellitePreviews}
              savedFarms={workspace.farms}
              savedSatellitePreviews={workspace.satellitePreviews}
              selectedId={workspace.selectedFarmId}
              busyId={busyId}
              onSelect={workspace.selectFarm}
              onEdit={(farm) => startTransition(() => void edit(farm))}
              onStatus={setStatusFarm}
            />
          ) : (
            <div className="border-success-200 bg-success-50/40 dark:border-success-900 dark:bg-success-950/30 flex flex-col items-center gap-4 rounded-2xl border border-dashed py-10 text-center">
              <FarmFieldIcon className="text-success-600 size-12" />
              <p className="px-4 text-sm text-gray-600 dark:text-gray-300">
                {t(query || status !== "all" ? "noMatches" : "empty")}
              </p>
              <button
                type="button"
                onClick={() => workspace.openFarm()}
                className={farmPrimaryButton}
              >
                <PlusIcon className="size-4" />
                {t("addFirstFarm")}
              </button>
            </div>
          )}
        </div>
        {!loading && !error && data && data.pagination.last_page > 1 && (
          <nav
            aria-label={t("pagination")}
            className="mt-4 flex flex-wrap items-center justify-between gap-3"
          >
            <p className="text-xs text-gray-500">
              {t("pageSummary", {
                from: data.pagination.from ?? 0,
                to: data.pagination.to ?? 0,
                total: data.pagination.total,
              })}
            </p>
            <Pagination
              currentPage={data.pagination.current_page}
              totalPages={data.pagination.last_page}
              onPageChange={(value) => {
                setPage(value);
                updateUrl({ page: String(value) });
              }}
            />
          </nav>
        )}
      </section>
      {statusFarm && (
        <BoundaryConfirmDialog
          title={t(statusFarm.is_active ? "deactivateFarm" : "activateFarm")}
          description={t("statusConfirm", { name: statusFarm.name })}
          onClose={() => setStatusFarm(null)}
          onConfirm={() => startTransition(() => void changeStatus(statusFarm))}
        />
      )}
    </div>
  );
}
