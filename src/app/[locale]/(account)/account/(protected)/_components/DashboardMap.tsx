"use client";
import {
  useEffect,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  startTransition,
  type Ref,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import FarmInfoOverlay from "@/components/common/maps/FarmInfoOverlay";
import { LocationPinIcon } from "@/icons";
import {
  DEFAULT_FARM_COLOR,
  farmMapColor,
} from "@/components/common/maps/farmMapStyle";
import { DEFAULT_MAP_VIEW } from "./dashboardState";
import {
  farmAnchor,
  farmFeature,
  farmPositions,
  isMapPosition,
} from "./farmGeometry";
import {
  cancelViewportAdjustment,
  centerMapPosition,
  fitMapPositions,
  fitViewportBounds,
  profileLocationQueries,
  resolveProfileViewport,
  viewportPadding,
  type MapViewport,
} from "./mapViewport";
import type { FarmerProfile } from "@/lib/userAuth/types";
import {
  loadGoogleMaps,
  type MapsSDK,
  type MapsData,
  type MapsInstance,
} from "./googleMaps";
import type {
  DashboardFarm,
  DashboardMapHandle,
  MapType,
  MapView,
  FarmDataState,
} from "./dashboardTypes";

interface Props {
  ref?: Ref<DashboardMapHandle>;
  farms: readonly DashboardFarm[];
  farmerId: number | null;
  profile?: FarmerProfile | null;
  authReady: boolean;
  farmsStatus: FarmDataState["status"];
  viewport: { width: number; height: number };
  sidebarWidth?: number;
  automaticViewportBlocked?: boolean;
  selectedFarmId: number | null;
  mapType: MapType;
  initialView?: MapView;
  onSelect: (id: number) => void;
  onReady: (ready: boolean) => void;
  bottomPadding?: number;
}
interface Resources {
  sdk: MapsSDK;
  map: MapsInstance;
  farms: MapsData;
  location: MapsData;
}

export default function DashboardMap({
  ref,
  farms,
  farmerId,
  profile,
  authReady,
  farmsStatus,
  viewport,
  sidebarWidth = 0,
  automaticViewportBlocked = false,
  selectedFarmId,
  mapType,
  initialView,
  onSelect,
  onReady,
  bottomPadding = 0,
}: Props) {
  const t = useTranslations("farmerDashboard.map");
  const locale = useLocale();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const element = useRef<HTMLDivElement>(null);
  const resources = useRef<Resources | null>(null);
  const initial = useRef({
    locale,
    view: initialView ?? DEFAULT_MAP_VIEW,
    mapType,
    farmerId,
    restored: Boolean(initialView),
  });
  const locating = useRef(false);
  const lifecycle = useRef({
    owner: farmerId,
    framed: Boolean(initialView),
    manual: Boolean(initialView),
    profile: "",
  });
  const request = useRef(0);
  const positions = useMemo(() => farms.flatMap(farmPositions), [farms]);
  const village = profile?.village ?? null;
  const districtName = profile?.district?.name ?? null;
  const stateName = profile?.state?.name ?? null;
  const pincode = profile?.pincode ?? null;
  const queries = useMemo(
    () =>
      profileLocationQueries({
        village,
        pincode,
        district: { name: districtName },
        state: { name: stateName },
      }),
    [village, districtName, stateName, pincode],
  );
  const profileKey = JSON.stringify([
    profile?.state_id ?? null,
    profile?.district_id ?? null,
    queries,
  ]);
  const view = useRef({
    panelHeight: bottomPadding,
    viewport: { ...viewport, sidebarWidth, rtl: false } as MapViewport,
    blocked: automaticViewportBlocked,
    owner: farmerId,
    authReady,
    farmsStatus,
    profileKey,
    hasFarms: positions.length > 0,
  });
  const alive = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "missing"
  >(apiKey ? "loading" : "missing");
  const [generation, setGeneration] = useState<Resources | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [popupRequest, setPopupRequest] = useState(0);
  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;
  const anchor = useMemo(
    () => (selectedFarm ? farmAnchor(selectedFarm) : null),
    [selectedFarm],
  );
  useEffect(() => {
    startTransition(() => setPopupDismissed(false));
  }, [selectedFarmId, farmerId]);
  const closePopup = useCallback(() => setPopupDismissed(true), []);
  function reopenPopup() {
    setPopupDismissed(false);
    setPopupRequest((value) => value + 1);
  }
  useEffect(() => {
    view.current = {
      panelHeight: bottomPadding,
      viewport: {
        ...viewport,
        sidebarWidth,
        rtl: document.documentElement.dir === "rtl",
      },
      blocked: automaticViewportBlocked,
      owner: farmerId,
      authReady,
      farmsStatus,
      profileKey,
      hasFarms: positions.length > 0,
    };
  }, [
    bottomPadding,
    viewport,
    sidebarWidth,
    automaticViewportBlocked,
    farmerId,
    authReady,
    farmsStatus,
    profileKey,
    positions,
  ]);

  useEffect(() => {
    if (!apiKey) return;
    let disposed = false;
    alive.current = true;
    async function initialize() {
      try {
        const sdk = await loadGoogleMaps(apiKey!, initial.current.locale);
        if (disposed || !element.current) return;
        const map = new sdk.Map(element.current, {
          center: initial.current.view.center,
          zoom: initial.current.view.zoom,
          mapTypeId: initial.current.mapType,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          keyboardShortcuts: true,
        });
        resources.current = {
          sdk,
          map,
          farms: new sdk.Data({ map }),
          location: new sdk.Data({ map }),
        };
        lifecycle.current = {
          owner: initial.current.farmerId,
          framed: initial.current.restored,
          manual: initial.current.restored,
          profile: "",
        };
        setStatus("ready");
        setGeneration(resources.current);
        onReady(true);
      } catch {
        if (!disposed) {
          setStatus("error");
          onReady(false);
        }
      }
    }
    function authenticationError() {
      if (!disposed) {
        setStatus("error");
        onReady(false);
      }
    }
    window.addEventListener("krishi-maps-auth-error", authenticationError);
    void initialize();
    return () => {
      disposed = true;
      alive.current = false;
      window.removeEventListener("krishi-maps-auth-error", authenticationError);
      const current = resources.current;
      if (current) {
        cancelViewportAdjustment(current.map);
        current.farms.setMap(null);
        current.location.setMap(null);
        current.sdk.event.clearInstanceListeners(current.farms);
        current.sdk.event.clearInstanceListeners(current.location);
        current.sdk.event.clearInstanceListeners(current.map);
      }
      resources.current = null;
    };
  }, [apiKey, attempt, onReady]);

  useEffect(() => {
    resources.current?.map.setMapTypeId(mapType);
  }, [mapType, generation]);

  useEffect(() => {
    const current = resources.current;
    if (!current) return;
    current.farms.forEach((feature) => current.farms.remove(feature));
    const features = farms
      .map(farmFeature)
      .filter((feature): feature is object => feature !== null);
    if (features.length)
      current.farms.addGeoJson({ type: "FeatureCollection", features });
    const listener = current.farms.addListener("click", ({ feature }) => {
      const id = feature.getId();
      const farm = farms.find((record) => String(record.id) === String(id));
      if (farm && !view.current.blocked) {
        reopenPopup();
        onSelect(farm.id);
      }
    });
    return () => listener.remove();
  }, [farms, generation, onSelect]);

  function stopAutomaticViewport() {
    lifecycle.current.manual = true;
    lifecycle.current.framed = true;
    request.current++;
    if (resources.current) cancelViewportAdjustment(resources.current.map);
  }
  const applyProfileViewport = useCallback(
    (
      current: Resources,
      result: NonNullable<Awaited<ReturnType<typeof resolveProfileViewport>>>,
    ) => {
      const settings = view.current;
      const padding = viewportPadding(settings.panelHeight, settings.viewport);
      if (!padding || settings.blocked) return false;
      if (result.bounds)
        fitViewportBounds(current.map, result.bounds, padding, result.zoom);
      else
        return centerMapPosition(
          current.map,
          result.position,
          result.zoom,
          settings.panelHeight,
          settings.viewport,
        );
      return true;
    },
    [],
  );
  useEffect(() => {
    const current = resources.current;
    if (!current) return;
    if (lifecycle.current.owner !== farmerId) {
      lifecycle.current = {
        owner: farmerId,
        framed: false,
        manual: false,
        profile: "",
      };
      request.current++;
      cancelViewportAdjustment(current.map);
      current.map.panTo(DEFAULT_MAP_VIEW.center);
      current.map.setZoom(DEFAULT_MAP_VIEW.zoom);
    }
    const life = lifecycle.current;
    if (automaticViewportBlocked) cancelViewportAdjustment(current.map);
    if (life.profile !== profileKey) {
      life.profile = profileKey;
      request.current++;
      if (!life.manual && !positions.length) life.framed = false;
    }
    if (
      !authReady ||
      status !== "ready" ||
      farmerId === null ||
      farmsStatus !== "ready" ||
      automaticViewportBlocked ||
      !viewportPadding(bottomPadding, view.current.viewport) ||
      life.manual ||
      life.framed
    )
      return;
    if (positions.length) {
      life.framed = fitMapPositions(
        current.sdk,
        current.map,
        positions,
        bottomPadding,
        view.current.viewport,
      );
      return;
    }
    if (!queries.length) {
      life.framed = true;
      return;
    }
    let active = true;
    const id = request.current;
    const isCurrent = () =>
      active &&
      request.current === id &&
      resources.current === current &&
      view.current.owner === farmerId &&
      view.current.authReady &&
      view.current.farmsStatus === "ready" &&
      !view.current.hasFarms &&
      !view.current.blocked;
    void resolveProfileViewport(current.sdk, queries, isCurrent).then(
      (result) => {
        if (isCurrent())
          life.framed = result ? applyProfileViewport(current, result) : true;
      },
    );
    return () => {
      active = false;
    };
  }, [
    farmerId,
    authReady,
    farmsStatus,
    positions,
    profileKey,
    queries,
    generation,
    status,
    automaticViewportBlocked,
    bottomPadding,
    viewport.width,
    viewport.height,
    sidebarWidth,
    applyProfileViewport,
  ]);

  useEffect(() => {
    const current = resources.current;
    if (!current) return;
    current.farms.setStyle((feature) => {
      const id = Number(feature.getId());
      const selected = id === selectedFarmId;
      const name = feature.getProperty("name");
      return {
        fillColor: selected ? DEFAULT_FARM_COLOR : farmMapColor(id),
        fillOpacity: selected ? 0.55 : 0.25,
        strokeColor: farmMapColor(id, selected),
        strokeWeight: selected ? 4 : 2,
        zIndex: selected ? 2 : 1,
        clickable: true,
        editable: false,
        draggable: false,
        title: typeof name === "string" ? name : undefined,
        label: typeof name === "string" ? name : undefined,
      };
    });
  }, [selectedFarmId, farms, generation]);

  function focusRecords(records: readonly DashboardFarm[]) {
    const current = resources.current;
    if (!current) return;
    stopAutomaticViewport();
    const positions = records.flatMap(farmPositions);
    if (!positions.length) {
      toast(t("noCoordinates"));
      return;
    }
    fitMapPositions(
      current.sdk,
      current.map,
      positions,
      view.current.panelHeight,
      view.current.viewport,
    );
  }
  useImperativeHandle(ref, () => ({
    zoom(delta) {
      stopAutomaticViewport();
      const map = resources.current?.map;
      if (map)
        map.setZoom(Math.min(21, Math.max(2, (map.getZoom() ?? 5) + delta)));
    },
    fitAll() {
      const current = resources.current;
      if (
        !current ||
        !authReady ||
        farmsStatus !== "ready" ||
        view.current.blocked ||
        !viewportPadding(view.current.panelHeight, view.current.viewport)
      )
        return;
      stopAutomaticViewport();
      if (positions.length) {
        focusRecords(farms);
        return;
      }
      const id = request.current;
      const isCurrent = () =>
        request.current === id &&
        resources.current === current &&
        view.current.owner === farmerId &&
        view.current.profileKey === profileKey &&
        view.current.authReady &&
        view.current.farmsStatus === "ready" &&
        !view.current.hasFarms &&
        !view.current.blocked;
      void resolveProfileViewport(current.sdk, queries, isCurrent).then(
        (result) => {
          if (
            isCurrent() &&
            (!result || !applyProfileViewport(current, result))
          )
            toast(t("noCoordinates"));
        },
      );
    },
    focus(farm) {
      reopenPopup();
      focusRecords([farm]);
    },
    getView() {
      const map = resources.current?.map;
      const center = map?.getCenter();
      return center
        ? {
            center: { lat: center.lat(), lng: center.lng() },
            zoom: map?.getZoom() ?? 5,
          }
        : null;
    },
    resetLayers() {
      const layer = resources.current?.location;
      layer?.forEach((feature) => layer.remove(feature));
    },
    locate() {
      if (!resources.current || locating.current) return;
      stopAutomaticViewport();
      if (!navigator.geolocation) {
        toast.error(t("locationUnsupported"));
        return;
      }
      locating.current = true;
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          locating.current = false;
          const current = resources.current;
          const point = { lat: coords.latitude, lng: coords.longitude };
          if (!alive.current || !current || !isMapPosition(point)) return;
          current.location.forEach((feature) =>
            current.location.remove(feature),
          );
          current.location.addGeoJson({
            type: "Feature",
            geometry: { type: "Point", coordinates: [point.lng, point.lat] },
            properties: {},
          });
          current.location.setStyle({
            clickable: false,
            icon: {
              path: current.sdk.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: getComputedStyle(document.documentElement)
                .getPropertyValue("--color-blue-light-500")
                .trim(),
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 3,
            },
          });
          current.map.panTo(point);
          current.map.setZoom(16);
        },
        (error) => {
          locating.current = false;
          if (alive.current)
            toast.error(
              t(
                error.code === 1
                  ? "locationDenied"
                  : error.code === 3
                    ? "locationTimeout"
                    : "locationUnavailable",
              ),
            );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    },
  }));

  return (
    <section
      aria-label={t("label")}
      className="bg-success-50 absolute inset-0 dark:bg-gray-950"
    >
      <div
        ref={element}
        className="absolute inset-0"
        onPointerDownCapture={stopAutomaticViewport}
        onWheelCapture={stopAutomaticViewport}
        onKeyDownCapture={(event) => {
          if (
            [
              "ArrowUp",
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "+",
              "-",
              "=",
              "PageUp",
              "PageDown",
              "Home",
              "End",
            ].includes(event.key)
          )
            stopAutomaticViewport();
        }}
      />
      {generation && status === "ready" && (
        <FarmInfoOverlay
          key={farmerId}
          sdk={generation.sdk}
          map={generation.map}
          farm={selectedFarm}
          areaLabel={selectedFarm?.areaLabel}
          anchor={anchor}
          open={!popupDismissed && authReady && Boolean(selectedFarm && anchor)}
          blocked={automaticViewportBlocked}
          request={popupRequest}
          viewport={{ ...viewport, sidebarWidth }}
          panelHeight={bottomPadding}
          onClose={closePopup}
        />
      )}
      {status !== "ready" && (
        <div className="from-success-50 to-success-100 dark:to-success-950 absolute inset-0 flex items-center justify-center bg-linear-to-br via-gray-50 p-6 dark:from-gray-900 dark:via-gray-950">
          <div className="shadow-theme-lg max-w-md rounded-3xl border border-white/80 bg-white/90 p-7 text-center dark:border-gray-700 dark:bg-gray-900/95">
            <LocationPinIcon
              aria-hidden="true"
              className="text-success-700 dark:text-success-400 mx-auto mb-4 size-12"
            />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t(status === "loading" ? "loading" : "unavailable")}
            </h1>
            <p
              role={status === "loading" ? "status" : "alert"}
              className="mt-3 text-sm text-gray-600 dark:text-gray-300"
            >
              {t(
                status === "loading"
                  ? "loadingDescription"
                  : "unavailableDescription",
              )}
            </p>
            {status === "error" && (
              <button
                type="button"
                onClick={() => {
                  setStatus("loading");
                  setAttempt((value) => value + 1);
                }}
                className="bg-success-700 focus-visible:outline-success-700 mt-5 rounded-xl px-5 py-2.5 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {t("retry")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
