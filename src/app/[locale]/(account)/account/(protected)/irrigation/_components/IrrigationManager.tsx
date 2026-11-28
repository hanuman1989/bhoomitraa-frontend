"use client";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { AlertIcon, InfoIcon, RouteIcon, WaterDropIcon } from "@/icons";
import { cn } from "@/utils";
import {
  changeIrrigationStatus,
  getIrrigationAsset,
  getIrrigationWorkspace,
  type IrrigationPart,
  type IrrigationWorkspaceResult,
} from "@/actions/account/irrigation";
import type {
  IrrigationAsset,
  IrrigationAssetType,
  IrrigationListResponse,
  IrrigationMapFeature,
  IrrigationOptions,
  IrrigationStatus,
  IrrigationSummary,
} from "@/types/account/irrigation";
import { useAccountFarms } from "../../_components/AccountFarmContext";
import IrrigationDeleteConfirm from "./IrrigationDeleteConfirm";
import IrrigationDetails, {
  type IrrigationSelection,
} from "./IrrigationDetails";
import IrrigationFormDialog from "./IrrigationFormDialog";
import IrrigationList from "./IrrigationList";
import IrrigationSummaryCards from "./IrrigationSummaryCards";
import IrrigationToolbar from "./IrrigationToolbar";
import {
  defaultIrrigationFilters,
  hasIrrigationFilters,
  irrigationFilters,
  irrigationQuery,
  irrigationSearchParams,
  type IrrigationFilterState,
} from "./irrigationFilters";
import type {
  IrrigationMapAction,
  IrrigationMapModel,
  IrrigationView,
} from "./irrigationMap";
import { irrigationPrimary, irrigationWater } from "./IrrigationUi";

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (change) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", change);
      return () => media.removeEventListener("change", change);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
/** Filters live in the URL. The native History API updates it without re-running the page. */
function replaceIrrigationUrl(state: IrrigationFilterState) {
  const query = irrigationSearchParams(state);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}`,
  );
}

/**
 * The Irrigation Manager panel: summary, filters, list and details. While it
 * is open, the shared dashboard map shows its filtered assets (every page's
 * map shows all of them); assets are independent of farms.
 */
export default function IrrigationManager({
  initialList,
  initialSummary,
  initialOptions,
  initialError,
}: {
  initialList: IrrigationListResponse | null;
  initialSummary: IrrigationSummary | null;
  initialOptions: IrrigationOptions | null;
  initialError?: string;
}) {
  const t = useTranslations("farmerIrrigation");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const params = searchParams.toString();
  const filters = useMemo(
    () => irrigationFilters(Object.fromEntries(new URLSearchParams(params))),
    [params],
  );
  const { irrigation } = useAccountFarms();
  const { publish, requestedId, clearRequest } = irrigation;
  const mapReady = irrigation.mapStatus === "ready";
  const mobile = useMediaQuery("(max-width: 767px)");
  // Below the large breakpoint the details open as a bottom sheet.
  const compact = useMediaQuery("(max-width: 1023px)");
  const [chosenView, setChosenView] = useState<IrrigationView | null>(null);
  const view: IrrigationView = chosenView ?? (mobile ? "list" : "combined");
  const [list, setList] = useState(initialList);
  const [listState, setListState] = useState<"loading" | "ready" | "error">(
    initialList ? "ready" : "error",
  );
  const [summary, setSummary] = useState(initialSummary);
  const [options, setOptions] = useState(initialOptions);
  // Until its own map loads, an unfiltered manager shows the assets the map
  // already had, so they don't blink out when the page opens.
  const [features, setFeatures] = useState<readonly IrrigationMapFeature[]>(
    () => (hasIrrigationFilters(filters) ? [] : irrigation.assets),
  );
  const [error, setError] = useState(initialError ?? "");
  const [selection, setSelection] = useState<IrrigationSelection | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<{
    category: IrrigationAssetType;
    asset: IrrigationAsset | null;
    startEditor: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState<IrrigationAsset | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [search, setSearch] = useState(filters.search);
  // The newest request for each part wins; older responses are ignored.
  const requests = useRef({
    sequence: 0,
    list: 0,
    summary: 0,
    map: 0,
    options: 0,
  });

  const refresh = useCallback(
    async (
      parts: IrrigationPart[],
      query: IrrigationFilterState,
      { quiet = false, prune = false } = {},
    ) => {
      if (!parts.length) return;
      const id = ++requests.current.sequence;
      for (const part of parts) requests.current[part] = id;
      if (parts.includes("list") && !quiet) setListState("loading");
      const fallback = { success: false, message: t("errors.loadFailed") };
      const result = await getIrrigationWorkspace(
        irrigationQuery(query),
        parts,
      ).catch((): IrrigationWorkspaceResult =>
        Object.fromEntries(parts.map((part) => [part, fallback])),
      );
      const latest = (part: IrrigationPart) => requests.current[part] === id;
      const failures: string[] = [];
      let fresh: IrrigationAsset[] | null = null;
      let mapped: IrrigationMapFeature[] | null = null;
      if (result.list && latest("list")) {
        const page = result.list;
        if (page.success && page.data) {
          const last = page.data.pagination.last_page;
          if (query.page > last && last > 0) {
            replaceIrrigationUrl({ ...query, page: last });
            return;
          }
          setList(page.data);
          setListState("ready");
          fresh = page.data.data;
        } else {
          setListState("error");
          failures.push(page.message);
        }
      }
      if (result.summary && latest("summary")) {
        if (result.summary.success && result.summary.data)
          setSummary(result.summary.data);
        else failures.push(result.summary.message);
      }
      if (result.options && latest("options")) {
        if (result.options.success && result.options.data)
          setOptions(result.options.data);
        else failures.push(result.options.message);
      }
      if (result.map && latest("map")) {
        if (result.map.success && result.map.data) {
          mapped = result.map.data.features;
          setFeatures(mapped);
        } else failures.push(result.map.message);
      }
      setError(failures[0] ?? "");
      // Keep the details current, and drop a selection the filters now exclude.
      setSelection((current) => {
        if (!current) return current;
        const asset = fresh?.find((item) => item.id === current.id);
        if (asset) return { ...current, asset, status: "ready" };
        if (
          prune &&
          fresh &&
          mapped &&
          !mapped.some((f) => f.id === current.id)
        )
          return null;
        return current;
      });
    },
    [t],
  );

  const firstLoad = useRef(true);
  const loadedLocale = useRef(locale);
  useEffect(() => {
    const parts: IrrigationPart[] = firstLoad.current
      ? [
          "map",
          ...(initialList ? [] : (["list"] as const)),
          ...(initialSummary ? [] : (["summary"] as const)),
          ...(initialOptions ? [] : (["options"] as const)),
        ]
      : loadedLocale.current !== locale
        ? ["list", "summary", "map", "options"]
        : ["list", "map"];
    const prune = !firstLoad.current;
    firstLoad.current = false;
    loadedLocale.current = locale;
    startTransition(() => {
      void refresh(parts, filters, { prune });
    });
  }, [filters, locale, refresh, initialList, initialSummary, initialOptions]);

  // The search box follows the URL (Back/Forward) and updates it after a pause.
  useEffect(() => {
    startTransition(() => setSearch(filters.search));
  }, [filters.search]);
  useEffect(() => {
    if (search.trim() === filters.search.trim()) return;
    const timeout = setTimeout(
      () => replaceIrrigationUrl({ ...filters, search, page: 1 }),
      300,
    );
    return () => clearTimeout(timeout);
  }, [search, filters]);

  function closeDetails() {
    setSelection(null);
    setSheetOpen(false);
  }
  function select(asset: IrrigationAsset) {
    setSelection({ id: asset.id, asset, status: "ready" });
    setSheetOpen(true);
  }
  async function loadAsset(id: string) {
    setSelection({ id, asset: null, status: "loading" });
    const result = await getIrrigationAsset(id).catch(() => null);
    setSelection((current) =>
      current?.id !== id
        ? current
        : result?.success && result.data
          ? { id, asset: result.data, status: "ready" }
          : { id, asset: null, status: "error" },
    );
  }
  function selectFromMap(id: string | null) {
    if (!id) {
      closeDetails();
      return;
    }
    const known = list?.data.find((asset) => asset.id === id);
    if (known) setSelection({ id, asset: known, status: "ready" });
    else void loadAsset(id);
    // Map view shows the popup on the map instead.
    setSheetOpen(view !== "map");
  }
  function openForm(
    category: IrrigationAssetType,
    asset: IrrigationAsset | null,
    startEditor = false,
  ) {
    if (!options) return;
    setSheetOpen(false);
    setForm({ category, asset, startEditor });
  }
  async function mapAction(action: IrrigationMapAction, id: string) {
    if (action === "details") {
      setChosenView("combined");
      if (selection?.id !== id) selectFromMap(id);
      setSheetOpen(true);
      return;
    }
    const known =
      (selection?.id === id ? selection.asset : null) ??
      list?.data.find((asset) => asset.id === id) ??
      null;
    if (known) {
      openForm(known.asset_type, known);
      return;
    }
    const result = await getIrrigationAsset(id).catch(() => null);
    if (result?.success && result.data)
      openForm(result.data.asset_type, result.data);
    else toast.error(result?.message || t("errors.loadFailed"));
  }

  // An asset tapped on another page's map opens here, selected and in view.
  function openRequested(id: string) {
    selectFromMap(id);
    const feature = irrigation.assets.find((item) => item.id === id);
    if (feature)
      irrigation.locate(feature.properties.asset_type, feature.geometry);
  }
  // The shared map calls back through stable functions that use the latest state.
  const handlers = useRef({
    select: selectFromMap,
    action: mapAction,
    open: openRequested,
  });
  useEffect(() => {
    handlers.current = {
      select: selectFromMap,
      action: mapAction,
      open: openRequested,
    };
  });
  const onMapSelect = useCallback(
    (id: string | null) => handlers.current.select(id),
    [],
  );
  const onMapAction = useCallback(
    (action: IrrigationMapAction, id: string) =>
      void handlers.current.action(action, id),
    [],
  );
  const selectedId = selection?.id ?? null;
  const model = useMemo<IrrigationMapModel>(
    () => ({
      features,
      selectedId,
      view,
      onSelect: onMapSelect,
      onAction: onMapAction,
    }),
    [features, selectedId, view, onMapSelect, onMapAction],
  );
  useEffect(() => {
    publish(model);
  }, [publish, model]);
  useEffect(() => () => publish(null), [publish]);
  useEffect(() => {
    if (!requestedId) return;
    startTransition(() => {
      clearRequest();
      handlers.current.open(requestedId);
    });
  }, [requestedId, clearRequest]);

  function changeView(next: IrrigationView) {
    setChosenView(next);
    if (next === "map") setSheetOpen(false);
  }
  function locate(asset: IrrigationAsset) {
    if (!asset.geometry) {
      openForm(asset.asset_type, asset, true);
      return;
    }
    setSelection({ id: asset.id, asset, status: "ready" });
    setSheetOpen(false);
    // The map is hidden behind the List view's tall panel.
    if (view === "list") setChosenView(mobile ? "map" : "combined");
    irrigation.locate(asset.asset_type, asset.geometry);
  }
  // After a change, the other pages' maps reload their assets too.
  function changed() {
    irrigation.refresh();
    void refresh(["list", "summary", "map"], filters, { quiet: true });
  }
  function saved(asset: IrrigationAsset) {
    setForm(null);
    setSelection({ id: asset.id, asset, status: "ready" });
    setSheetOpen(true);
    changed();
  }
  function deleted(id: string) {
    setDeleting(null);
    setSelection((current) => (current?.id === id ? null : current));
    changed();
  }
  async function changeStatus(
    asset: IrrigationAsset,
    status: IrrigationStatus,
  ) {
    if (status === asset.status || statusBusy) return;
    setStatusBusy(true);
    const result = await changeIrrigationStatus(asset.id, status).catch(
      () => null,
    );
    setStatusBusy(false);
    if (result?.success && result.data) {
      const updated = result.data;
      toast.success(result.message);
      setSelection((current) =>
        current?.id === updated.id
          ? { ...current, asset: updated, status: "ready" }
          : current,
      );
      changed();
    } else toast.error(result?.message || t("errors.saveFailed"));
  }
  function retry() {
    void refresh(
      ["list", "summary", "map", ...(options ? [] : (["options"] as const))],
      filters,
    );
  }
  function resetFilters() {
    setSearch("");
    replaceIrrigationUrl(defaultIrrigationFilters);
  }

  const emptyInventory = summary
    ? summary.total_assets === 0
    : Boolean(list && !list.data.length && !hasIrrigationFilters(filters));
  const details = {
    selection,
    options,
    mapReady,
    statusBusy,
    onClose: closeDetails,
    onRetry: (id: string) => void loadAsset(id),
    onEdit: (asset: IrrigationAsset) => openForm(asset.asset_type, asset),
    onLocate: locate,
    onEditLocation: (asset: IrrigationAsset) =>
      openForm(asset.asset_type, asset, true),
    onDelete: setDeleting,
    onStatus: (asset: IrrigationAsset, status: IrrigationStatus) =>
      void changeStatus(asset, status),
  };
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
            {t("title")}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button
            type="button"
            disabled={!options}
            onClick={() => openForm("source", null)}
            className={cn(irrigationWater, "flex-1 sm:flex-none")}
          >
            <WaterDropIcon aria-hidden="true" className="size-4" />
            {t("actions.addSource")}
          </button>
          <button
            type="button"
            disabled={!options}
            onClick={() => openForm("pipeline", null)}
            className={cn(irrigationPrimary, "flex-1 sm:flex-none")}
          >
            <RouteIcon aria-hidden="true" className="size-4" />
            {t("actions.addPipeline")}
          </button>
        </div>
      </header>
      <IrrigationSummaryCards summary={summary} />
      <IrrigationToolbar
        view={view}
        onView={changeView}
        filters={filters}
        onFilters={replaceIrrigationUrl}
        search={search}
        onSearch={setSearch}
        options={options}
        onReset={resetFilters}
      />
      {irrigation.mapStatus === "error" && (
        <p
          role="status"
          className="border-blue-light-200 bg-blue-light-50 text-blue-light-800 dark:border-blue-light-800 dark:text-blue-light-200 flex items-start gap-2 rounded-xl border p-3 text-sm dark:bg-gray-800"
        >
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong className="font-semibold">
              {t("map.unavailableTitle")}
            </strong>{" "}
            {t("map.unavailableDescription")}
          </span>
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm"
        >
          <AlertIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 font-semibold underline"
          >
            {t("actions.retry")}
          </button>
        </p>
      )}
      {view !== "map" && (
        <div
          className={cn(
            "grid items-start gap-4",
            view === "list"
              ? "lg:grid-cols-[minmax(0,1fr)_26rem]"
              : "lg:grid-cols-[minmax(0,1fr)_23.75rem]",
          )}
        >
          <IrrigationList
            list={list}
            state={listState}
            emptyInventory={emptyInventory}
            selectedId={selectedId}
            mapReady={mapReady}
            canAdd={Boolean(options)}
            onAdd={(category) => openForm(category, null)}
            onRetry={retry}
            onReset={resetFilters}
            onPage={(page) => replaceIrrigationUrl({ ...filters, page })}
            onSelect={select}
            onLocate={locate}
            onEdit={(asset) => openForm(asset.asset_type, asset)}
            onDelete={setDeleting}
          />
          <div className="sticky top-0 hidden lg:block">
            <IrrigationDetails variant="panel" {...details} />
          </div>
        </div>
      )}
      {compact && (
        <IrrigationDetails
          variant="sheet"
          {...details}
          selection={sheetOpen && view !== "map" ? selection : null}
          // Closing the sheet keeps the asset highlighted in the list.
          onClose={() => setSheetOpen(false)}
        />
      )}
      {form && options && (
        <IrrigationFormDialog
          category={form.category}
          asset={form.asset}
          options={options}
          startEditor={form.startEditor}
          onClose={() => setForm(null)}
          onSaved={saved}
        />
      )}
      {deleting && (
        <IrrigationDeleteConfirm
          asset={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={deleted}
        />
      )}
    </div>
  );
}
