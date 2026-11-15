const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const areaFixture = require("./helpers/areaUnits.cjs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const base = "src/app/[locale]/(account)/account/(protected)/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(file, dependencies = {}, globals = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    URL,
    URLSearchParams,
    Event,
    ...globals,
    require(name) {
      if (name === "react/jsx-runtime") return jsx;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (Object.hasOwn(areaFixture.dependencies, name))
        return areaFixture.dependencies[name];
      throw new Error(`Unexpected dependency ${name} in ${file}`);
    },
  });
  return mod.exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const t = (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key);
const intl = { useTranslations: () => t, useLocale: () => "en" };
const icons = new Proxy({}, { get: (_, key) => String(key) });
const moduleConfig = load(base + "../_config/accountModules.ts", {
  "@/icons": icons,
});
const state = load(base + "dashboardState.ts");
const geometry = load(base + "farmGeometry.ts");
const mapStyle = load("src/components/common/maps/farmMapStyle.ts");
const googleMaps = load(base + "googleMaps.ts");
const viewport = load(base + "mapViewport.ts", {
  "./farmGeometry": geometry,
  "./googleMaps": googleMaps,
});
const ring = [
  [77, 26],
  [77.02, 26],
  [77.02, 26.02],
  [77, 26.02],
  [77, 26],
];
const hole = [
  [77.005, 26.005],
  [77.005, 26.01],
  [77.01, 26.01],
  [77.005, 26.005],
];
const farms = [
  {
    id: 1,
    name: "Test polygon",
    boundary: { type: "Polygon", coordinates: [ring, hole] },
    location: null,
    areaLabel: "Backend area",
    locationLabel: "Backend location",
  },
  {
    id: 2,
    name: "Test marker",
    boundary: null,
    location: { lat: 27, lng: 78 },
  },
  { id: 3, name: "No location", boundary: null, location: null },
];

test("initial interaction state excludes route state and starts with closed sidebar/FAB and satellite", () => {
  assert.deepEqual(clone(state.initialDashboardState), {
    sidebarOpen: false,
    panelHeight: null,
    fabOpen: false,
    selectedFarmId: null,
    mapType: "satellite",
  });
});
test("navigation closes sidebar/FAB without losing selection, map type or panel height", () => {
  let current = state.initialDashboardState;
  current = state.dashboardReducer(current, { type: "resize", height: 420 });
  current = state.dashboardReducer(current, { type: "select-farm", id: 1 });
  current = state.dashboardReducer(current, { type: "sidebar", open: true });
  assert.equal(current.sidebarOpen, true);
  current = state.dashboardReducer(current, { type: "sidebar", open: false });
  current = state.dashboardReducer(current, {
    type: "map-type",
    mapType: "satellite",
  });
  current = state.dashboardReducer(current, { type: "fab", open: true });
  current = state.dashboardReducer(current, { type: "navigate" });
  assert.equal(current.sidebarOpen, false);
  assert.equal(current.panelHeight, 420);
  assert.equal(current.selectedFarmId, 1);
  assert.equal(current.mapType, "satellite");
  assert.equal(current.fabOpen, false);
  assert.equal(Object.hasOwn(current, "activeModule"), false);
  assert.equal(Object.hasOwn(current, "panelOpen"), false);
});
test("map-only actions preserve selection; panel visibility and active module are resolved from exact routes", () => {
  let current = {
    ...state.initialDashboardState,
    selectedFarmId: 2,
    fabOpen: true,
  };
  current = state.dashboardReducer(current, {
    type: "map-type",
    mapType: "satellite",
  });
  assert.equal(current.selectedFarmId, 2);
  assert.equal(current.fabOpen, false);
  current = state.dashboardReducer(current, { type: "fab", open: true });
  current = state.dashboardReducer(current, {
    type: "navigate",
  });
  assert.equal(current.fabOpen, false);
  assert.equal(
    moduleConfig.resolveAccountRoute("/account/profile").mode,
    "panel",
  );
  assert.equal(
    moduleConfig.resolveAccountRoute("/account/dashboard").mode,
    "panel",
  );
});
test("all list routes resolve through one configuration, while nested creation/detail routes use full-page mode", () => {
  for (const [id, definition] of moduleConfig.accountModuleEntries) {
    const route = moduleConfig.resolveAccountRoute(definition.href + "/");
    assert.equal(route.activeModule, id);
    assert.equal(route.mode, "panel");
    assert.equal(route.titleKey, definition.titleKey);
    if (id !== "dashboard") {
      assert.equal(
        moduleConfig.resolveAccountRoute(definition.href + "/new").mode,
        "full-page",
      );
      assert.equal(
        moduleConfig.resolveAccountRoute(definition.href + "/123").mode,
        "full-page",
      );
    }
  }
  assert.deepEqual(
    clone(moduleConfig.resolveAccountRoute("/account/farms-extra")),
    { mode: "full-page", activeModule: null, titleKey: null },
  );
});
test("panel defaults, keyboard limits and viewport changes keep its height within the visible viewport", () => {
  assert.equal(
    state.panelHeightForViewport(state.initialDashboardState, 1000, 1200),
    350,
  );
  assert.equal(
    state.panelHeightForViewport(state.initialDashboardState, 1000, 400),
    400,
  );
  assert.equal(state.clampPanelHeight(20, 800), 200);
  assert.equal(state.clampPanelHeight(900, 800), 800);
  assert.equal(state.clampPanelHeight(400, 150), 150);
  assert.equal(
    state.panelHeightForViewport(
      { ...state.initialDashboardState, panelHeight: 800 },
      500,
      400,
    ),
    500,
  );
});
test("GeoJSON preserves Polygon holes and every MultiPolygon component without modifying stored coordinates", () => {
  const multi = {
    ...farms[0],
    boundary: { type: "MultiPolygon", coordinates: [[ring, hole], [ring]] },
  };
  const before = JSON.stringify(multi);
  assert.equal(geometry.isFarmGeometry(multi.boundary), true);
  assert.deepEqual(clone(geometry.farmFeature(multi).geometry), multi.boundary);
  const points = geometry.farmPositions(multi);
  assert.equal(points.length, ring.length * 2 + hole.length);
  assert.deepEqual(clone(points[0]), { lat: 26, lng: 77 });
  assert.equal(JSON.stringify(multi), before);
});
test("invalid and absent geometry never creates invented locations; valid location-only farms become Points", () => {
  for (const value of [
    null,
    { type: "Point", coordinates: [77, 26] },
    { type: "Polygon", coordinates: [] },
    {
      type: "Polygon",
      coordinates: [
        [
          [77, 26],
          [77, 27],
          [78, 27],
          [79, 29],
        ],
      ],
    },
    {
      type: "Polygon",
      coordinates: [
        [
          [181, 26],
          [77, 27],
          [78, 27],
          [181, 26],
        ],
      ],
    },
  ])
    assert.equal(geometry.isFarmGeometry(value), false);
  assert.equal(geometry.farmFeature(farms[2]), null);
  assert.deepEqual(clone(geometry.farmPositions(farms[2])), []);
  assert.deepEqual(clone(geometry.farmFeature(farms[1]).geometry), {
    type: "Point",
    coordinates: [78, 27],
  });
  assert.equal(geometry.isMapPosition({ lat: 0, lng: 0 }), true);
  assert.equal(geometry.isMapPosition({ lat: NaN, lng: 1 }), false);
});

function sdkDouble({ geocode } = {}) {
  const calls = {
    maps: [],
    data: [],
    fits: [],
    pans: [],
    zooms: [],
    types: [],
    eventsCleared: 0,
    info: [],
    geocodes: [],
    mapEvents: [],
  };
  class Bounds {
    constructor() {
      this.points = [];
    }
    extend(point) {
      this.points.push(point);
      return this;
    }
    getCenter() {
      return { lat: () => this.points[0].lat, lng: () => this.points[0].lng };
    }
  }
  class MapSDK {
    constructor(element, options) {
      this.center = options.center;
      this.zoom = options.zoom;
      calls.maps.push({ element, options, instance: this });
    }
    setMapTypeId(type) {
      calls.types.push(type);
    }
    setZoom(value) {
      this.zoom = value;
      calls.zooms.push(value);
    }
    getZoom() {
      return this.zoom;
    }
    getCenter() {
      return { lat: () => this.center.lat, lng: () => this.center.lng };
    }
    panTo(point) {
      this.center = point;
      calls.pans.push(point);
    }
    panBy(x, y) {
      calls.pans.push({ x, y });
    }
    fitBounds(bounds, padding) {
      calls.fits.push({ points: clone(bounds.points), padding });
    }
    addListener(event, callback) {
      const entry = { event, callback, active: true };
      calls.mapEvents.push(entry);
      return {
        remove: () => {
          entry.active = false;
        },
      };
    }
  }
  class Data {
    constructor() {
      this.features = [];
      this.additions = 0;
      this.removed = 0;
      calls.data.push(this);
    }
    addGeoJson(input) {
      this.additions++;
      const features =
        input.type === "FeatureCollection" ? input.features : [input];
      this.features.push(
        ...features.map((feature) => ({
          getId: () => feature.id,
          getProperty: (key) => feature.properties[key],
          source: feature,
        })),
      );
      return this.features;
    }
    forEach(callback) {
      [...this.features].forEach(callback);
    }
    remove(feature) {
      this.features = this.features.filter((value) => value !== feature);
    }
    setStyle(style) {
      this.style = style;
    }
    setMap(map) {
      this.map = map;
    }
    addListener(_event, callback) {
      this.click = callback;
      return { remove: () => this.removed++ };
    }
  }
  class InfoWindow {
    setContent(content) {
      calls.info.push(content);
    }
    setPosition() {}
    open() {}
    close() {}
  }
  const sdk = {
    Map: MapSDK,
    Data,
    LatLngBounds: Bounds,
    InfoWindow,
    SymbolPath: { CIRCLE: 0 },
    importLibrary: async () => ({
      Geocoder: class {
        geocode(request) {
          calls.geocodes.push(clone(request));
          return geocode ? geocode(request) : Promise.resolve({ results: [] });
        }
      },
    }),
    event: { clearInstanceListeners: () => calls.eventsCleared++ },
  };
  return { sdk, calls };
}
test("Fit All handles zero, single and multiple farm positions and pads above the management panel", () => {
  const { sdk, calls } = sdkDouble();
  const map = new sdk.Map({}, { center: { lat: 1, lng: 1 }, zoom: 5 });
  assert.equal(viewport.fitMapPositions(sdk, map, []), false);
  assert.equal(
    viewport.fitMapPositions(sdk, map, [{ lat: 27, lng: 78 }], 300),
    true,
  );
  assert.equal(calls.zooms[0], 16);
  assert.deepEqual(clone(calls.pans[0]), { lat: 27, lng: 78 });
  viewport.fitMapPositions(
    sdk,
    map,
    farms.flatMap(geometry.farmPositions),
    350,
  );
  assert.ok(
    calls.fits[0].points.some((point) => point.lat === 27 && point.lng === 78),
  );
  assert.equal(calls.fits[0].padding.bottom, 382);
});

function storage() {
  const items = new Map();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  };
}
test("locale snapshots contain UI state only, are scoped per Farmer and tolerate unavailable or corrupted storage", () => {
  const sessionStorage = storage();
  const snapshot = load(
    base + "dashboardSnapshot.ts",
    { "./dashboardState": state, "./farmGeometry": geometry },
    { sessionStorage },
  );
  assert.equal(snapshot.readDashboardSnapshot(1), null);
  const ui = {
    ...state.initialDashboardState,
    mapType: "satellite",
    panelHeight: 480,
  };
  snapshot.saveDashboardSnapshot(1, ui, {
    center: { lat: 25, lng: 77 },
    zoom: 13,
  });
  assert.equal(snapshot.readDashboardSnapshot(2), null);
  assert.equal(snapshot.readDashboardSnapshot(1).state.panelHeight, 480);
  assert.equal(snapshot.readDashboardSnapshot(1).view.zoom, 13);
  const saved = JSON.parse([...sessionStorage.items.values()][0]);
  assert.deepEqual(Object.keys(saved), ["state", "view"]);
  assert.equal(Object.hasOwn(saved.state, "activeModule"), false);
  assert.equal(Object.hasOwn(saved.state, "panelOpen"), false);
  snapshot.saveDashboardSnapshot(1, { ...ui, mapType: "roadmap" }, null);
  assert.equal(snapshot.readDashboardSnapshot(1).state.mapType, "roadmap");
  sessionStorage.setItem(snapshot.snapshotKey(1), "malformed");
  assert.equal(snapshot.readDashboardSnapshot(1), null);
  sessionStorage.setItem(
    snapshot.snapshotKey(1),
    JSON.stringify({
      state: { activeModule: "injected", panelHeight: -10, mapType: "invalid" },
      view: { center: { lat: 999, lng: 0 }, zoom: 40 },
    }),
  );
  assert.equal(
    Object.hasOwn(snapshot.readDashboardSnapshot(1).state, "activeModule"),
    false,
  );
  assert.equal(snapshot.readDashboardSnapshot(1).view, null);
  assert.equal(snapshot.readDashboardSnapshot(1).state.mapType, "satellite");
});
test("SDK loader shares one script, uses the official async callback and supports network retry without logging keys", async () => {
  const scripts = [];
  const timers = new Map();
  const window = {
    setTimeout: (fn) => {
      timers.set(timers.size + 1, fn);
      return timers.size;
    },
    clearTimeout: (id) => timers.delete(id),
    dispatchEvent() {},
  };
  const document = {
    createElement: () => ({ remove() {} }),
    head: { append: (script) => scripts.push(script) },
  };
  const loader = load(base + "googleMaps.ts", {}, { window, document });
  const pending = loader.loadGoogleMaps("test-key", "hi");
  assert.equal(loader.loadGoogleMaps("test-key", "hi"), pending);
  assert.equal(scripts.length, 1);
  const url = new URL(scripts[0].src);
  assert.equal(url.origin, "https://maps.googleapis.com");
  assert.equal(url.searchParams.get("loading"), "async");
  assert.equal(url.searchParams.get("language"), "hi");
  const rejected = assert.rejects(pending, /Maps unavailable/);
  scripts[0].onerror();
  await rejected;
  const retried = loader.loadGoogleMaps("test-key", "hi");
  assert.equal(scripts.length, 2);
  const sdk = sdkDouble().sdk;
  window.google = { maps: sdk };
  window.krishiMapsReady();
  assert.equal(await retried, sdk);
  assert.equal(await loader.loadGoogleMaps("test-key", "en"), sdk);
  assert.equal(scripts.length, 2);
  assert.equal(timers.size, 0);
});
test("Maps authentication failures remain isolated and announce a usable error state even after SDK resolution", async () => {
  const events = [];
  const window = {
    setTimeout: () => 1,
    clearTimeout() {},
    dispatchEvent: (event) => events.push(event.type),
  };
  const document = {
    createElement: () => ({ remove() {} }),
    head: { append() {} },
  };
  const loader = load(base + "googleMaps.ts", {}, { window, document });
  const pending = loader.loadGoogleMaps("test-key", "en");
  window.google = { maps: sdkDouble().sdk };
  window.krishiMapsReady();
  await pending;
  window.gm_authFailure();
  assert.deepEqual(events, ["krishi-maps-auth-error"]);
  await assert.rejects(
    loader.loadGoogleMaps("test-key", "en"),
    /authentication/,
  );
});

/** A hook runtime exercises real component handlers and lifecycle effects without a browser or new dependency. */
function hooks() {
  const slots = [];
  let cursor = 0;
  let queued = [];
  function entry() {
    const index = cursor++;
    return [index, slots[index]];
  }
  const changed = (before, after) =>
    !before ||
    !after ||
    before.length !== after.length ||
    after.some((value, index) => value !== before[index]);
  const react = {
    startTransition: (callback) => callback(),
    useState(initial) {
      const [index] = entry();
      if (!(index in slots))
        slots[index] = {
          value: typeof initial === "function" ? initial() : initial,
        };
      return [
        slots[index].value,
        (value) => {
          slots[index].value =
            typeof value === "function" ? value(slots[index].value) : value;
        },
      ];
    },
    useRef(initial) {
      const [index] = entry();
      return (slots[index] ??= { current: initial });
    },
    useReducer(reducer, initial) {
      const [index] = entry();
      if (!(index in slots))
        slots[index] = {
          value: initial,
          dispatch: (action) => {
            slots[index].value = reducer(slots[index].value, action);
          },
        };
      return [slots[index].value, slots[index].dispatch];
    },
    useCallback(fn, deps) {
      const [index, prior] = entry();
      if (!prior || changed(prior.deps, deps)) slots[index] = { fn, deps };
      return slots[index].fn;
    },
    useMemo(factory, deps) {
      const [index, prior] = entry();
      if (!prior || changed(prior.deps, deps))
        slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useEffect(fn, deps) {
      const [index, prior] = entry();
      if (!prior || changed(prior.deps, deps)) {
        queued.push(() => {
          prior?.cleanup?.();
          slots[index] = { deps, effect: fn, cleanup: fn() };
        });
      }
    },
    useImperativeHandle(ref, create) {
      if (ref) ref.current = create();
    },
    Suspense: "Suspense",
  };
  return {
    react,
    render: (Component, props) => {
      cursor = 0;
      return Component(props);
    },
    flush: () => {
      const current = queued;
      queued = [];
      current.forEach((fn) => fn());
    },
    cleanup: () => slots.forEach((slot) => slot?.cleanup?.()),
    replayEffects: () => {
      for (const slot of slots) {
        if (!slot?.effect) continue;
        slot.cleanup?.();
        slot.cleanup = slot.effect();
      }
    },
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function mapHarness({
  apiKey = "test-key",
  failed = false,
  records = farms,
  geocode,
  profile = null,
} = {}) {
  const runtime = hooks();
  const { sdk, calls } = sdkDouble({ geocode });
  const notices = [];
  const events = {};
  const positionRequests = [];
  const window = {
    addEventListener: (name, fn) => {
      events[name] = fn;
    },
    removeEventListener: (name) => delete events[name],
  };
  const document = { documentElement: {}, createElement: () => ({}) };
  const navigator = {
    geolocation: {
      getCurrentPosition: (...args) => positionRequests.push(args),
    },
  };
  const onSelect = (id) => (calls.selected = id);
  const onReady = (ready) => (calls.ready = ready);
  const ref = { current: null };
  const Component = load(
    base + "DashboardMap.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "react-hot-toast": Object.assign((message) => notices.push(message), {
        error: (message) => notices.push(message),
      }),
      "@/icons": icons,
      "./dashboardState": state,
      "./farmGeometry": geometry,
      "@/components/common/maps/farmMapStyle": mapStyle,
      "@/components/common/maps/FarmInfoOverlay": "FarmPopup",
      "./mapViewport": viewport,
      "./googleMaps": {
        ...googleMaps,
        loadGoogleMaps: async () => {
          calls.loads = (calls.loads ?? 0) + 1;
          if (failed) throw Error("offline");
          return sdk;
        },
      },
    },
    {
      window,
      document,
      navigator,
      process: { env: { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: apiKey } },
      getComputedStyle: () => ({ getPropertyValue: (key) => key }),
    },
  ).default;
  const props = {
    ref,
    farms: records,
    farmerId: 4,
    profile,
    authReady: true,
    farmsStatus: "ready",
    viewport: { width: 1200, height: 900 },
    selectedFarmId: null,
    mapType: "roadmap",
    onSelect,
    onReady,
    bottomPadding: 0,
  };
  function render() {
    const tree = runtime.render(Component, props);
    for (const node of nodes(tree))
      if (node.type === "div" && node.props.ref) node.props.ref.current ??= {};
    runtime.flush();
    return tree;
  }
  async function mount() {
    render();
    await tick();
    return render();
  }
  return {
    calls,
    runtime,
    props,
    ref,
    render,
    mount,
    events,
    notices,
    positionRequests,
  };
}
const mapProfile = {
  id: 8,
  state_id: 1,
  district_id: 2,
  village: "Village One",
  district: { id: 2, name: "District One" },
  state: { id: 1, name: "State One" },
  pincode: null,
};
function geocoded({
  level = "village",
  name = "Village One",
  position = { lat: 27, lng: 75 },
  country = "IN",
  stateName = "State One",
  district = "District One",
  partial = false,
} = {}) {
  const type =
    level === "village"
      ? "locality"
      : level === "district"
        ? "administrative_area_level_2"
        : "administrative_area_level_1";
  const part = (name, type) => ({
    long_name: name,
    short_name: name,
    types: [type],
  });
  return {
    types: [type, "political"],
    partial_match: partial,
    geometry: {
      location: { lat: () => position.lat, lng: () => position.lng },
    },
    address_components: [
      part(country, "country"),
      part(stateName, "administrative_area_level_1"),
      part(district, "administrative_area_level_2"),
      ...(level === "village" ? [part(name, "locality")] : []),
    ],
  };
}

test("profile queries use trimmed Redux location names without private address or numeric IDs", () => {
  const profile = {
    ...mapProfile,
    village: "  Village One  ",
    address: "Private residence",
    first_name: "Private name",
    mobile: "private",
    email: "private@example.test",
  };
  const queries = viewport.profileLocationQueries(profile);
  assert.deepEqual(clone(queries.map((q) => q.address)), [
    "Village One, District One, State One, India",
    "District One, State One, India",
    "State One, India",
  ]);
  assert.doesNotMatch(
    JSON.stringify(queries),
    /Private|private@example|state_id|district_id/,
  );
  assert.equal(viewport.profileLocationQueries(null).length, 0);
  assert.equal(viewport.profileLocationQueries({}).length, 0);
  assert.equal(
    viewport.profileLocationQueries({ pincode: "302001" }).length,
    0,
  );
  assert.equal(
    viewport.profileLocationQueries({ state: { name: "India" } }).length,
    0,
  );
  assert.equal(
    viewport.profileLocationQueries({
      ...mapProfile,
      village: "District One",
    })[0].address,
    "District One, State One, India",
  );
});

test("profile resolution validates country, type, partial matches and context before choosing a result", async () => {
  const { sdk, calls } = sdkDouble({
    geocode: async () => ({
      results: [
        geocoded({ country: "US" }),
        geocoded({ stateName: "Other State" }),
        geocoded({ partial: true }),
        geocoded({ level: "state" }),
        geocoded({ position: { lat: NaN, lng: 75 } }),
        geocoded(),
      ],
    }),
  });
  const result = await viewport.resolveProfileViewport(
    sdk,
    viewport.profileLocationQueries(mapProfile),
    () => true,
  );
  assert.deepEqual(clone(result.position), { lat: 27, lng: 75 });
  assert.equal(result.zoom, 15);
  assert.equal(calls.geocodes.length, 1);
  assert.equal(calls.geocodes[0].componentRestrictions.country, "IN");
  assert.equal(calls.geocodes[0].fulfillOnZeroResults, true);
  const hindi = viewport.profileLocationQueries({
    ...mapProfile,
    village: "गाँव",
    district: { name: "जिला" },
    state: { name: "राज्य" },
  })[0];
  assert.equal(viewport.matchingProfileResult(geocoded(), hindi), true);
});

test("ambiguous villages broaden to district, then state, and never claim village zoom for a broad result", async () => {
  for (const [wanted, expectedZoom, expectedCalls] of [
    ["district", 10, 2],
    ["state", 7, 3],
  ]) {
    const { sdk, calls } = sdkDouble({
      geocode: async (request) => ({
        results:
          request.address === "Village One, District One, State One, India"
            ? [geocoded(), geocoded({ position: { lat: 28, lng: 76 } })]
            : request.address.startsWith("District One") &&
                wanted === "district"
              ? [geocoded({ level: "district" })]
              : request.address === "State One, India"
                ? [geocoded({ level: "state" })]
                : [],
      }),
    });
    const result = await viewport.resolveProfileViewport(
      sdk,
      viewport.profileLocationQueries(mapProfile),
      () => true,
    );
    assert.equal(result.zoom, expectedZoom);
    assert.equal(calls.geocodes.length, expectedCalls);
  }
});

test("postal context is used only after the first village lookup fails; unchanged lookups share one request", async () => {
  const { sdk, calls } = sdkDouble({
    geocode: async (request) => ({
      results: request.address.includes("302001") ? [geocoded()] : [],
    }),
  });
  const queries = viewport.profileLocationQueries({
    ...mapProfile,
    pincode: "302001",
  });
  const result = await viewport.resolveProfileViewport(
    sdk,
    queries,
    () => true,
  );
  assert.equal(result.zoom, 15);
  assert.equal(calls.geocodes.length, 2);
  assert.equal(calls.geocodes[0].address.includes("302001"), false);
  await viewport.resolveProfileViewport(sdk, queries, () => true);
  assert.equal(calls.geocodes.length, 2);
  const editor = sdkDouble();
  await googleMaps.geocodeMapAddress(editor.sdk, "Editor location");
  assert.deepEqual(editor.calls.geocodes[0], {
    address: "Editor location",
    region: "IN",
  });
});

test("safe farm coordinate conversion keeps zero and rejects empty, null and non-numeric locations", () => {
  assert.deepEqual(clone(geometry.farmLocation("0.0000", "0.0000")), {
    lat: 0,
    lng: 0,
  });
  for (const value of [
    null,
    undefined,
    "",
    " ",
    NaN,
    Infinity,
    "invalid",
    true,
    {},
  ])
    assert.equal(geometry.farmLocation(value, 75), null);
  assert.equal(geometry.farmLocation("91", "75"), null);
  assert.equal(geometry.farmLocation("27", "181"), null);
});

test("overlay-aware bounds use actual sidebar width, defer covered maps and limit only fitted zoom", () => {
  const { sdk, calls } = sdkDouble();
  const map = new sdk.Map({}, { center: { lat: 27, lng: 75 }, zoom: 5 });
  const area = { width: 1000, height: 800, sidebarWidth: 287 };
  assert.equal(
    viewport.fitMapPositions(
      sdk,
      map,
      [
        { lat: 27, lng: 75 },
        { lat: 28, lng: 76 },
      ],
      750,
      area,
    ),
    false,
  );
  assert.equal(calls.fits.length, 0);
  viewport.fitMapPositions(
    sdk,
    map,
    [
      { lat: 27, lng: 75 },
      { lat: 28, lng: 76 },
    ],
    400,
    area,
  );
  assert.equal(calls.fits[0].padding.left, 351);
  assert.equal(calls.fits[0].padding.bottom, 432);
  map.setZoom(22);
  calls.mapEvents.find((event) => event.active).callback();
  assert.equal(map.getZoom(), 18);
  map.setZoom(20);
  assert.equal(map.getZoom(), 20);
  assert.equal(
    calls.mapEvents.some((event) => event.active),
    false,
  );
  viewport.centerMapPosition(map, { lat: 27, lng: 75 }, 15, 400, area);
  assert.deepEqual(calls.pans.at(-1), { x: -143.5, y: 168 });
  assert.equal(
    viewport.viewportPadding(400, { ...area, rtl: true }).right,
    351,
  );
});

test("initial viewport waits for authentication and saved farms, then fits the complete dataset without geocoding", async () => {
  const h = mapHarness({ records: [], profile: mapProfile });
  h.props.authReady = false;
  h.props.farmsStatus = "loading";
  await h.mount();
  assert.equal(h.calls.geocodes.length, 0);
  h.props.authReady = true;
  h.render();
  assert.equal(h.calls.geocodes.length, 0);
  h.props.farms = farms;
  h.props.farmsStatus = "ready";
  h.render();
  assert.equal(h.calls.fits.length, 1);
  assert.equal(
    h.calls.fits[0].points.length,
    farms.flatMap(geometry.farmPositions).length,
  );
  assert.equal(h.calls.geocodes.length, 0);
  h.props.farms = [...farms];
  h.props.bottomPadding = 400;
  h.render();
  assert.equal(h.calls.fits.length, 1);
  h.runtime.cleanup();
});

test("empty farms center on the Redux village once; profile and location updates respect manual navigation", async () => {
  const h = mapHarness({
    records: [],
    profile: mapProfile,
    geocode: async (request) => ({
      results: [
        geocoded({
          name: request.address.split(",")[0],
          position: {
            lat: request.address.startsWith("Village Two") ? 28 : 27,
            lng: 75,
          },
        }),
      ],
    }),
  });
  await h.mount();
  await tick();
  h.render();
  assert.equal(h.calls.geocodes.length, 1);
  assert.equal(h.calls.zooms.at(-1), 15);
  assert.equal(h.positionRequests.length, 0);
  h.props.profile = {
    ...mapProfile,
    preferred_units: "acre",
    preferred_language: "hi",
    profile_image: "changed",
  };
  h.render();
  await tick();
  assert.equal(h.calls.geocodes.length, 1);
  h.props.profile = { ...mapProfile, village: "Village Two" };
  h.render();
  await tick();
  h.render();
  assert.equal(h.calls.geocodes.length, 2);
  assert.ok(h.calls.pans.some((point) => point.lat === 28));
  h.ref.current.zoom(1);
  h.props.profile = { ...mapProfile, village: "Village Three" };
  h.render();
  await tick();
  assert.equal(h.calls.geocodes.length, 2);
  h.ref.current.fitAll();
  await tick();
  h.render();
  assert.equal(h.calls.geocodes.length, 3);
  assert.equal(h.calls.maps.length, 1);
  h.runtime.cleanup();
});

test("profile failures preserve the default; farm API errors remain pending until successful retry", async () => {
  const failed = mapHarness({
    records: [],
    profile: mapProfile,
    geocode: async () => {
      throw Error("denied");
    },
  });
  await failed.mount();
  await tick();
  failed.render();
  assert.equal(failed.calls.geocodes.length, 1);
  assert.equal(failed.calls.pans.length, 0);
  assert.equal(
    failed.calls.maps[0].instance.getZoom(),
    state.DEFAULT_MAP_VIEW.zoom,
  );
  failed.runtime.cleanup();
  const retry = mapHarness({ records: [], profile: mapProfile });
  retry.props.farmsStatus = "error";
  await retry.mount();
  assert.equal(retry.calls.geocodes.length, 0);
  retry.props.farmsStatus = "ready";
  retry.props.farms = farms;
  retry.render();
  assert.equal(retry.calls.fits.length, 1);
  retry.runtime.cleanup();
});

test("late profile responses cannot override farms that arrive during geocoding", async () => {
  let resolve;
  const h = mapHarness({
    records: [],
    profile: mapProfile,
    geocode: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  await h.mount();
  await tick();
  h.props.farms = farms;
  h.render();
  resolve({ results: [geocoded()] });
  await tick();
  h.render();
  assert.equal(h.calls.fits.length, 1);
  assert.equal(h.calls.pans.length, 0);
  assert.equal(h.calls.geocodes.length, 1);
  h.runtime.cleanup();
});

test("outdated profile and Farmer responses never apply to a newer location or account", async () => {
  const pending = [];
  const h = mapHarness({
    records: [],
    profile: mapProfile,
    geocode: () => new Promise((resolve) => pending.push(resolve)),
  });
  await h.mount();
  await tick();
  h.props.profile = { ...mapProfile, village: "Village Two" };
  h.render();
  await tick();
  pending[1]({
    results: [
      geocoded({ name: "Village Two", position: { lat: 28, lng: 76 } }),
    ],
  });
  await tick();
  h.render();
  pending[0]({ results: [geocoded()] });
  await tick();
  assert.equal(
    h.calls.pans.some((point) => point.lat === 27),
    false,
  );
  assert.equal(
    h.calls.pans.some((point) => point.lat === 28),
    true,
  );
  h.props.farmerId = 5;
  h.props.farmsStatus = "loading";
  h.props.profile = { ...mapProfile, village: "Village Three" };
  h.render();
  assert.equal(h.calls.maps.length, 1);
  assert.deepEqual(
    clone(h.calls.pans.at(-1)),
    clone(state.DEFAULT_MAP_VIEW.center),
  );
  h.props.farmsStatus = "ready";
  h.render();
  await tick();
  h.props.farmerId = null;
  h.props.authReady = false;
  h.render();
  pending[2]({
    results: [
      geocoded({ name: "Village Three", position: { lat: 29, lng: 77 } }),
    ],
  });
  await tick();
  assert.equal(
    h.calls.pans.some((point) => point.lat === 29),
    false,
  );
  h.runtime.cleanup();
});

test("manual pan, wheel, keyboard and zoom controls cancel pending automatic geocoding", async () => {
  for (const input of ["pointer", "wheel", "keyboard", "control"]) {
    let resolve;
    const h = mapHarness({
      records: [],
      profile: mapProfile,
      geocode: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    await h.mount();
    await tick();
    const host = nodes(h.render()).find(
      (node) => node.type === "div" && node.props.ref,
    );
    if (input === "pointer") host.props.onPointerDownCapture();
    else if (input === "wheel") host.props.onWheelCapture();
    else if (input === "keyboard")
      host.props.onKeyDownCapture({ key: "ArrowLeft" });
    else h.ref.current.zoom(1);
    resolve({ results: [geocoded()] });
    await tick();
    h.render();
    assert.equal(h.calls.pans.length, 0, input);
    assert.equal(h.calls.fits.length, 0, input);
    h.runtime.cleanup();
  }
});

test("covered maps and active editors defer initialization without resizing the panel", async () => {
  const h = mapHarness({ profile: mapProfile });
  h.props.bottomPadding = 900;
  await h.mount();
  assert.equal(h.calls.fits.length, 0);
  h.props.bottomPadding = 300;
  h.props.automaticViewportBlocked = true;
  h.render();
  assert.equal(h.calls.fits.length, 0);
  h.props.automaticViewportBlocked = false;
  h.render();
  assert.equal(h.calls.fits.length, 1);
  assert.equal(h.calls.fits[0].padding.bottom, 332);
  h.props.bottomPadding = 900;
  h.render();
  h.props.bottomPadding = 300;
  h.render();
  assert.equal(h.calls.fits.length, 1);
  h.runtime.cleanup();
});

test("an editor opened during profile geocoding defers the result and reuses it when closed", async () => {
  let resolve;
  const h = mapHarness({
    records: [],
    profile: mapProfile,
    geocode: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  await h.mount();
  await tick();
  h.props.automaticViewportBlocked = true;
  h.render();
  resolve({ results: [geocoded()] });
  await tick();
  assert.equal(h.calls.pans.length, 0);
  h.props.automaticViewportBlocked = false;
  h.render();
  await tick();
  h.render();
  assert.equal(h.calls.geocodes.length, 1);
  assert.equal(h.calls.zooms.at(-1), 15);
  h.runtime.cleanup();
});

test("restored locale views and profile changes while farm geography exists preserve the current view", async () => {
  const h = mapHarness({ profile: mapProfile });
  h.props.initialView = { center: { lat: 25, lng: 77 }, zoom: 12 };
  await h.mount();
  h.props.profile = { ...mapProfile, village: "Village Two" };
  h.render();
  await tick();
  assert.equal(h.calls.fits.length, 0);
  assert.equal(h.calls.geocodes.length, 0);
  assert.equal(h.calls.maps[0].instance.getZoom(), 12);
  h.runtime.cleanup();
});

test("Strict Mode effect replay creates one live map and performs one profile lookup", async () => {
  const h = mapHarness({
    records: [],
    profile: mapProfile,
    geocode: async () => ({ results: [geocoded()] }),
  });
  h.render();
  h.runtime.replayEffects();
  await tick();
  h.render();
  await tick();
  h.render();
  assert.equal(h.calls.maps.length, 1);
  assert.equal(h.calls.geocodes.length, 1);
  assert.equal(h.calls.zooms.filter((zoom) => zoom === 15).length, 1);
  h.runtime.cleanup();
});

test("geocoder viewport bounds are fitted with profile accuracy and overlay padding", async () => {
  const result = geocoded();
  const bounds = {
    points: [
      { lat: 27, lng: 75 },
      { lat: 27.01, lng: 75.01 },
    ],
  };
  result.geometry.viewport = bounds;
  const h = mapHarness({
    records: [],
    profile: mapProfile,
    geocode: async () => ({ results: [result] }),
  });
  h.props.bottomPadding = 400;
  h.props.sidebarWidth = 288;
  await h.mount();
  await tick();
  h.render();
  assert.equal(h.calls.fits.length, 1);
  assert.equal(h.calls.fits[0].padding.left, 352);
  assert.equal(h.calls.fits[0].padding.bottom, 432);
  h.calls.maps[0].instance.setZoom(19);
  h.calls.mapEvents.find((event) => event.active).callback();
  assert.equal(h.calls.maps[0].instance.getZoom(), 15);
  h.runtime.cleanup();
});

test("map loads once and stays mounted through panel resizing, module changes and map-type changes", async () => {
  const h = mapHarness();
  await h.mount();
  assert.equal(h.calls.maps.length, 1);
  assert.equal(h.calls.ready, true);
  const additions = h.calls.data[0].additions;
  h.props.bottomPadding = 500;
  h.render();
  h.props.mapType = "satellite";
  h.render();
  assert.equal(h.calls.maps.length, 1);
  assert.equal(h.calls.loads, 1);
  assert.equal(h.calls.data[0].additions, additions);
  assert.equal(h.calls.types.at(-1), "satellite");
  assert.equal(h.calls.fits.length, 1);
  h.runtime.cleanup();
  assert.equal(h.calls.eventsCleared, 3);
  assert.equal(h.calls.data[0].map, null);
});
test("saved farm features select their exact record, highlight it and display its name as text", async () => {
  const h = mapHarness();
  await h.mount();
  const layer = h.calls.data[0];
  assert.equal(layer.features.length, 2);
  layer.click({ feature: layer.features[0] });
  assert.equal(h.calls.selected, 1);
  h.props.selectedFarmId = 1;
  h.render();
  const selectedStyle = layer.style(layer.features[0]);
  const otherStyle = layer.style(layer.features[1]);
  assert.equal(selectedStyle.strokeWeight, 4);
  assert.equal(otherStyle.strokeWeight, 2);
  assert.equal(selectedStyle.editable, false);
  assert.equal(selectedStyle.draggable, false);
  const popup = nodes(h.render()).find((node) => node.type === "FarmPopup");
  assert.equal(popup.props.farm.name, farms[0].name);
  assert.equal(popup.props.open, true);
});

test("closing preserves farm selection and the same polygon or list focus reopens the single shared popup", async () => {
  const h = mapHarness();
  await h.mount();
  const popup = () =>
    nodes(h.render()).find((node) => node.type === "FarmPopup");
  h.props.selectedFarmId = 1;
  h.render();
  popup().props.onClose();
  h.render();
  assert.equal(popup().props.open, false);
  assert.equal(h.props.selectedFarmId, 1);
  assert.equal(
    h.calls.data[0].style(h.calls.data[0].features[0]).strokeWeight,
    4,
  );
  h.calls.data[0].click({ feature: h.calls.data[0].features[0] });
  h.render();
  assert.equal(popup().props.open, true);
  popup().props.onClose();
  h.render();
  h.ref.current.focus(farms[0]);
  h.render();
  assert.equal(popup().props.open, true);
  h.props.selectedFarmId = 2;
  h.render();
  assert.equal(popup().props.farm.id, 2);
  assert.deepEqual(clone(popup().props.anchor), farms[1].location);
  assert.equal(
    nodes(h.render()).filter((node) => node.type === "FarmPopup").length,
    1,
  );
  assert.equal(h.calls.loads, 1);
  assert.equal(
    h.calls.info.length,
    0,
    "native Google popup is replaced completely",
  );
  h.runtime.cleanup();
});

test("saved-farm selection and popup visibility defer to the existing drawing/fullscreen workflow", async () => {
  const h = mapHarness();
  await h.mount();
  h.props.selectedFarmId = 1;
  h.props.automaticViewportBlocked = true;
  h.render();
  h.calls.data[0].click({ feature: h.calls.data[0].features[1] });
  assert.equal(h.calls.selected, undefined);
  let popup = nodes(h.render()).find((node) => node.type === "FarmPopup");
  assert.equal(popup.props.blocked, true);
  assert.equal(popup.props.farm.id, 1);
  h.props.authReady = false;
  h.render();
  popup = nodes(h.render()).find((node) => node.type === "FarmPopup");
  assert.equal(popup.props.open, false);
  h.runtime.cleanup();
});
test("map focus and zoom controls operate without modifying farm data", async () => {
  const h = mapHarness();
  await h.mount();
  const before = JSON.stringify(farms);
  h.ref.current.zoom(100);
  assert.equal(h.calls.zooms.at(-1), 21);
  h.ref.current.zoom(-100);
  assert.equal(h.calls.zooms.at(-1), 2);
  h.ref.current.focus(farms[1]);
  assert.equal(h.calls.zooms.at(-1), 16);
  h.ref.current.focus(farms[2]);
  assert.equal(h.notices.at(-1), "noCoordinates");
  assert.ok(h.ref.current.getView());
  assert.equal(JSON.stringify(farms), before);
});
test("one explicit geolocation request handles success, denial and timeout without touching farm geometry", async () => {
  const h = mapHarness();
  await h.mount();
  h.ref.current.locate();
  h.ref.current.locate();
  assert.equal(h.positionRequests.length, 1);
  assert.equal(h.positionRequests[0][2].timeout, 10000);
  h.positionRequests[0][0]({ coords: { latitude: 25, longitude: 75 } });
  assert.deepEqual(clone(h.calls.pans.at(-1)), { lat: 25, lng: 75 });
  assert.equal(h.calls.data[0].features.length, 2);
  assert.equal(h.calls.data[1].features.length, 1);
  h.ref.current.resetLayers();
  assert.equal(h.calls.data[1].features.length, 0);
  assert.equal(h.calls.data[0].features.length, 2);
  h.ref.current.locate();
  h.positionRequests[1][1]({ code: 1 });
  assert.equal(h.notices.at(-1), "locationDenied");
  h.ref.current.locate();
  h.positionRequests[2][1]({ code: 3 });
  assert.equal(h.notices.at(-1), "locationTimeout");
  h.ref.current.locate();
  h.runtime.cleanup();
  const panCount = h.calls.pans.length;
  h.positionRequests[3][0]({ coords: { latitude: 1, longitude: 1 } });
  assert.equal(h.calls.pans.length, panCount);
});
test("missing key, network error and authentication error do not crash the map component", async () => {
  const missing = mapHarness({ apiKey: "" });
  const tree = await missing.mount();
  assert.equal(missing.calls.maps.length, 0);
  assert.ok(nodes(tree).some((node) => node.props?.role === "alert"));
  const failed = mapHarness({ failed: true });
  await failed.mount();
  assert.equal(failed.calls.ready, false);
  assert.equal(failed.calls.maps.length, 0);
  const valid = mapHarness();
  await valid.mount();
  valid.events["krishi-maps-auth-error"]();
  const errorTree = valid.render();
  assert.equal(valid.calls.ready, false);
  assert.ok(nodes(errorTree).some((node) => node.props?.role === "alert"));
});

function resizeHarness() {
  const runtime = hooks();
  const resized = [];
  const frames = new Map();
  let index = 0;
  const Component = load(
    base + "AccountPanelResizeHandle.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "@/icons": icons,
      "./dashboardState": state,
    },
    {
      requestAnimationFrame: (fn) => {
        frames.set(++index, fn);
        return index;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
  ).default;
  const props = {
    height: 350,
    maximum: 800,
    onResize: (height) => resized.push(height),
  };
  function render() {
    const tree = runtime.render(Component, props);
    runtime.flush();
    return tree;
  }
  const captured = new Set();
  const target = {
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
  };
  const pointer = (y, id = 1, extras = {}) => ({
    isPrimary: true,
    button: 0,
    pointerId: id,
    clientY: y,
    currentTarget: target,
    preventDefault() {},
    stopPropagation() {},
    ...extras,
  });
  return { runtime, render, props, resized, frames, pointer, captured };
}
test("mouse and touch dragging resize only from the handle, enforce limits and flush the last pointer on release", () => {
  const h = resizeHarness();
  const handle = h.render();
  handle.props.onPointerDown(h.pointer(500));
  assert.equal(h.captured.has(1), true);
  handle.props.onPointerMove(h.pointer(200));
  assert.equal(h.frames.size, 1);
  handle.props.onPointerMove(h.pointer(100));
  assert.equal(h.frames.size, 1);
  handle.props.onPointerUp(h.pointer(100));
  assert.equal(h.resized.at(-1), 750);
  assert.equal(h.frames.size, 0);
  assert.equal(h.captured.size, 0);
  handle.props.onPointerDown(h.pointer(500, 2));
  handle.props.onPointerMove(h.pointer(-1000, 2));
  handle.props.onPointerCancel(h.pointer(-1000, 2));
  assert.equal(h.resized.at(-1), 800);
  handle.props.onPointerDown(h.pointer(500, 3));
  handle.props.onPointerMove(h.pointer(1500, 3));
  handle.props.onPointerUp(h.pointer(1500, 3));
  assert.equal(h.resized.at(-1), 200);
  h.runtime.cleanup();
  assert.equal(h.frames.size, 0);
});
test("resize keyboard commands reach minimum and full viewport; secondary pointers cannot hijack dragging", () => {
  const h = resizeHarness();
  const handle = h.render();
  for (const [key, expected] of [
    ["ArrowUp", 382],
    ["ArrowDown", 318],
    ["Home", 200],
    ["End", 800],
  ]) {
    handle.props.onKeyDown({ key, preventDefault() {}, stopPropagation() {} });
    assert.equal(h.resized.at(-1), expected);
  }
  handle.props.onPointerDown(h.pointer(500, 4, { isPrimary: false }));
  handle.props.onPointerMove(h.pointer(100, 4));
  assert.equal(h.frames.size, 0);
  assert.equal(handle.props.role, "separator");
  assert.equal(handle.props["aria-controls"], "account-panel-content");
  h.props.height = 800;
  assert.ok(h.render().props.className.includes("top-1"));
});
test("panel has no header; its persistent toggle hides and reopens content independently of the resize handle", () => {
  const runtime = hooks();
  let toggled = 0;
  const Component = load(base + "AccountBottomPanel.tsx", {
    react: runtime.react,
    "next-intl": intl,
    "@/icons": icons,
    "./AccountPanelResizeHandle": "Resize",
  }).default;
  const props = {
    collapsed: false,
    height: 800,
    maximum: 800,
    onResize() {},
    onToggle: () => toggled++,
    children: "records",
  };
  let tree = runtime.render(Component, props);
  const scroller = nodes(tree).find(
    (node) => node.props?.id === "account-panel-content",
  );
  assert.match(scroller.props.className, /overflow-y-auto/);
  assert.match(scroller.props.className, /overscroll-contain/);
  assert.equal(
    nodes(scroller).some(
      (node) => node.type === "header" || node.type === "Resize",
    ),
    false,
  );
  assert.equal(
    nodes(tree).some((node) => node.type === "header" || node.type === "h2"),
    false,
  );
  let toggle = nodes(tree).find((node) => node.type === "button");
  assert.equal(toggle.props["aria-expanded"], true);
  toggle.props.onClick();
  props.collapsed = true;
  tree = runtime.render(Component, props);
  assert.equal(
    nodes(tree).find((node) => node.type === "section").props.hidden,
    true,
  );
  assert.equal(
    nodes(tree).find((node) => node.props?.id === "account-panel-content").props
      .children,
    "records",
  );
  toggle = nodes(tree).find((node) => node.type === "button");
  assert.equal(toggle.props["aria-expanded"], false);
  assert.equal(toggle.props["aria-label"], "open");
  toggle.props.onClick();
  props.collapsed = false;
  tree = runtime.render(Component, props);
  assert.equal(
    nodes(tree).find((node) => node.type === "section").props.hidden,
    false,
  );
  assert.equal(toggled, 2);
});

function shellHarness({ farmState, loadWorkspace, loadSummary } = {}) {
  const runtime = hooks();
  const sessionStorage = storage();
  const events = {};
  const routes = [];
  const notices = [];
  let pathname = "/account/dashboard";
  const window = {
    innerHeight: 900,
    innerWidth: 1200,
    addEventListener: (name, fn) => (events[name] = fn),
    removeEventListener: (name) => delete events[name],
  };
  const snapshots = load(
    base + "dashboardSnapshot.ts",
    { "./dashboardState": state, "./farmGeometry": geometry },
    { sessionStorage },
  );
  const user = {
    id: 4,
    first_name: "Actual",
    last_name: "Farmer",
    mobile: "9876543210",
    email: null,
  };
  const auth = { user, isAuthenticated: true, isLoading: false };
  const Component = load(
    base + "AccountDashboardShell.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "react-hot-toast": (message) => notices.push(message),
      "@/hooks/useUserAuth": {
        useUserAuth: () => auth,
      },
      "@/i18n/navigation": {
        usePathname: () => pathname,
        useRouter: () => ({ push: (path) => routes.push(path) }),
      },
      "@/components/common/AccountLanguageSwitcher": "Language",
      "@/actions/account/farms": {
        getFarmerFarmSummary: loadSummary ?? (async () => ({ success: false })),
        getFarmWorkspace:
          loadWorkspace ??
          (async () => ({
            success: true,
            data: { farms: [], summary: null },
          })),
      },
      "./AccountFarmContext": {
        AccountFarmContext: { Provider: "FarmWorkspace" },
      },
      "../farms/_components/AddFarmDialog": "FarmDialog",
      "@/components/common/maps/FarmBoundaryDialog": "BoundaryDialog",
      "@/icons": icons,
      "./DashboardMap": "Map",
      "./AccountSidebar": "Sidebar",
      "./AccountBottomPanel": "Panel",
      "./AccountFloatingActions": "Fab",
      "../_config/accountModules": moduleConfig,
      "./dashboardState": state,
      "./dashboardSnapshot": snapshots,
      "./farmGeometry": geometry,
    },
    { window, sessionStorage, requestAnimationFrame: (fn) => fn() },
  ).default;
  const props = { children: null, farmState };
  let initialTree;
  const render = () => {
    let tree = runtime.render(Component, props);
    initialTree ??= tree;
    runtime.flush();
    tree = runtime.render(Component, props);
    runtime.flush();
    return tree;
  };
  return {
    render,
    get initialTree() {
      return initialTree;
    },
    runtime,
    events,
    window,
    notices,
    sessionStorage,
    routes,
    auth,
    props,
    visit(path, children = null) {
      pathname = path;
      props.children = children;
      return render();
    },
  };
}
test("shared shell passes Redux profile and readiness without additional profile or region requests", async () => {
  let calls = 0;
  const h = shellHarness({
    loadWorkspace: async () => {
      calls++;
      return { success: true, data: { farms: [], summary: null } };
    },
  });
  h.auth.user = { ...h.auth.user, farmer_profile: mapProfile };
  let tree = h.visit("/account/profile");
  let map = nodes(tree).find((node) => node.type === "Map");
  assert.equal(map.props.profile, mapProfile);
  assert.equal(map.props.farmerId, 4);
  assert.equal(map.props.farmsStatus, "loading");
  await tick();
  tree = h.render();
  map = nodes(tree).find((node) => node.type === "Map");
  assert.equal(map.props.farmsStatus, "ready");
  h.auth.user = {
    ...h.auth.user,
    farmer_profile: { ...mapProfile, village: "Village Two" },
  };
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.profile.village,
    "Village Two",
  );
  h.auth.isLoading = true;
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.authReady,
    false,
  );
  assert.equal(calls, 1);
  h.runtime.cleanup();
});

test("preference changes refresh only the summary, ignore unrelated Redux updates and discard older-unit responses", async () => {
  let workspaceCalls = 0;
  const requests = [];
  const farm = {
    id: 12,
    name: "Saved",
    area: "4.000",
    area_unit: "bigha_pakka",
    latitude: "26",
    longitude: "77",
  };
  const summary = (value, unit) => ({
    total_farms: 1,
    total_land_area: { value, unit, conversion_available: true },
  });
  const h = shellHarness({
    loadWorkspace: async () => {
      workspaceCalls++;
      return {
        success: true,
        data: { farms: [farm], summary: summary("4.000", "bigha_pakka") },
      };
    },
    loadSummary: () => new Promise((resolve) => requests.push(resolve)),
  });
  h.auth.user = {
    ...h.auth.user,
    farmer_profile: { preferred_units: "bigha_pakka" },
  };
  h.render();
  await tick();
  let tree = h.render();
  const workspace = () =>
    nodes(h.render()).find((node) => node.type === "FarmWorkspace").props.value;
  const mapFarms = nodes(tree).find((node) => node.type === "Map").props.farms;
  assert.equal(workspace().summary.total_land_area.unit, "bigha_pakka");
  h.auth.user = {
    ...h.auth.user,
    first_name: "Changed",
    farmer_profile: {
      ...h.auth.user.farmer_profile,
      village: "Changed village",
    },
  };
  h.render();
  assert.equal(requests.length, 0);
  h.auth.user.farmer_profile = {
    ...h.auth.user.farmer_profile,
    preferred_units: "hectare",
  };
  h.render();
  assert.equal(requests.length, 1);
  assert.equal(workspace().summary, null);
  assert.equal(workspace().summaryStatus, "loading");
  h.auth.user.farmer_profile = {
    ...h.auth.user.farmer_profile,
    preferred_units: "acre",
  };
  h.render();
  assert.equal(requests.length, 2);
  requests[1]({ success: true, data: summary("2.500", "acre") });
  await tick();
  assert.equal(workspace().summary.total_land_area.unit, "acre");
  requests[0]({ success: true, data: summary("1.012", "hectare") });
  await tick();
  assert.equal(workspace().summary.total_land_area.unit, "acre");
  assert.equal(workspaceCalls, 1);
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.farms,
    mapFarms,
  );
  assert.equal(farm.area_unit, "bigha_pakka");
  h.runtime.cleanup();
});

test("summary refresh failures preserve the workspace and retry only the current preference", async () => {
  let workspaceCalls = 0,
    summaryCalls = 0;
  const h = shellHarness({
    loadWorkspace: async () => {
      workspaceCalls++;
      return {
        success: true,
        data: {
          farms: [],
          summary: { total_land_area: { value: "0.000", unit: "hectare" } },
        },
      };
    },
    loadSummary: async () => {
      summaryCalls++;
      return summaryCalls === 1
        ? { success: false }
        : {
            success: true,
            data: { total_land_area: { value: "0.000", unit: "acre" } },
          };
    },
  });
  h.render();
  await tick();
  h.render();
  h.auth.user.farmer_profile = { preferred_units: "acre" };
  h.render();
  await tick();
  const workspace = () =>
    nodes(h.render()).find((node) => node.type === "FarmWorkspace").props.value;
  assert.equal(workspace().status, "ready");
  assert.equal(workspace().summaryStatus, "error");
  assert.equal(summaryCalls, 1);
  workspace().refreshSummary();
  h.render();
  await tick();
  assert.equal(workspace().summaryStatus, "ready");
  assert.equal(workspace().summary.total_land_area.unit, "acre");
  assert.equal(workspaceCalls, 1);
  h.runtime.cleanup();
});

test("workspace farm responses are scoped to their Farmer and late old-account responses are ignored", async () => {
  const pending = [];
  const h = shellHarness({
    loadWorkspace: () => new Promise((resolve) => pending.push(resolve)),
  });
  h.render();
  h.auth.user = { ...h.auth.user, id: 5 };
  let tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.farms.length,
    0,
  );
  pending[0]({
    success: true,
    data: {
      farms: [
        {
          id: 40,
          name: "Old Farmer's farm",
          area_unit: "ha",
          latitude: "27",
          longitude: "75",
        },
      ],
      summary: null,
    },
  });
  await tick();
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.farms.length,
    0,
  );
  pending[1]({
    success: true,
    data: {
      farms: [
        {
          id: 50,
          name: "New Farmer's farm",
          area_unit: "ha",
          latitude: "",
          longitude: "75",
        },
      ],
      summary: null,
    },
  });
  await tick();
  tree = h.render();
  const records = nodes(tree).find((node) => node.type === "Map").props.farms;
  assert.equal(records[0].id, 50);
  assert.equal(records[0].location, null);
  h.runtime.cleanup();
});

test("sidebar padding measures its actual panel and all farm/boundary dialogs block automatic movement", () => {
  const h = shellHarness({ farmState: { status: "ready", farms } });
  let tree = h.render();
  const sidebar = nodes(tree).find((node) => node.type === "Sidebar");
  sidebar.props.panelRef({
    getBoundingClientRect: () => ({ width: 279 }),
  });
  nodes(tree)
    .find(
      (node) =>
        node.type === "button" && node.props["aria-label"] === "openSidebar",
    )
    .props.onClick();
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.sidebarWidth,
    279,
  );
  nodes(tree)
    .find((node) => node.type === "Sidebar")
    .props.onClose();
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.sidebarWidth,
    0,
  );
  nodes(tree)
    .find((node) => node.type === "Fab")
    .props.onDrawFarm();
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props
      .automaticViewportBlocked,
    true,
  );
  nodes(tree)
    .find((node) => node.type === "BoundaryDialog")
    .props.onClose();
  tree = h.render();
  nodes(tree)
    .find((node) => node.type === "FarmWorkspace")
    .props.value.openFarm();
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props
      .automaticViewportBlocked,
    true,
  );
  nodes(tree)
    .find((node) => node.type === "FarmDialog")
    .props.onClose();
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props
      .automaticViewportBlocked,
    false,
  );
  tree = h.visit("/account/farms/create");
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props
      .automaticViewportBlocked,
    true,
  );
  h.runtime.cleanup();
});

test("route content renders before browser initialization; locale state restores before the map mounts", () => {
  const h = shellHarness();
  const view = { center: { lat: 25, lng: 77 }, zoom: 13 };
  h.sessionStorage.setItem(
    "krishi-dashboard-locale:4",
    JSON.stringify({
      state: {
        ...state.initialDashboardState,
        panelHeight: 480,
        selectedFarmId: 2,
        mapType: "satellite",
      },
      view,
    }),
  );
  const cropPage = jsx.jsx("p", { children: "Crop route content" });
  let tree = h.visit("/account/crops", cropPage);
  const initial = nodes(h.initialTree);
  assert.equal(
    initial.find((node) => node.type === "Panel").props.children,
    cropPage,
  );
  assert.equal(
    initial.find((node) => node.type === "Map"),
    undefined,
  );
  assert.ok(initial.some((node) => node.props?.role === "status"));
  const map = nodes(tree).find((node) => node.type === "Map");
  assert.deepEqual(clone(map.props.initialView), view);
  assert.equal(map.props.mapType, "satellite");
  assert.equal(map.props.selectedFarmId, 2);
  assert.equal(
    nodes(tree).find((node) => node.type === "Panel").props.height,
    480,
  );
  assert.equal(h.sessionStorage.getItem("krishi-dashboard-locale:4"), null);
  h.runtime.replayEffects();
  tree = h.render();
  const restoredMap = nodes(tree).find((node) => node.type === "Map");
  assert.deepEqual(clone(restoredMap.props.initialView), view);
  assert.equal(restoredMap.props.mapType, "satellite");
  assert.equal(restoredMap.props.selectedFarmId, 2);
  assert.equal(
    nodes(tree).find((node) => node.type === "Panel").props.height,
    480,
  );
  h.window.innerHeight = 400;
  h.events.resize();
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Panel").props.height,
    400,
  );
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.onSelect,
    map.props.onSelect,
  );
  h.runtime.cleanup();
  assert.equal(Object.keys(h.events).length, 0);
});

test("shell renders real route children in one shared panel and retains height, map and selection across navigation", () => {
  const h = shellHarness();
  let tree = h.render();
  const get = (type) => nodes(tree).find((node) => node.type === type);
  assert.equal(get("Sidebar").props.open, false);
  assert.equal(get("Panel").props.collapsed, false);
  assert.equal(Object.hasOwn(get("Panel").props, "title"), false);
  assert.equal(get("Panel").props.children, null);
  assert.equal(typeof get("Panel").props.onToggle, "function");
  assert.equal(get("Fab").props.open, false);
  const mapType = get("Map").type;
  assert.equal(get("Map").props.mapType, "satellite");
  get("Fab").props.onMapType("roadmap");
  tree = h.render();
  assert.equal(get("Map").props.mapType, "roadmap");
  get("Fab").props.onReset();
  tree = h.render();
  assert.equal(get("Map").props.mapType, "satellite");
  const mapSelect = get("Map").props.onSelect;
  const height = get("Panel").props.height;
  get("Panel").props.onToggle();
  tree = h.render();
  assert.equal(get("Panel").props.collapsed, true);
  assert.equal(get("Map").props.bottomPadding, 0);
  assert.equal(get("Map").type, mapType);
  assert.equal(h.routes.length, 0);
  assert.equal(get("Fab").props.bottom, 48);
  get("Panel").props.onToggle();
  tree = h.render();
  assert.equal(get("Panel").props.collapsed, false);
  assert.equal(get("Panel").props.height, height);
  assert.equal(h.routes.length, 0);
  get("Sidebar").props.onNavigate("farm-manager");
  assert.equal(h.routes.at(-1), "/account/farms");
  tree = h.render();
  assert.equal(get("Panel").props.children, null); // Route children change after navigation commits.
  const farmPage = jsx.jsx("FarmPlaceholder", {});
  tree = h.visit("/account/farms", farmPage);
  assert.equal(get("Panel").props.collapsed, false);
  assert.equal(get("Panel").props.children, farmPage);
  get("Panel").props.onResize(600);
  tree = h.render();
  assert.equal(get("Panel").props.height, 600);
  get("Sidebar").props.onNavigate("crop-manager");
  assert.equal(h.routes.at(-1), "/account/crops");
  const cropPage = jsx.jsx("Crops", {});
  tree = h.visit("/account/crops", cropPage);
  assert.equal(get("Panel").props.height, 600);
  assert.equal(get("Panel").props.collapsed, false);
  assert.equal(get("Panel").props.children, cropPage);
  assert.equal(get("Map").type, mapType);
  assert.equal(get("Map").props.onSelect, mapSelect);
  tree = h.visit("/account/farms", farmPage); // Browser Back.
  assert.equal(get("Panel").props.children, farmPage);
  tree = h.visit("/account/crops", cropPage); // Browser Forward.
  assert.equal(get("Panel").props.children, cropPage);
  const navigationCount = h.routes.length;
  get("Panel").props.onToggle();
  tree = h.render();
  assert.equal(get("Panel").props.collapsed, true);
  assert.equal(get("Panel").props.children, cropPage);
  assert.equal(h.routes.length, navigationCount);
  get("Panel").props.onToggle();
  tree = h.render();
  assert.equal(get("Panel").props.collapsed, false);
  assert.equal(get("Panel").props.children, cropPage);
  assert.equal(get("Panel").props.height, 600);
  get("Sidebar").props.onNavigate("profile");
  assert.equal(h.routes.at(-1), "/account/profile");
  const profile = jsx.jsx("Profile", {});
  tree = h.visit("/account/profile", profile);
  assert.equal(get("Panel").props.children, profile);
  assert.equal(get("Panel").props.height, 600);
  get("Sidebar").props.onNavigate("dashboard");
  tree = h.visit("/account/dashboard");
  assert.equal(get("Panel").props.collapsed, false);
  assert.equal(get("Panel").props.children, null);
  assert.equal(get("Map").type, mapType);
  get("Fab").props.onAddFarm();
  assert.equal(h.routes.at(-1), "/account/farms");
  tree = h.visit("/account/farms", farmPage);
  assert.equal(get("Panel").props.collapsed, false);
  h.window.innerHeight = 450;
  h.events.resize();
  tree = h.render();
  assert.equal(get("Panel").props.height, 450);
  assert.equal(get("Fab").props.availableHeight, 0);
});
test("nested full-page workflows bypass the panel without unmounting the persistent map", () => {
  const h = shellHarness();
  let tree = h.visit("/account/farms", jsx.jsx("FarmPlaceholder", {}));
  const map = nodes(tree).find((node) => node.type === "Map");
  const workflow = jsx.jsx("FutureFarmEditor", {});
  tree = h.visit("/account/farms/new", workflow);
  assert.equal(
    nodes(tree).some((node) => node.type === "Panel"),
    false,
  );
  assert.equal(
    nodes(tree).find((node) => node.type === "main").props.children,
    workflow,
  );
  assert.equal(nodes(tree).find((node) => node.type === "Map").type, map.type);
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.onSelect,
    map.props.onSelect,
  );
});

test("dashboard boundary entry transfers the confirmed draft into Add Farm without replacing the map or saving", () => {
  const h = shellHarness();
  let tree = h.render();
  const originalMap = nodes(tree).find((n) => n.type === "Map");
  nodes(tree)
    .find((n) => n.type === "Fab")
    .props.onDrawFarm();
  tree = h.render();
  const editor = nodes(tree).find((n) => n.type === "BoundaryDialog");
  assert.ok(editor);
  assert.equal(
    nodes(tree).some((n) => n.type === "FarmDialog"),
    false,
  );
  const draft = {
    boundary: { type: "MultiPolygon", coordinates: [[ring]] },
    boundary_source: "manual",
    gps_accuracy_m: null,
  };
  editor.props.onConfirm(draft);
  tree = h.render();
  assert.equal(
    nodes(tree).find((n) => n.type === "FarmDialog").props.initialBoundary,
    draft,
  );
  assert.equal(
    nodes(tree).some((n) => n.type === "BoundaryDialog"),
    false,
  );
  assert.equal(
    nodes(tree).find((n) => n.type === "Map").type,
    originalMap.type,
  );
  assert.equal(
    nodes(tree).find((n) => n.type === "Map").props.mapType,
    originalMap.props.mapType,
  );
  assert.equal(h.routes.at(-1), "/account/farms");
  h.runtime.cleanup();
});
test("map selection opens the Farms route once and retains map selection and geometry", () => {
  const before = JSON.stringify(farms);
  const h = shellHarness({ farmState: { status: "ready", farms } });
  let tree = h.render();
  const focused = [];
  nodes(tree).find((node) => node.type === "Map").props.ref.current = {
    focus: (farm) => focused.push(farm.id),
  };
  nodes(tree)
    .find((node) => node.type === "Map")
    .props.onSelect(1);
  assert.equal(h.routes.at(-1), "/account/farms");
  assert.deepEqual(focused, []);
  tree = h.visit("/account/farms", jsx.jsx("FarmPlaceholder", {}));
  assert.deepEqual(focused, [1]);
  const map = nodes(tree).find((node) => node.type === "Map");
  assert.equal(map.props.selectedFarmId, 1);
  const count = h.routes.length;
  map.props.onSelect(2);
  tree = h.render();
  assert.equal(h.routes.length, count);
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.selectedFarmId,
    2,
  );
  assert.deepEqual(focused, [1, 2]);
  assert.equal(JSON.stringify(farms), before);
});
test("Crop and Employee modules use a feature-free placeholder; Profile reads actual Farmer data", () => {
  const runtime = hooks();
  const user = {
    first_name: "Actual",
    last_name: "Farmer",
    mobile: "9876543210",
    email: null,
  };
  const Profile = load(base + "../profile/_components/ProfileDetails.tsx", {
    "next-intl": intl,
    "@/hooks/useUserAuth": { useUserAuth: () => ({ user }) },
    "@/hooks/useModal": {
      useModal: () => ({ isOpen: false, openModal() {}, closeModal() {} }),
    },
    "@/icons": icons,
    "./UpdateProfileDialog": "UpdateProfileDialog",
  }).default;
  const profile = runtime.render(Profile, {});
  assert.ok(
    nodes(profile).some((node) => node.props?.children === "Actual Farmer"),
  );
  assert.ok(nodes(profile).some((node) => node.props?.children === "empty"));
  const Unavailable = load(base + "AccountModuleUnavailable.tsx", {
    "next-intl": intl,
    "@/icons": icons,
    "../_config/accountModules": moduleConfig,
  }).default;
  for (const moduleId of ["crop-manager", "employees"]) {
    const soon = runtime.render(Unavailable, { module: moduleId });
    assert.ok(
      nodes(soon).some((node) =>
        String(node.props?.children).startsWith("comingSoon:"),
      ),
    );
    assert.equal(
      nodes(soon).some((node) =>
        ["input", "button", "table", "dl"].includes(node.type),
      ),
      false,
    );
  }
});
test("sidebar uses the central module metadata, highlights the current route and keeps the real Farmer header", () => {
  const runtime = hooks();
  const selected = [];
  const Component = load(base + "AccountSidebar.tsx", {
    react: runtime.react,
    "next-intl": intl,
    "react-hot-toast": { success() {}, error() {} },
    "@headlessui/react": {
      Dialog: "Dialog",
      DialogPanel: "DialogPanel",
      DialogBackdrop: "DialogBackdrop",
      DialogTitle: "DialogTitle",
    },
    "@/actions/account/auth": { logoutUser: async () => ({ success: true }) },
    "@/hooks/useUserAuth": {
      useUserAuth: () => ({
        user: {
          first_name: "Actual",
          last_name: "Farmer",
          mobile: "9876543210",
          email: null,
        },
        resetAuth() {},
        isLoading: false,
      }),
    },
    "@/i18n/navigation": { useRouter: () => ({ replace() {}, refresh() {} }) },
    "@/icons": icons,
    "../_config/accountModules": moduleConfig,
  }).default;
  const tree = runtime.render(Component, {
    open: true,
    activeModule: "farm-manager",
    onClose() {},
    onNavigate: (id) => selected.push(id),
  });
  assert.ok(
    nodes(tree).some((node) => node.props?.children === "Actual Farmer"),
  );
  assert.ok(nodes(tree).some((node) => node.props?.children === "9876543210"));
  const active = nodes(tree).find(
    (node) => node.props?.["aria-current"] === "page",
  );
  assert.ok(
    nodes(active).some(
      (node) => node.props?.children === "modules.farm-manager",
    ),
  );
  for (const [id, definition] of moduleConfig.accountModuleEntries) {
    const button = nodes(tree).find(
      (node) =>
        node.type === "button" &&
        nodes(node).some(
          (child) => child.props?.children === definition.titleKey,
        ),
    );
    assert.ok(button);
    button.props.onClick();
    assert.equal(selected.at(-1), id);
  }
});
test("the remaining module pages return their own content without another panel, map, resize handle or auth provider", async () => {
  const locales = [];
  for (const [path, expected, moduleId] of [
    ["crops", "Unavailable", "crop-manager"],
    ["irrigation", "Unavailable", "irrigation"],
    ["machinery", "Unavailable", "machinery"],
    ["employees", "Unavailable", "employees"],
    ["profile", "ProfileDetails", "profile"],
  ]) {
    const Page = load(base + `../${path}/page.tsx`, {
      "next-intl/server": {
        setRequestLocale: (locale) => locales.push(locale),
        getTranslations: async () => t,
      },
      "./_components/ProfileDetails": "ProfileDetails",
      "../_components/AccountModuleUnavailable": "Unavailable",
    }).default;
    const tree = await Page({ params: Promise.resolve({ locale: "hi" }) });
    const content = nodes(tree).find((node) => node.type === expected);
    assert.ok(content);
    if (path !== "profile")
      assert.equal(
        nodes(tree).find((node) => node.type === "h2").props.children,
        `modules.${moduleId}`,
      );
    if (expected === "Unavailable")
      assert.equal(content.props.module, moduleId);
    assert.equal(locales.at(-1), "hi");
    const source = fs.readFileSync(base + `../${path}/page.tsx`, "utf8");
    assert.doesNotMatch(
      source,
      /AccountBottomPanel|DashboardMap|ResizeHandle|UserAuthBoundary/,
    );
  }
});
test("Farm Manager page loads its localized backend listing and renders the feature client", async () => {
  const locales = [];
  const filters = [];
  const result = { status: true, data: [], pagination: { current_page: 1 } };
  const previews = {};
  const Page = load(base + "../farms/page.tsx", {
    "next-intl/server": {
      setRequestLocale: (locale) => locales.push(locale),
      getTranslations: async () => t,
    },
    "next/navigation": { unstable_rethrow() {} },
    "@/components/common/maps/farmStaticMap.server": {
      signedFarmSatelliteSources: (farms) => {
        assert.equal(farms, result.data);
        return previews;
      },
    },
    "@/lib/apis/account/farms": {
      accountFarmsAPI: {
        list: async (value) => {
          filters.push(value);
          return result;
        },
      },
    },
    "./_components/FarmManager": "FarmManager",
    "./_components/farmFilters": load(
      base + "../farms/_components/farmFilters.ts",
    ),
  }).default;
  const tree = await Page({ params: Promise.resolve({ locale: "hi" }) });
  const client = nodes(tree).find((node) => node.type === "FarmManager");
  assert.ok(client);
  assert.equal(filters.length, 1);
  assert.equal(filters[0].page, 1);
  assert.equal(filters[0].per_page, 15);
  assert.equal(filters[0].include_boundary, 1);
  assert.equal(client.props.initialData, result);
  assert.equal(client.props.initialSatellitePreviews, previews);
  assert.deepEqual(locales, ["hi"]);
});
test("module loading and error content stay inside the route panel; current Next.js retry leaves the shell mounted", () => {
  let retried = 0;
  const ErrorPage = load(base + "../error.tsx", { "next-intl": intl }).default;
  const error = ErrorPage({ retry: () => retried++ });
  assert.equal(error.props.role, "alert");
  nodes(error)
    .find((node) => node.type === "button")
    .props.onClick();
  assert.equal(retried, 1);
  const Loading = load(base + "../loading.tsx", { "next-intl": intl }).default;
  const loading = Loading();
  assert.equal(loading.props.role, "status");
  const h = shellHarness();
  let tree = h.visit("/account/employees", loading);
  const map = nodes(tree).find((node) => node.type === "Map");
  assert.equal(
    nodes(tree).find((node) => node.type === "Panel").props.children,
    loading,
  );
  tree = h.visit("/account/employees", error);
  assert.equal(
    nodes(tree).find((node) => node.type === "Panel").props.children,
    error,
  );
  assert.equal(
    nodes(tree).find((node) => node.type === "Map").props.onSelect,
    map.props.onSelect,
  );
});
test("language switching keeps the current module URL and saves only interaction/map state", () => {
  const h = shellHarness();
  let tree = h.visit("/account/crops", jsx.jsx("Crops", {}));
  nodes(tree)
    .find((node) => node.type === "Panel")
    .props.onResize(440);
  tree = h.render();
  const before = nodes(tree).find((node) => node.type === "Language").props
    .onBeforeChange;
  const replacements = [];
  const Switcher = load("src/components/common/AccountLanguageSwitcher.tsx", {
    react: { useTransition: () => [false, (fn) => fn()] },
    "next-intl": intl,
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("tab=all"),
    },
    "@/i18n/navigation": {
      usePathname: () => "/account/crops",
      useRouter: () => ({ replace: (...args) => replacements.push(args) }),
    },
  }).default;
  const languageTree = Switcher({ onBeforeChange: before });
  nodes(languageTree)
    .find((node) => node.props?.lang === "hi")
    .props.onClick();
  assert.deepEqual(clone(replacements), [
    ["/account/crops?tab=all", { locale: "hi" }],
  ]);
  const snapshot = JSON.parse([...h.sessionStorage.items.values()][0]);
  assert.equal(snapshot.state.panelHeight, 440);
  assert.equal(Object.hasOwn(snapshot.state, "activeModule"), false);
  assert.equal(Object.hasOwn(snapshot.state, "panelOpen"), false);
});
test("floating actions collapse on outside click/Escape, avoid full-height panels and isolate map-only actions", () => {
  const runtime = hooks();
  const listeners = {};
  let toggled;
  let type;
  let added = 0;
  class Node {}
  const Component = load(
    base + "AccountFloatingActions.tsx",
    { react: runtime.react, "next-intl": intl, "@/icons": icons },
    {
      Node,
      document: {
        addEventListener: (name, fn) => (listeners[name] = fn),
        removeEventListener: (name) => delete listeners[name],
      },
    },
  ).default;
  const props = {
    open: true,
    mapType: "roadmap",
    mapReady: true,
    availableHeight: 600,
    bottom: 24,
    onToggle: (value) => (toggled = value),
    onMapType: (value) => (type = value),
    onAddFarm: () => added++,
    onDrawFarm() {},
    onLocate() {},
    onFit() {},
    onReset() {},
  };
  let tree = runtime.render(Component, props);
  runtime.flush();
  listeners.keydown({ key: "Escape" });
  assert.equal(toggled, false);
  listeners.pointerdown({ target: new Node() });
  assert.equal(toggled, false);
  nodes(tree)
    .find(
      (node) =>
        nodes(node).some(
          (child) =>
            child.type === "span" && child.props.children === "satellite",
        ) && node.type === "button",
    )
    .props.onClick();
  assert.equal(type, "satellite");
  assert.equal(added, 0);
  props.availableHeight = 100;
  tree = runtime.render(Component, props);
  assert.equal(tree, null);
  runtime.cleanup();
  assert.equal(Object.keys(listeners).length, 0);
});
test("protected layout renders the Dashboard page inside the shared panel; public auth routes remain separate", async () => {
  const layout = fs.readFileSync(
    "src/app/[locale]/(account)/account/(protected)/layout.tsx",
    "utf8",
  );
  assert.equal((layout.match(/<UserAuthBoundary>/g) || []).length, 1);
  assert.match(layout, /<AccountDashboardClient>/);
  const Dashboard = load(
    "src/app/[locale]/(account)/account/(protected)/dashboard/page.tsx",
    {
      "next-intl/server": {
        setRequestLocale() {},
        getTranslations: async () => t,
      },
      "./_components/DashboardSummary": "DashboardSummary",
      "./_components/DashboardCropTimeline": "DashboardCropTimeline",
    },
  ).default;
  const dashboard = await Dashboard({
    params: Promise.resolve({ locale: "hi" }),
  });
  assert.equal(
    nodes(dashboard).find((node) => node.type === "h2").props.children,
    "modules.dashboard",
  );
  assert.ok(nodes(dashboard).some((node) => node.type === "DashboardSummary"));
  assert.ok(
    nodes(dashboard).some((node) => node.type === "DashboardCropTimeline"),
  );
  const h = shellHarness();
  const tree = h.visit("/account/dashboard", dashboard);
  assert.equal(
    nodes(tree).find((node) => node.type === "Panel").props.children,
    dashboard,
  );
  assert.equal(
    fs.existsSync("src/app/[locale]/(account)/account/dashboard/page.tsx"),
    false,
  );
  const card = fs.readFileSync(
    "src/components/common/AccountAuthCard.tsx",
    "utf8",
  );
  assert.match(card, /smart-farming-landscape\.png/);
  for (const route of ["login", "register", "reset-password"])
    assert.equal(
      fs.existsSync(`src/app/[locale]/(account)/account/${route}/page.tsx`),
      true,
    );
});

test("static Dashboard renders the reference statistics, three crop timelines and localized progress without backend data", async () => {
  const { createTranslator } = require("next-intl");
  for (const locale of ["en", "hi"]) {
    const messages = JSON.parse(
      fs.readFileSync(`src/messages/${locale}.json`, "utf8"),
    );
    const translation = {
      getTranslations: async (namespace) =>
        createTranslator({ locale, messages, namespace }),
    };
    const Summary = load(
      base + "../dashboard/_components/DashboardSummary.tsx",
      {
        "next-intl/server": translation,
        "@/icons": icons,
      },
    ).default;
    const summary = await Summary();
    assert.deepEqual(
      nodes(summary)
        .filter((node) => node.type === "dd")
        .map((node) => node.props.children),
      [12, 18, 6, 4, 8],
    );
    assert.equal(nodes(summary).filter((node) => node.type === "dt").length, 5);
    const Timeline = load(
      base + "../dashboard/_components/DashboardCropTimeline.tsx",
      {
        "next-intl/server": translation,
        "next/image": "Image",
        "@/icons": icons,
        "@/i18n/navigation": { Link: "Link" },
        "../../_config/accountModules": moduleConfig,
      },
    ).default;
    const timeline = await Timeline();
    const articles = nodes(timeline).filter((node) => node.type === "article");
    assert.equal(articles.length, 3);
    for (const [index, crop] of ["wheat", "soybean", "maize"].entries()) {
      const row = articles[index];
      assert.equal(
        nodes(row).find((node) => node.type === "h4").props.children,
        messages.farmerDashboard.cropTimeline.crops[crop].name,
      );
      assert.equal(nodes(row).filter((node) => node.type === "li").length, 5);
      const active = nodes(row).filter(
        (node) => node.props?.["aria-current"] === "step",
      );
      assert.equal(active.length, 1);
      assert.ok(
        fs.existsSync(
          "public" + nodes(row).find((node) => node.type === "Image").props.src,
        ),
      );
    }
    const link = nodes(timeline).find((node) => node.type === "Link");
    assert.equal(link.props.href, "/account/crops");
    assert.equal(
      nodes(timeline).some((node) => typeof node.props?.onClick === "function"),
      false,
    );
    if (locale === "en")
      assert.ok(
        nodes(timeline).some(
          (node) =>
            node.type === "span" &&
            String(node.props?.children) === "10 Jan 2025",
        ),
      );
  }
});

test("protected route children render on the server without a browser-only parent bailout", () => {
  const React = require("react");
  const { renderToString } = require("react-dom/server");
  const Shell = load(base + "AccountDashboardShell.tsx", {
    "./farmGeometry": geometry,
    react: React,
    "next-intl": intl,
    "react-hot-toast": () => {},
    "@/hooks/useUserAuth": { useUserAuth: () => ({ user: { id: 4 } }) },
    "@/i18n/navigation": {
      usePathname: () => "/account/crops",
      useRouter: () => ({ push() {} }),
    },
    "@/components/common/AccountLanguageSwitcher": () => null,
    "@/actions/account/farms": {
      getFarmWorkspace: async () => ({
        success: true,
        data: { farms: [], summary: null },
      }),
    },
    "./AccountFarmContext": { AccountFarmContext: React.createContext(null) },
    "../farms/_components/AddFarmDialog": () => null,
    "@/components/common/maps/FarmBoundaryDialog": () => null,
    "@/icons": icons,
    "./DashboardMap": () => {
      throw new Error("Map must wait for browser state restoration");
    },
    "./AccountSidebar": () => null,
    "./AccountBottomPanel": ({ children }) => jsx.jsx("section", { children }),
    "./AccountFloatingActions": () => null,
    "../_config/accountModules": moduleConfig,
    "./dashboardState": state,
    "./dashboardSnapshot": {
      readDashboardSnapshot() {
        throw new Error("Storage must not be read during server rendering");
      },
    },
  }).default;
  const Client = load(base + "AccountDashboardClient.tsx", {
    "next/dynamic": require("next/dynamic"),
    "next-intl": intl,
    "./AccountDashboardShell": Shell,
  }).default;
  const html = renderToString(
    jsx.jsx(Client, {
      children: jsx.jsx("p", { children: "Crop route server content" }),
    }),
  );
  assert.match(html, /Crop route server content/);
  assert.doesNotMatch(
    html,
    /BAILOUT_TO_CLIENT_SIDE_RENDERING|window is not defined/,
  );
});
test("dashboard messages match across English/Hindi, including every module, action and interpolated value", () => {
  const en = JSON.parse(
    fs.readFileSync("src/messages/en.json", "utf8"),
  ).farmerDashboard;
  const hi = JSON.parse(
    fs.readFileSync("src/messages/hi.json", "utf8"),
  ).farmerDashboard;
  const keys = (value, prefix = "") =>
    Object.entries(value).flatMap(([key, item]) =>
      typeof item === "object"
        ? keys(item, `${prefix}${key}.`)
        : `${prefix}${key}`,
    );
  assert.deepEqual(keys(en), keys(hi));
  assert.match(hi.title, /[\u0900-\u097f]/u);
  for (const moduleId of [
    "dashboard",
    "farm-manager",
    "crop-manager",
    "irrigation",
    "machinery",
    "employees",
    "profile",
  ])
    assert.ok(en.modules[moduleId] && hi.modules[moduleId]);
  assert.match(en.comingSoon, /\{module\}/);
  assert.match(hi.comingSoon, /\{module\}/);
  assert.match(en.actions.currentMapType, /\{type\}/);
  assert.match(hi.actions.currentMapType, /\{type\}/);
});
