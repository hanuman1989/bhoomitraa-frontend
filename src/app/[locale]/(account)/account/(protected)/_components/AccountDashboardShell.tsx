"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useMemo,
  startTransition,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useUserAuth } from "@/hooks/useUserAuth";
import useAreaUnits from "@/hooks/useAreaUnits";
import { formatArea, resolvePreferredAreaUnit } from "@/lib/areaUnits";
import { useLocale } from "next-intl";
import AccountLanguageSwitcher from "@/components/common/AccountLanguageSwitcher";
import { MenuIcon, PlusIcon, MinusIcon } from "@/icons";
import {
  getFarmerFarmSummary,
  getFarmWorkspace,
} from "@/actions/account/farms";
import type { Farm, FarmSummary, BoundaryDraft } from "@/types/account/farm";
import type {
  CropCycle,
  CropDetail,
  CropMapRecord,
  CropStatus,
} from "@/types/account/farmCrop";
import { getCropMap } from "@/actions/account/farm-crops";
import type { CropInfoAction } from "@/components/common/maps/CropInfoWindow";
import type { FarmInfoAction } from "@/components/common/maps/FarmInfoWindow";
import CropWizardDialog from "../crops/_components/CropWizardDialog";
import CropDetailsDialog from "../crops/_components/CropDetailsDialog";
import CropDeleteConfirm from "../crops/_components/CropDeleteConfirm";
import { AccountFarmContext } from "./AccountFarmContext";
import AddFarmDialog from "../farms/_components/AddFarmDialog";
import FarmBoundaryDialog from "@/components/common/maps/FarmBoundaryDialog";
import type { FarmSatelliteSources } from "@/components/common/maps/farmStaticMap";
import DashboardMap from "./DashboardMap";
import { farmLocation } from "./farmGeometry";
import AccountSidebar from "./AccountSidebar";
import AccountBottomPanel from "./AccountBottomPanel";
import AccountFloatingActions from "./AccountFloatingActions";
import {
  accountModules,
  accountPathname,
  resolveAccountRoute,
  type AccountNavigationId,
} from "../_config/accountModules";
import {
  dashboardReducer,
  initialDashboardState,
  panelHeightForViewport,
} from "./dashboardState";
import {
  readDashboardSnapshot,
  saveDashboardSnapshot,
  snapshotKey,
} from "./dashboardSnapshot";
import type {
  DashboardFarm,
  DashboardMapHandle,
  FarmDataState,
} from "./dashboardTypes";

const emptyFarms: readonly DashboardFarm[] = [];
const getViewport = () => ({
  height: window.visualViewport?.height ?? window.innerHeight,
  width: window.innerWidth,
});
interface BrowserState {
  ready: boolean;
  snapshot: ReturnType<typeof readDashboardSnapshot>;
  viewport: { height: number; width: number };
  ownerId?: number;
}
const emptyWorkspace = {
  ownerId: null,
  farms: [] as Farm[],
  summary: null,
  satellitePreviews: undefined,
  status: "loading" as const,
  summaryUnit: null as string | null,
  summaryError: false,
};

export default function AccountDashboardShell({
  children,
  farmState,
}: {
  children: ReactNode;
  farmState?: FarmDataState;
}) {
  const t = useTranslations("farmerDashboard");
  const tf = useTranslations("farmerFarms");
  const { user, isAuthenticated, isLoading } = useUserAuth();
  const locale = useLocale();
  const metadata = useAreaUnits();
  const areaUnitLabel = metadata.label;
  const preferredUnit = user?.farmer_profile?.preferred_units ?? null;
  const latestPreference = useRef(preferredUnit);
  useEffect(() => {
    latestPreference.current = preferredUnit;
  }, [preferredUnit]);
  const router = useRouter();
  const pathname = usePathname();
  const route = resolveAccountRoute(pathname);
  const [panelHidden, setPanelHidden] = useState(false);
  const panelVisible = route.mode === "panel" && !panelHidden;
  const mapVisible = route.mode !== "full-page";
  const navigation = useRef({ pathname: accountPathname(pathname), router });
  const pendingFarmFocus = useRef<DashboardFarm | null>(null);
  const restoredUserId = useRef<number | undefined | null>(null);
  // Keep the first server/client render identical and allow route children to render.
  const [browserState, updateBrowserState] = useReducer(
    (current: BrowserState, update: Partial<BrowserState>): BrowserState => ({
      ...current,
      ...update,
    }),
    { ready: false, snapshot: null, viewport: { height: 0, width: 0 } },
  );
  const { snapshot, viewport } = browserState;
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);
  const [mapReady, setMapReady] = useState(false);
  const map = useRef<DashboardMapHandle>(null);
  const [sidebar, setSidebar] = useState<HTMLDivElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(0);
  const sidebarRef = useCallback((panel: HTMLDivElement | null) => {
    setSidebar(panel);
    setSidebarWidth(0);
  }, []);
  const [workspaceState, setWorkspace] = useState<{
    ownerId: number | null;
    farms: Farm[];
    summary: FarmSummary | null;
    satellitePreviews?: FarmSatelliteSources;
    status: "loading" | "ready" | "error";
    summaryUnit: string | null;
    summaryError: boolean;
  }>(emptyWorkspace);
  const workspace =
    workspaceState.ownerId === user?.id ? workspaceState : emptyWorkspace;
  const [revision, setRevision] = useState(0);
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const refreshSummary = useCallback(
    () => setSummaryAttempt((value) => value + 1),
    [],
  );
  const [farmDialog, setFarmDialog] = useState<{
    farm?: Farm;
    boundary?: BoundaryDraft;
  } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const openFarm = useCallback((farm?: Farm) => setFarmDialog({ farm }), []);
  const [cropRevision, setCropRevision] = useState(0);
  const refreshCrops = useCallback(
    () => setCropRevision((value) => value + 1),
    [],
  );
  const [cropMap, setCropMap] = useState<{
    ownerId: number | null;
    records: CropMapRecord[];
    status: "loading" | "ready" | "error";
  }>({ ownerId: null, records: [], status: "loading" });
  const [selectedCrop, setSelectedCrop] = useState<CropMapRecord | null>(null);
  const [cropDialog, setCropDialog] = useState<{
    id?: number;
    farmId?: number;
    startStep?: number;
  } | null>(null);
  const [cropDetails, setCropDetails] = useState<{
    id: number;
    section?: "soil" | "fertilizer";
  } | null>(null);
  const [cropDelete, setCropDelete] = useState<{
    id: number;
    name: string;
    status: CropStatus;
  } | null>(null);
  const openCrop = useCallback(
    (options: { id?: number; farmId?: number; startStep?: number } = {}) =>
      setCropDialog(options),
    [],
  );
  const showCropDetails = useCallback(
    (id: number, section?: "soil" | "fertilizer") =>
      setCropDetails({ id, section }),
    [],
  );
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    startTransition(async () => {
      const result = await getCropMap();
      if (!active) return;
      setCropMap((current) =>
        result.success && result.data
          ? { ownerId: user.id, records: result.data, status: "ready" }
          : {
              ownerId: user.id,
              records: current.ownerId === user.id ? current.records : [],
              status: "error",
            },
      );
      if (result.success && result.data)
        setSelectedCrop((current) =>
          current && current.status === "active"
            ? (result.data!.find((crop) => crop.id === current.id) ?? null)
            : current,
        );
    });
    return () => {
      active = false;
    };
  }, [user?.id, cropRevision, revision, locale]);
  useEffect(() => {
    if (!user?.id || farmState) return;
    let active = true;
    const requestedUnit = latestPreference.current;
    startTransition(async () => {
      try {
        const result = await getFarmWorkspace();
        if (active) {
          const data = result.data;
          if (result.success && data)
            setWorkspace((current) => ({
              ...data,
              ownerId: user.id,
              status: "ready",
              summaryUnit: requestedUnit,
              summaryError: false,
              ...(current.ownerId === user.id &&
              current.summaryUnit === latestPreference.current &&
              requestedUnit !== latestPreference.current
                ? {
                    summary: current.summary,
                    summaryUnit: current.summaryUnit,
                    summaryError: current.summaryError,
                  }
                : {}),
            }));
          else
            setWorkspace((current) => ({
              ...(current.ownerId === user.id ? current : emptyWorkspace),
              ownerId: user.id,
              status: "error",
            }));
        }
      } catch {
        if (active)
          setWorkspace((current) => ({
            ...(current.ownerId === user.id ? current : emptyWorkspace),
            ownerId: user.id,
            status: "error",
          }));
      }
    });
    return () => {
      active = false;
    };
  }, [user?.id, revision, farmState]);
  useEffect(() => {
    if (
      !user?.id ||
      farmState ||
      workspace.status !== "ready" ||
      workspace.summaryUnit === preferredUnit
    )
      return;
    let active = true;
    startTransition(async () => {
      setWorkspace((current) =>
        current.ownerId === user.id && current.summaryError
          ? { ...current, summaryError: false }
          : current,
      );
      const result = await getFarmerFarmSummary().catch(() => null);
      if (!active) return;
      setWorkspace((current) =>
        current.ownerId !== user.id
          ? current
          : result?.success && result.data
            ? {
                ...current,
                summary: result.data,
                summaryUnit: preferredUnit,
                summaryError: false,
              }
            : { ...current, summaryError: true },
      );
    });
    return () => {
      active = false;
    };
  }, [
    user?.id,
    preferredUnit,
    farmState,
    workspace.status,
    workspace.summaryUnit,
    summaryAttempt,
  ]);
  const loadedFarms = useMemo<DashboardFarm[]>(
    () =>
      workspace.farms.map((farm) => ({
        id: farm.id,
        name: farm.name,
        area: farm.area,
        area_unit: farm.area_unit,
        boundary: farm.boundary ?? null,
        location: farmLocation(farm.latitude, farm.longitude),
        locationLabel: [farm.village, farm.district?.name, farm.state?.name]
          .filter(Boolean)
          .join(", "),
        areaLabel: `${formatArea(farm.area, locale) ?? farm.area} ${areaUnitLabel(farm.area_unit)}`,
        statusLabel: tf(farm.is_active ? "active" : "inactive"),
        activeCropLabel: tf("noActiveCrop"),
      })),
    [workspace.farms, tf, locale, areaUnitLabel],
  );
  const farms = farmState
    ? farmState.status === "ready"
      ? farmState.farms
      : emptyFarms
    : loadedFarms;
  const panelHeight = panelHeightForViewport(
    state,
    viewport.height,
    viewport.width,
  );
  const visiblePanelHeight = panelVisible ? panelHeight : 0;
  const mapSpace = viewport.height - visiblePanelHeight;
  useEffect(() => {
    if (!state.sidebarOpen || !sidebar) return;
    const panel = sidebar;
    const measure = () => setSidebarWidth(panel.getBoundingClientRect().width);
    startTransition(measure);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [state.sidebarOpen, sidebar]);

  useEffect(() => {
    navigation.current = { pathname: accountPathname(pathname), router };
    if (
      navigation.current.pathname === accountModules["farm-manager"].href &&
      pendingFarmFocus.current
    ) {
      const farm = pendingFarmFocus.current;
      pendingFarmFocus.current = null;
      requestAnimationFrame(() => map.current?.focus(farm));
    }
  }, [pathname, router]);

  useEffect(() => {
    // Strict Mode replays effects; consume each Farmer's one-shot snapshot once.
    if (restoredUserId.current !== user?.id) {
      restoredUserId.current = user?.id;
      const saved = readDashboardSnapshot(user?.id);
      dispatch({
        type: "restore",
        state: saved?.state ?? initialDashboardState,
      });
      updateBrowserState({
        ready: true,
        snapshot: saved,
        ownerId: user?.id,
        viewport: getViewport(),
      });
      try {
        sessionStorage.removeItem(snapshotKey(user?.id));
      } catch {
        /* Storage is optional. */
      }
    }
    function resize() {
      updateBrowserState({ viewport: getViewport() });
    }
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, [user?.id]);
  const ready = useCallback((value: boolean) => setMapReady(value), []);
  const toggleFab = useCallback(
    (open: boolean) => dispatch({ type: "fab", open }),
    [],
  );
  const navigate = useCallback((id: AccountNavigationId) => {
    setPanelHidden(false);
    dispatch({ type: "navigate" });
    const href = accountModules[id].href;
    if (navigation.current.pathname !== href)
      navigation.current.router.push(href);
  }, []);
  const selectFarm = useCallback(
    (id: number) => {
      setSelectedCrop(null);
      dispatch({ type: "select-farm", id });
      const selected = farms.find((farm) => farm.id === id);
      if (selected) {
        if (navigation.current.pathname === accountModules["farm-manager"].href)
          requestAnimationFrame(() => map.current?.focus(selected));
        else pendingFarmFocus.current = selected;
      }
      navigate("farm-manager");
    },
    [farms, navigate],
  );
  const selectCrop = useCallback(
    (record: CropCycle | CropMapRecord) => {
      const known = cropMap.records.find((crop) => crop.id === record.id);
      const selected: CropMapRecord =
        "crop_name" in record
          ? record
          : (known ?? {
              id: record.id,
              farm_id: record.farm.id,
              crop_id: record.crop.id,
              crop_name: record.crop.name,
              crop_variety_name: record.crop_variety?.name ?? null,
              crop_color: record.crop.crop_color,
              status: record.status,
              boundary: null,
              latitude: record.latitude,
              longitude: record.longitude,
              cultivated_area: record.cultivated_area,
              area_unit: record.area_unit,
            });
      setSelectedCrop(selected);
      dispatch({ type: "select-farm", id: null });
      navigate("crop-manager");
      requestAnimationFrame(() =>
        map.current?.focus({
          id: selected.id,
          name: selected.crop_name ?? "",
          boundary: selected.boundary,
          location: farmLocation(selected.latitude, selected.longitude),
        }),
      );
    },
    [cropMap.records, navigate],
  );
  const selectMapCrop = useCallback(
    (id: number) => {
      const crop = cropMap.records.find((item) => item.id === id);
      if (crop) selectCrop(crop);
    },
    [cropMap.records, selectCrop],
  );
  const farmAction = useCallback(
    (action: FarmInfoAction, id: number) => {
      if (action === "planting-crops") openCrop({ farmId: id });
      else if (action === "historical-crops") {
        setPanelHidden(false);
        router.push(`/account/crops?tab=history&farm_id=${id}`);
      } else if (action === "edit-farm") {
        const farm = workspace.farms.find((f) => f.id === id);
        if (farm) openFarm(farm);
      } else if (action === "farm-details") selectFarm(id);
    },
    [openCrop, router, workspace.farms, openFarm, selectFarm],
  );
  const cropAction = useCallback(
    (action: CropInfoAction, id: number) => {
      const crop =
        cropMap.records.find((item) => item.id === id) ?? selectedCrop;
      if (!crop) return;
      if (action === "edit") openCrop({ id });
      else if (action === "farm") selectFarm(crop.farm_id);
      else if (action === "delete")
        setCropDelete({ id, name: crop.crop_name ?? "", status: crop.status });
      else
        showCropDetails(
          id,
          action === "soil" || action === "fertilizer" ? action : undefined,
        );
    },
    [cropMap.records, selectedCrop, openCrop, selectFarm, showCropDetails],
  );
  function saveForLanguageChange() {
    saveDashboardSnapshot(
      user?.id,
      state,
      map.current?.getView() ?? snapshot?.view ?? null,
    );
  }

  return (
    <AccountFarmContext.Provider
      value={{
        ...workspace,
        summary:
          workspace.summaryUnit === preferredUnit ? workspace.summary : null,
        summaryStatus:
          workspace.status !== "ready"
            ? workspace.status
            : workspace.summaryUnit === preferredUnit
              ? "ready"
              : workspace.summaryError
                ? "error"
                : "loading",
        refreshSummary,
        selectedFarmId: state.selectedFarmId,
        selectFarm,
        openFarm,
        refresh,
        revision,
        crops: {
          records: cropMap.ownerId === user?.id ? cropMap.records : [],
          status: cropMap.ownerId === user?.id ? cropMap.status : "loading",
          selectedId: selectedCrop?.id ?? null,
          revision: cropRevision,
          refresh: refreshCrops,
          select: selectCrop,
          open: openCrop,
          details: showCropDetails,
          remove: setCropDelete,
        },
      }}
    >
      <div
        className="bg-success-50 fixed inset-0 isolate overflow-hidden text-gray-900 dark:bg-gray-950 dark:text-gray-100"
        style={{ height: viewport.height || undefined }}
      >
        <h1 className="sr-only">{t("title")}</h1>
        <div
          className={`absolute inset-0 ${mapVisible ? "" : "pointer-events-none invisible"}`}
          aria-hidden={!mapVisible}
        >
          {browserState.ready ? (
            <DashboardMap
              ref={map}
              farms={farms}
              farmerId={user?.id ?? null}
              profile={user?.farmer_profile}
              authReady={Boolean(user?.id) && isAuthenticated && !isLoading}
              farmsStatus={farmState?.status ?? workspace.status}
              viewport={viewport}
              sidebarWidth={state.sidebarOpen ? sidebarWidth : 0}
              automaticViewportBlocked={
                drawing ||
                Boolean(farmDialog) ||
                Boolean(cropDialog) ||
                Boolean(cropDetails) ||
                Boolean(cropDelete) ||
                !mapVisible ||
                (state.sidebarOpen && sidebarWidth === 0)
              }
              selectedFarmId={state.selectedFarmId}
              crops={cropMap.ownerId === user?.id ? cropMap.records : undefined}
              selectedCrop={cropMap.ownerId === user?.id ? selectedCrop : null}
              onSelectCrop={selectMapCrop}
              onCropAction={cropAction}
              onFarmAction={farmAction}
              mapType={state.mapType}
              initialView={
                browserState.ownerId === user?.id
                  ? (snapshot?.view ?? undefined)
                  : undefined
              }
              onSelect={selectFarm}
              onReady={ready}
              bottomPadding={visiblePanelHeight}
            />
          ) : (
            <div
              role="status"
              className="text-success-900 dark:text-success-300 flex h-full items-center justify-center"
            >
              {t("loading")}
            </div>
          )}
        </div>
        {route.mode === "full-page" && (
          <main className="absolute inset-0 z-20 overflow-y-auto bg-gray-50 px-5 pt-24 pb-8 dark:bg-gray-950">
            {children}
          </main>
        )}
        {route.mode === "map" && children}
        {(!mapVisible || mapSpace >= 120) && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20"
            style={{ marginTop: "env(safe-area-inset-top)" }}
          >
            <button
              type="button"
              onClick={() => dispatch({ type: "sidebar", open: true })}
              aria-label={t("openSidebar")}
              aria-haspopup="dialog"
              aria-expanded={state.sidebarOpen}
              className="text-success-800 shadow-theme-lg hover:bg-success-50 focus-visible:outline-success-600 dark:text-success-400 pointer-events-auto absolute start-4 top-5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/95 p-0 leading-none focus-visible:outline-2 focus-visible:outline-offset-2 sm:start-6 dark:bg-gray-900"
            >
              <MenuIcon aria-hidden="true" className="block size-4 shrink-0" />
            </button>
            <div className="pointer-events-auto">
              <Suspense fallback={null}>
                <AccountLanguageSwitcher
                  compact
                  onBeforeChange={saveForLanguageChange}
                />
              </Suspense>
            </div>
          </div>
        )}
        {mapVisible && mapSpace >= 280 && !state.fabOpen && (
          <div
            role="group"
            aria-label={t("map.zoomControls")}
            className="text-success-800 shadow-theme-lg dark:text-success-400 absolute end-5 top-20 z-20 divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white/95 sm:end-7 dark:divide-gray-700 dark:bg-gray-900"
          >
            <button
              type="button"
              disabled={!mapReady}
              onClick={() => map.current?.zoom(1)}
              aria-label={t("map.zoomIn")}
              className="hover:bg-success-50 focus-visible:outline-success-600 flex size-8 shrink-0 items-center justify-center p-0 leading-none focus-visible:outline-2 disabled:opacity-40 dark:hover:bg-gray-800"
            >
              <PlusIcon aria-hidden="true" className="block size-4 shrink-0" />
            </button>
            <button
              type="button"
              disabled={!mapReady}
              onClick={() => map.current?.zoom(-1)}
              aria-label={t("map.zoomOut")}
              className="hover:bg-success-50 focus-visible:outline-success-600 flex size-8 shrink-0 items-center justify-center p-0 leading-none focus-visible:outline-2 disabled:opacity-40 dark:hover:bg-gray-800"
            >
              <MinusIcon aria-hidden="true" className="block size-4 shrink-0" />
            </button>
          </div>
        )}
        {mapVisible && (
          <AccountFloatingActions
            open={state.fabOpen}
            mapType={state.mapType}
            mapReady={mapReady}
            availableHeight={mapSpace}
            bottom={visiblePanelHeight + (panelHidden ? 48 : 24)}
            onToggle={toggleFab}
            onAddFarm={() => {
              navigate("farm-manager");
              openFarm();
            }}
            onDrawFarm={() => {
              dispatch({ type: "fab", open: false });
              setDrawing(true);
            }}
            onMapType={(mapType) => dispatch({ type: "map-type", mapType })}
            onLocate={() => map.current?.locate()}
            onFit={() => map.current?.fitAll()}
            onReset={() => {
              dispatch({
                type: "map-type",
                mapType: initialDashboardState.mapType,
              });
              map.current?.resetLayers();
              toast(t("actions.layersReset"));
            }}
          />
        )}
        {route.mode === "panel" && (
          <AccountBottomPanel
            height={panelHeight}
            maximum={viewport.height}
            collapsed={!panelVisible}
            onResize={(height) => dispatch({ type: "resize", height })}
            onToggle={() => setPanelHidden((hidden) => !hidden)}
          >
            {children}
          </AccountBottomPanel>
        )}
        <AccountSidebar
          panelRef={sidebarRef}
          open={state.sidebarOpen}
          activeModule={route.activeModule}
          onClose={() => dispatch({ type: "sidebar", open: false })}
          onNavigate={navigate}
        />
        {farmDialog && (
          <AddFarmDialog
            profile={user?.farmer_profile ?? null}
            farm={farmDialog.farm}
            initialBoundary={farmDialog.boundary}
            onClose={() => setFarmDialog(null)}
            onSaved={(farm) => {
              setFarmDialog(null);
              setWorkspace((current) => ({
                ...current,
                satellitePreviews: current.satellitePreviews
                  ? {
                      ...current.satellitePreviews,
                      [farm.id]: { normal: null, selected: null },
                    }
                  : undefined,
                farms: [
                  ...current.farms.filter((item) => item.id !== farm.id),
                  farm,
                ],
              }));
              dispatch({ type: "select-farm", id: farm.id });
              refresh();
              navigate("farm-manager");
              const selected: DashboardFarm = {
                id: farm.id,
                name: farm.name,
                area: farm.area,
                area_unit: farm.area_unit,
                boundary: farm.boundary ?? null,
                location: farmLocation(farm.latitude, farm.longitude),
              };
              requestAnimationFrame(() => map.current?.focus(selected));
            }}
          />
        )}
        {drawing && (
          <FarmBoundaryDialog
            areaUnit={
              resolvePreferredAreaUnit(preferredUnit, metadata.config) ?? ""
            }
            location={[
              user?.farmer_profile?.village,
              user?.farmer_profile?.district?.name,
              user?.farmer_profile?.state?.name,
            ]
              .filter(Boolean)
              .join(", ")}
            onClose={() => setDrawing(false)}
            onConfirm={(boundary) => {
              setDrawing(false);
              setFarmDialog({ boundary });
              navigate("farm-manager");
            }}
          />
        )}
        {cropDialog && (
          <CropWizardDialog
            {...cropDialog}
            onClose={() => setCropDialog(null)}
            onChanged={refreshCrops}
            onSaved={(crop: CropDetail) => {
              setCropDialog(null);
              refresh();
              const record: CropMapRecord = {
                id: crop.id,
                farm_id: crop.farm.id,
                crop_id: crop.crop.id,
                crop_name: crop.crop.name,
                crop_variety_name: crop.crop_variety?.name ?? null,
                crop_color: crop.crop.crop_color,
                status: crop.status,
                boundary: crop.boundary_details.boundary,
                latitude: crop.latitude,
                longitude: crop.longitude,
                cultivated_area: crop.cultivated_area,
                area_unit: crop.area_unit,
              };
              setCropMap((current) => ({
                ...current,
                records: [
                  ...current.records.filter((item) => item.id !== record.id),
                  record,
                ],
              }));
              selectCrop(record);
            }}
          />
        )}
        {cropDetails && (
          <CropDetailsDialog
            {...cropDetails}
            onClose={() => setCropDetails(null)}
            onEdit={(startStep) => {
              const id = cropDetails.id;
              setCropDetails(null);
              openCrop({ id, startStep });
            }}
          />
        )}
        {cropDelete && (
          <CropDeleteConfirm
            crop={cropDelete}
            onClose={() => setCropDelete(null)}
            onRemoved={() => {
              if (selectedCrop?.id === cropDelete.id) setSelectedCrop(null);
              setCropDelete(null);
              refreshCrops();
              refresh();
            }}
          />
        )}
      </div>
    </AccountFarmContext.Provider>
  );
}
