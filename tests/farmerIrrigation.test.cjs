const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { createTranslator } = require("next-intl");

const base = "src/app/[locale]/(account)/account/(protected)/";
const feature = base + "irrigation/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setImmediate(resolve));
const messages = Object.fromEntries(
  ["en", "hi"].map((locale) => [
    locale,
    JSON.parse(
      fs.readFileSync(path.join("src/messages", `${locale}.json`), "utf8"),
    ),
  ]),
);
// Real messages: a key the code uses but the dictionary lacks fails the test.
const translators = new Map();
function translator(namespace, locale = "en") {
  const key = `${locale}:${namespace}`;
  if (!translators.has(key))
    translators.set(
      key,
      createTranslator({
        locale,
        messages: messages[locale],
        namespace,
        timeZone: "Asia/Kolkata",
        onError(error) {
          throw error;
        },
      }),
    );
  return translators.get(key);
}
const intl = {
  useTranslations: (namespace) => translator(namespace),
  useLocale: () => "en",
};
const icons = new Proxy({}, { get: (_, key) => String(key) });
const utils = { cn: (...values) => values.filter(Boolean).join(" ") };

function load(file, deps = {}, globals = {}) {
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
    URLSearchParams,
    setTimeout,
    clearTimeout,
    ...globals,
    require: (name) =>
      name === "react/jsx-runtime"
        ? jsx
        : Object.hasOwn(deps, name)
          ? deps[name]
          : (() => {
              throw Error(`Unexpected dependency ${name} in ${file}`);
            })(),
  });
  return mod.exports;
}

/** A small hook runtime: real handlers and effects without a browser. */
function hooks() {
  const slots = [];
  let cursor = 0;
  let queue = [];
  const changed = (a, b) =>
    !a || !b || a.length !== b.length || a.some((v, i) => v !== b[i]);
  const react = {
    startTransition: (fn) => fn(),
    useState(initial) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = {
          value: typeof initial === "function" ? initial() : initial,
        };
      return [
        slots[i].value,
        (value) => {
          slots[i].value =
            typeof value === "function" ? value(slots[i].value) : value;
        },
      ];
    },
    useReducer(reducer, argument, init) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = {
          value: init ? init(argument) : argument,
          dispatch: (action) => {
            slots[i].value = reducer(slots[i].value, action);
          },
        };
      return [slots[i].value, slots[i].dispatch];
    },
    useRef(initial) {
      return (slots[cursor++] ??= { current: initial });
    },
    useId() {
      return `id-${cursor++}`;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      const prior = slots[i];
      if (!prior || changed(prior.deps, deps))
        queue.push(() => {
          prior?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps))
        slots[i] = { value: fn(), deps };
      return slots[i].value;
    },
    useSyncExternalStore(_subscribe, getSnapshot) {
      cursor++;
      return getSnapshot();
    },
  };
  // Effects run synchronously after render here, so layout effects are the same.
  react.useLayoutEffect = react.useEffect;
  return {
    react,
    render(Component, props) {
      cursor = 0;
      const tree = Component(props);
      const current = queue;
      queue = [];
      current.forEach((fn) => fn());
      return tree;
    },
    cleanup() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
/** Visible text, rendering nested hook-free components such as the status pill. */
function text(tree) {
  if (tree === null || tree === undefined || typeof tree === "boolean")
    return "";
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (typeof tree.type === "function") return text(tree.type(tree.props));
  return text(tree.props?.children);
}

/** Records what the irrigation layers create on the Google map. */
function fakeSdk() {
  const created = { data: [], lines: [] };
  const latLngs = (points) => {
    const listeners = {};
    const array = points.map((point) => ({
      lat: () => point.lat,
      lng: () => point.lng,
    }));
    return {
      listeners,
      array,
      getArray: () => array,
      addListener(event, callback) {
        listeners[event] = callback;
        return { remove: () => delete listeners[event] };
      },
    };
  };
  class Data {
    constructor({ map }) {
      this.map = map;
      this.features = [];
      this.listeners = {};
      created.data.push(this);
    }
    addGeoJson(json) {
      const list = json.type === "FeatureCollection" ? json.features : [json];
      this.features.push(
        ...list.map((feature) => ({
          getId: () => feature.id,
          getProperty: (key) => feature.properties?.[key],
          source: feature,
        })),
      );
      return this.features;
    }
    setStyle(style) {
      this.style = style;
    }
    setMap(map) {
      this.map = map;
    }
    addListener(event, callback) {
      this.listeners[event] = callback;
      return { remove: () => delete this.listeners[event] };
    }
  }
  class Polyline {
    constructor(options) {
      this.options = options;
      this.map = options.map;
      this.listeners = {};
      this.path = latLngs(options.path);
      created.lines.push(this);
    }
    setMap(map) {
      this.map = map;
    }
    setPath(path) {
      this.path = latLngs(path);
    }
    getPath() {
      return this.path;
    }
    addListener(event, callback) {
      this.listeners[event] = callback;
      return { remove: () => delete this.listeners[event] };
    }
  }
  const sdk = {
    Data,
    Polyline,
    Size: class {
      constructor(width, height) {
        Object.assign(this, { width, height });
      }
    },
    Point: class {
      constructor(x, y) {
        Object.assign(this, { x, y });
      }
    },
    SymbolPath: { CIRCLE: 0 },
    event: { clearInstanceListeners() {} },
  };
  return { sdk, created };
}

const sourceKeys = [
  "borewell",
  "open_well",
  "canal",
  "pond",
  "tank",
  "river",
  "reservoir",
  "rainwater_collection",
  "other",
];
const pipelineKeys = ["underground", "surface", "portable", "other"];
const options = {
  asset_types: [
    { key: "source", label: "Water Source" },
    { key: "pipeline", label: "Pipeline" },
  ],
  source_types: sourceKeys.map((key) => ({
    key,
    label: key,
    supports_depth: ["borewell", "open_well", "pond", "reservoir"].includes(
      key,
    ),
  })),
  pipeline_types: pipelineKeys.map((key) => ({ key, label: key })),
  statuses: [],
  ownership_types: [],
  water_availability: [],
};

test("the Irrigation Manager page replaces the placeholder and the module is enabled", async () => {
  const page = base + "irrigation/page.tsx";
  assert.doesNotMatch(
    fs.readFileSync(page, "utf8"),
    /AccountModuleUnavailable/,
  );
  const filters = load(feature + "irrigationFilters.ts");
  const calls = [];
  const responses = {
    list: {
      status: true,
      data: [],
      pagination: { current_page: 2, last_page: 2 },
      message: "",
    },
    summary: { status: true, data: { total_assets: 0 }, message: "" },
    options: { status: true, data: options, message: "" },
  };
  const api = Object.fromEntries(
    ["list", "summary", "options"].map((name) => [
      name,
      async (params) => {
        calls.push([name, params ? clone(params) : null]);
        if (responses[name] instanceof Error) throw responses[name];
        return responses[name];
      },
    ]),
  );
  const locales = [];
  const Page = load(page, {
    react: { Suspense: "Suspense" },
    "next-intl/server": {
      getTranslations: async (namespace) => translator(namespace),
      setRequestLocale: (locale) => locales.push(locale),
    },
    "@/lib/apis/account/irrigation": { accountIrrigationAPI: api },
    "@/lib/api/handleActionError": {
      handleActionError: async (_, fallback) => ({
        success: false,
        message: fallback,
      }),
    },
    "./_components/IrrigationManager": "IrrigationManager",
    "./_components/IrrigationManagerLoading": "Loading",
    "./_components/irrigationFilters": filters,
  }).default;
  const tree = Page({
    params: Promise.resolve({ locale: "hi" }),
    searchParams: Promise.resolve({
      asset_type: "source",
      source_type: "canal",
      page: "2",
    }),
  });
  assert.equal(tree.type, "Suspense");
  assert.equal(tree.props.fallback.type, "Loading");
  const Content = tree.props.children.type;
  const rendered = await Content(tree.props.children.props);
  assert.equal(rendered.type, "IrrigationManager");
  assert.deepEqual(locales, ["hi"]);
  // The first list page, the unfiltered summary and the options.
  assert.deepEqual(calls, [
    [
      "list",
      { asset_type: "source", source_type: "canal", page: 2, per_page: 20 },
    ],
    ["summary", null],
    ["options", null],
  ]);
  assert.equal(rendered.props.initialList, responses.list);
  assert.equal(rendered.props.initialSummary, responses.summary.data);
  assert.equal(rendered.props.initialOptions, options);
  assert.equal(rendered.props.initialError, undefined);
  // One failing request doesn't hide the others.
  responses.summary = new Error("Backend service unavailable");
  const partial = await Content(tree.props.children.props);
  assert.equal(partial.props.initialList, responses.list);
  assert.equal(partial.props.initialSummary, null);
  assert.equal(partial.props.initialOptions, options);
  assert.equal(
    partial.props.initialError,
    messages.en.farmerIrrigation.errors.loadFailed,
  );

  const modules = load(base + "_config/accountModules.ts", {
    "@/icons": icons,
  });
  assert.deepEqual(clone(modules.resolveAccountRoute("/account/irrigation")), {
    mode: "panel",
    activeModule: "irrigation",
    titleKey: "modules.irrigation",
  });
  assert.equal(
    messages.en.farmerDashboard.modules.irrigation,
    "Irrigation Manager",
  );
  assert.equal(
    messages.hi.farmerDashboard.modules.irrigation,
    "सिंचाई प्रबंधन",
  );
});

test("the types hold all 9 source and 4 pipeline keys and a source/pipeline union without an owner field", () => {
  const source = fs.readFileSync("src/types/account/irrigation.ts", "utf8");
  const union = (name) =>
    [
      ...source
        .match(new RegExp(`export type ${name} =([^;]+);`))[1]
        .matchAll(/"(\w+)"/g),
    ].map((match) => match[1]);
  assert.deepEqual(union("IrrigationSourceType"), sourceKeys);
  assert.deepEqual(union("IrrigationPipelineType"), pipelineKeys);
  assert.deepEqual(union("IrrigationStatus"), [
    "operational",
    "needs_maintenance",
    "out_of_service",
    "inactive",
  ]);
  assert.deepEqual(union("IrrigationOwnershipType"), [
    "owned",
    "shared",
    "rented",
    "public",
    "other",
  ]);
  assert.deepEqual(union("IrrigationWaterAvailability"), [
    "good",
    "moderate",
    "low",
    "seasonal",
    "no_water",
    "unknown",
  ]);
  assert.match(
    source,
    /export type Coordinates = \[lng: number, lat: number\];/,
  );
  assert.match(
    source,
    /export type IrrigationAsset = WaterSourceAsset \| PipelineAsset;/,
  );
  assert.match(source, /id: string;/);
  assert.doesNotMatch(source, /user_id|deleted_at/);
  const filters = load(feature + "irrigationFilters.ts");
  assert.deepEqual([...filters.IRRIGATION_SOURCE_TYPES], sourceKeys);
  assert.deepEqual([...filters.IRRIGATION_PIPELINE_TYPES], pipelineKeys);
});

test("the API client sends every request through apiRequest() with the farmer audience", async () => {
  const file = "src/lib/apis/account/irrigation.ts";
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /import "server-only";/);
  assert.match(source, /import \{ apiRequest \} from "@\/lib\/api\/request";/);
  assert.doesNotMatch(source, /\bfetch\(|axios/i);
  const requests = [];
  const { accountIrrigationAPI: api } = load(file, {
    "server-only": {},
    "@/lib/api/request": {
      apiRequest: async (url, requestOptions) => {
        requests.push([url, clone(requestOptions)]);
        return { status: true };
      },
    },
  });
  await api.list({ asset_type: "pipeline", page: 2, per_page: 20 });
  await api.summary();
  await api.map({ status: "inactive", page: 3, per_page: 20 });
  await api.options();
  await api.show("7");
  await api.create({ asset_type: "source", name: "Main Borewell" });
  await api.update("7", { status: "inactive" });
  await api.remove("7");
  const url = "/account/irrigation-assets";
  assert.deepEqual(requests, [
    [
      url,
      {
        audience: "web",
        params: { asset_type: "pipeline", page: 2, per_page: 20 },
      },
    ],
    [`${url}/summary`, { audience: "web" }],
    // The map follows the filters but never the list page.
    [`${url}/map`, { audience: "web", params: { status: "inactive" } }],
    [`${url}/options`, { audience: "web" }],
    [`${url}/7`, { audience: "web" }],
    [
      url,
      {
        audience: "web",
        method: "POST",
        data: { asset_type: "source", name: "Main Borewell" },
      },
    ],
    [
      `${url}/7`,
      { audience: "web", method: "PATCH", data: { status: "inactive" } },
    ],
    [`${url}/7`, { audience: "web", method: "DELETE" }],
  ]);
});

test("Server Actions forward only writable fields, refuse bad ids and keep a failed map request from hiding the list", async () => {
  const file = "src/actions/account/irrigation.ts";
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /^"use server";/);
  assert.doesNotMatch(source, /revalidatePath|user_id/);
  const calls = [];
  let mapFails = false;
  const asset = { id: "7", asset_type: "source", status_label: "Inactive" };
  const api = {
    list: async (params) => (
      calls.push(["list", clone(params)]),
      { status: true, data: [], pagination: { last_page: 1 } }
    ),
    summary: async () => (calls.push(["summary"]), { status: true, data: {} }),
    map: async (params) => {
      calls.push(["map", clone(params)]);
      if (mapFails) throw new Error("Backend service unavailable");
      return {
        status: true,
        data: { type: "FeatureCollection", features: [] },
      };
    },
    options: async () => (
      calls.push(["options"]),
      { status: true, data: options }
    ),
    show: async (id) => (
      calls.push(["show", id]),
      { status: true, data: asset }
    ),
    create: async (data) => (
      calls.push(["create", clone(data)]),
      { status: true, data: asset }
    ),
    update: async (id, data) => (
      calls.push(["update", id, clone(data)]),
      { status: true, data: { ...asset, asset_type: "pipeline" } }
    ),
    remove: async (id) => (
      calls.push(["remove", id]),
      { status: true, data: null }
    ),
  };
  const actions = load(file, {
    "next-intl/server": {
      getTranslations: async (namespace) => translator(namespace),
    },
    "@/lib/userAuth/dal": { requireUser: async () => ({ id: 4 }) },
    "@/lib/api/handleActionError": {
      handleActionError: async (_, fallback) => ({
        success: false,
        message: fallback,
      }),
    },
    "@/lib/apis/account/irrigation": { accountIrrigationAPI: api },
  });
  const created = await actions.createIrrigationAsset({
    asset_type: "source",
    name: "Main Borewell",
    source_type: "borewell",
    status: "operational",
    user_id: 99,
    created_at: "2026-11-26",
  });
  assert.equal(created.success, true);
  assert.equal(created.message, "Water source saved");
  assert.deepEqual(calls.at(-1), [
    "create",
    {
      name: "Main Borewell",
      source_type: "borewell",
      status: "operational",
      asset_type: "source",
    },
  ]);
  const updated = await actions.updateIrrigationAsset("7", {
    asset_type: "pipeline",
    name: "North Field Pipeline",
    geometry: null,
    user_id: 5,
  });
  // The category can't change, so it is never sent on edit.
  assert.deepEqual(calls.at(-1), [
    "update",
    "7",
    { name: "North Field Pipeline", geometry: null },
  ]);
  assert.equal(updated.message, "Pipeline saved");
  const status = await actions.changeIrrigationStatus("7", "inactive");
  assert.deepEqual(calls.at(-1), ["update", "7", { status: "inactive" }]);
  assert.equal(status.message, "Status changed to Inactive");
  const count = calls.length;
  for (const bad of ["0", "abc", "7/../8", "-1", "", "1e3"]) {
    assert.equal(
      (await actions.updateIrrigationAsset(bad, { name: "x" })).success,
      false,
    );
    assert.equal(
      (await actions.changeIrrigationStatus(bad, "inactive")).success,
      false,
    );
    assert.equal((await actions.deleteIrrigationAsset(bad)).success, false);
    assert.equal((await actions.getIrrigationAsset(bad)).success, false);
  }
  assert.equal(calls.length, count);
  assert.equal(
    (await actions.deleteIrrigationAsset("7")).message,
    "Irrigation asset deleted",
  );
  assert.deepEqual(calls.at(-1), ["remove", "7"]);

  mapFails = true;
  const workspace = await actions.getIrrigationWorkspace(
    { status: "inactive", page: 2, per_page: 20, user_id: 3 },
    ["list", "map"],
  );
  assert.equal(workspace.list.success, true);
  assert.equal(workspace.map.success, false);
  assert.equal(
    workspace.map.message,
    messages.en.farmerIrrigation.errors.loadFailed,
  );
  assert.equal(workspace.summary, undefined);
  assert.deepEqual(calls.filter(([name]) => name === "list").at(-1), [
    "list",
    { status: "inactive", page: 2, per_page: 20 },
  ]);
});

test("filters read the URL, ignore unknown or mismatched values and clear an incompatible type when the group changes", () => {
  const f = load(feature + "irrigationFilters.ts");
  const defaults = { group: "all", type: "", status: "", search: "", page: 1 };
  assert.deepEqual(clone(f.irrigationFilters({})), defaults);
  assert.deepEqual(
    clone(
      f.irrigationFilters({
        asset_type: "pipeline",
        source_type: "canal",
        pipeline_type: "surface",
        status: "inactive",
        search: "line",
        page: "3",
      }),
    ),
    {
      group: "pipeline",
      type: "pipeline:surface",
      status: "inactive",
      search: "line",
      page: 3,
    },
  );
  assert.deepEqual(
    clone(
      f.irrigationFilters({
        asset_type: "lake",
        source_type: "spring",
        status: "broken",
        page: "0",
      }),
    ),
    defaults,
  );
  assert.equal(
    f.irrigationFilters({ search: "x".repeat(150) }).search.length,
    100,
  );
  const state = {
    group: "all",
    type: "source:borewell",
    status: "operational",
    search: " bore ",
    page: 4,
  };
  assert.deepEqual(clone(f.irrigationQuery(state)), {
    source_type: "borewell",
    status: "operational",
    search: "bore",
    page: 4,
    per_page: 20,
  });
  assert.equal(
    f.irrigationSearchParams(state),
    "source_type=borewell&status=operational&search=bore&page=4",
  );
  assert.equal(f.irrigationSearchParams(f.defaultIrrigationFilters), "");
  assert.deepEqual(
    clone(
      f.irrigationFilters(
        Object.fromEntries(
          new URLSearchParams(f.irrigationSearchParams(state)),
        ),
      ),
    ),
    { ...state, search: "bore" },
  );
  // A new group clears a type from the other group and returns to page 1.
  assert.deepEqual(clone(f.withGroup(state, "pipeline")), {
    ...state,
    group: "pipeline",
    type: "",
    page: 1,
  });
  assert.deepEqual(clone(f.withGroup(state, "source")), {
    ...state,
    group: "source",
    page: 1,
  });
  assert.deepEqual(
    clone(f.withGroup({ ...state, type: "pipeline:other" }, "all")),
    {
      ...state,
      type: "pipeline:other",
      page: 1,
    },
  );
  assert.deepEqual(
    clone(f.withType({ ...state, group: "source" }, "pipeline:other")),
    {
      ...state,
      group: "pipeline",
      type: "pipeline:other",
      page: 1,
    },
  );
  assert.deepEqual(clone(f.withType(state, "pipeline:other")), {
    ...state,
    type: "pipeline:other",
    page: 1,
  });
  assert.equal(f.hasIrrigationFilters(f.defaultIrrigationFilters), false);
  assert.equal(f.hasIrrigationFilters({ ...defaults, search: "  " }), false);
  assert.equal(
    f.hasIrrigationFilters({ ...defaults, status: "inactive" }),
    true,
  );
});

test("form payloads: create sends the category, edit sends only a changed location, routes get the server length, depth only for four types", () => {
  const form = load(feature + "irrigationForm.ts");
  assert.deepEqual(
    sourceKeys.filter((key) => form.supportsDepth(options, key)),
    ["borewell", "open_well", "pond", "reservoir"],
  );
  assert.equal(form.supportsDepth(null, "borewell"), false);
  const point = { type: "Point", coordinates: [75.8, 26.9] };
  const source = {
    ...form.irrigationFormDefaults("source"),
    name: "  Main Borewell ",
    source_type: "borewell",
    depth_meters: "120.5",
    water_availability: "good",
    notes: "   ",
    geometry: point,
  };
  assert.deepEqual(clone(form.irrigationPayload("source", source, options)), {
    asset_type: "source",
    name: "Main Borewell",
    ownership_type: null,
    status: "operational",
    notes: null,
    geometry: point,
    source_type: "borewell",
    depth_meters: 120.5,
    water_availability: "good",
  });
  // A canal never sends a depth, even one left in the input.
  assert.equal(
    form.irrigationPayload(
      "source",
      { ...source, source_type: "canal" },
      options,
    ).depth_meters,
    null,
  );
  const pipeline = {
    ...form.irrigationFormDefaults("pipeline"),
    name: "Portable Pipeline",
    pipeline_type: "portable",
    diameter_mm: "75",
    length_meters: "150",
  };
  assert.deepEqual(
    clone(form.irrigationPayload("pipeline", pipeline, options)),
    {
      asset_type: "pipeline",
      name: "Portable Pipeline",
      ownership_type: null,
      status: "operational",
      notes: null,
      pipeline_type: "portable",
      diameter_mm: 75,
      length_meters: 150,
    },
  );
  const route = {
    type: "LineString",
    coordinates: [
      [75.8, 26.9],
      [75.81, 26.91],
    ],
  };
  const routed = form.irrigationPayload(
    "pipeline",
    { ...pipeline, geometry: route },
    options,
  );
  assert.equal("length_meters" in routed, false);
  assert.deepEqual(clone(routed.geometry), route);

  const asset = {
    id: "3",
    asset_type: "pipeline",
    name: "North Field Pipeline",
    source_type: null,
    pipeline_type: "underground",
    geometry: route,
    length_meters: "148.98",
    diameter_mm: "90.00",
    depth_meters: null,
    water_availability: null,
    ownership_type: "owned",
    status: "operational",
    notes: null,
  };
  const defaults = form.irrigationFormDefaults("pipeline", asset);
  assert.equal(defaults.length_meters, "");
  assert.equal(defaults.diameter_mm, "90");
  const unchanged = form.irrigationPayload(
    "pipeline",
    defaults,
    options,
    asset,
  );
  for (const key of ["asset_type", "geometry", "length_meters"])
    assert.equal(key in unchanged, false, key);
  // Removing the route sends null with the new manual length in the same request.
  const removed = form.irrigationPayload(
    "pipeline",
    { ...defaults, geometry: null, length_meters: "40" },
    options,
    asset,
  );
  assert.equal(removed.geometry, null);
  assert.equal(removed.length_meters, 40);
  assert.equal(
    form.irrigationFormDefaults("pipeline", {
      ...asset,
      geometry: null,
      length_meters: "150.00",
    }).length_meters,
    "150",
  );
  for (const payload of [unchanged, removed, routed])
    assert.equal(JSON.stringify(payload).includes("user_id"), false);
});

test("numbers follow Laravel: optional, greater than 0, at most 2 decimals and within the column", () => {
  const { irrigationNumberError: check, IRRIGATION_LIMITS: limits } = load(
    feature + "irrigationForm.ts",
  );
  for (const value of ["", "  ", "12.5", ".5", "12."])
    assert.equal(check(value, 99), null, value);
  for (const value of ["1.234", "abc", "-1", "1e3", "1,5"])
    assert.equal(check(value, 9999), "invalid", value);
  assert.equal(check("0", 99), "positive");
  assert.equal(check("0.00", 99), "positive");
  assert.equal(check("99999999.99", limits.depth), null);
  assert.equal(check("100000000", limits.depth), "tooLarge");
  assert.equal(check("999999.99", limits.diameter), null);
  assert.equal(check("9999999999.99", limits.length), null);
  assert.equal(check("10000000000", limits.length), "tooLarge");
});

test("route length previews match the backend Haversine (R = 6,371,008.8 m) and round only the total", () => {
  const map = load(feature + "irrigationMap.ts");
  assert.equal(map.EARTH_RADIUS_M, 6371008.8);
  assert.equal(
    map.routeLengthMeters([
      [0, 0],
      [0, 0.001],
    ]),
    111.2,
  );
  assert.equal(
    map.routeLengthMeters([
      [0, 0],
      [0, 0.001],
      [0.001, 0.001],
    ]),
    222.39,
  );
  assert.equal(
    map.routeLengthMeters([
      [75.8001, 26.9101],
      [75.8011, 26.9111],
    ]),
    148.98,
  );
  assert.equal(
    map.routeLengthMeters([
      [75.8001, 26.9101],
      [75.8021, 26.9091],
      [75.8031, 26.9121],
    ]),
    575.37,
  );
  // Three 0.334 m segments: rounding each first would give 0.99.
  assert.equal(
    map.routeLengthMeters([
      [0, 0],
      [0, 0.000003],
      [0, 0.000006],
      [0, 0.000009],
    ]),
    1,
  );
});

test("route rules match Laravel and the location draft supports add, drag, insert, remove, undo and clear", () => {
  const map = load(feature + "irrigationMap.ts");
  assert.equal(map.irrigationRouteError([[0, 0]]), "needTwo");
  assert.equal(
    map.irrigationRouteError([
      [1, 1],
      [1, 1],
    ]),
    "needTwo",
  );
  assert.equal(
    map.irrigationRouteError([
      [0, 0],
      [0, 1],
      [0, 1],
    ]),
    "consecutive",
  );
  assert.equal(
    map.irrigationRouteError(
      Array.from({ length: 1001 }, (_, i) => [0, i / 10000]),
    ),
    "maxPoints",
  );
  assert.equal(
    map.irrigationRouteError([
      [0, 0],
      [0, 0.00000001],
    ]),
    "needTwo",
  );
  assert.equal(
    map.irrigationRouteError([
      [75.8, 26.9],
      [75.81, 26.91],
    ]),
    null,
  );

  const reduce = (state, ...actions) =>
    actions.reduce(map.irrigationDraftReducer, state);
  let line = map.irrigationDraft("line", null);
  line = reduce(
    line,
    { type: "add", point: [1, 1] },
    { type: "add", point: [1, 1] },
  );
  assert.equal(line.notice, "duplicate");
  assert.deepEqual(clone(line.points), [[1, 1]]);
  line = reduce(
    line,
    { type: "add", point: [2, 2] },
    // A dragged midpoint inserts a point; dragging it moves it.
    {
      type: "replace",
      points: [
        [1, 1],
        [1.5, 1.5],
        [2, 2],
      ],
    },
    {
      type: "replace",
      points: [
        [1, 1],
        [1.5, 1.6],
        [2, 2],
      ],
    },
  );
  assert.deepEqual(clone(line.points), [
    [1, 1],
    [1.5, 1.6],
    [2, 2],
  ]);
  assert.equal(line.notice, null);
  line = reduce(line, { type: "remove", index: 1 });
  assert.deepEqual(clone(line.points), [
    [1, 1],
    [2, 2],
  ]);
  line = reduce(line, { type: "undo" });
  assert.deepEqual(clone(line.points), [
    [1, 1],
    [1.5, 1.6],
    [2, 2],
  ]);
  line = reduce(line, { type: "clear" });
  assert.equal(map.draftGeometry(line), null);
  line = reduce(line, { type: "undo" });
  assert.deepEqual(clone(map.draftGeometry(line)), {
    type: "LineString",
    coordinates: [
      [1, 1],
      [1.5, 1.6],
      [2, 2],
    ],
  });
  const full = map.irrigationDraft("line", {
    type: "LineString",
    coordinates: Array.from({ length: 1000 }, (_, i) => [0, i]),
  });
  assert.equal(
    map.irrigationDraftReducer(full, { type: "add", point: [5, 5] }).notice,
    "maxPoints",
  );
  // A tap or a drag replaces the marker; the form's geometry is never mutated.
  const original = { type: "Point", coordinates: [75.8, 26.9] };
  const point = reduce(map.irrigationDraft("point", original), {
    type: "add",
    point: [75.9, 27],
  });
  assert.deepEqual(clone(map.draftGeometry(point)), {
    type: "Point",
    coordinates: [75.9, 27],
  });
  assert.deepEqual(original.coordinates, [75.8, 26.9]);
  assert.deepEqual(
    clone(map.toCoordinates({ lat: 26.123456789, lng: 75.987654321 })),
    [75.9876543, 26.1234568],
  );
  assert.deepEqual(
    clone(
      map.geometryAnchor({
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
          [4, 0],
        ],
      }),
    ),
    { lat: 1, lng: 3 },
  );
});

test("each view has its own panel height and the layer toggles are kept per farmer in this browser", () => {
  const store = new Map();
  const localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  };
  const map = load(feature + "irrigationMap.ts", {}, { localStorage });
  const desktop = { width: 1280, height: 900 };
  const phone = { width: 390, height: 800 };
  assert.equal(map.irrigationPanelHeight("list", desktop), 812);
  assert.equal(map.irrigationPanelHeight("map", desktop), 300);
  assert.equal(map.irrigationPanelHeight("combined", desktop), 504);
  assert.equal(map.irrigationPanelHeight("map", phone), 380);
  assert.equal(map.irrigationPanelHeight("combined", phone), 480);
  const all = { farms: true, sources: true, pipelines: true };
  assert.deepEqual(clone(map.readIrrigationLayers(4)), all);
  map.saveIrrigationLayers(4, {
    farms: false,
    sources: true,
    pipelines: false,
  });
  assert.deepEqual(clone(map.readIrrigationLayers(4)), {
    farms: false,
    sources: true,
    pipelines: false,
  });
  assert.deepEqual(clone(map.readIrrigationLayers(5)), all);
  store.set("krishi-irrigation-layers:6", "{broken");
  assert.deepEqual(clone(map.readIrrigationLayers(6)), all);
  map.saveIrrigationLayers(null, {
    farms: false,
    sources: false,
    pipelines: false,
  });
  assert.deepEqual(
    [...store.keys()],
    ["krishi-irrigation-layers:4", "krishi-irrigation-layers:6"],
  );
});

test("the map layer draws pins and patterned pipelines, selects on tap and fades while a location is edited", () => {
  const runtime = hooks();
  const mapModule = load(feature + "irrigationMap.ts");
  const Layer = load(feature + "IrrigationMapLayer.tsx", {
    react: runtime.react,
    "./irrigationMap": mapModule,
  }).default;
  const { sdk, created } = fakeSdk();
  const pipe = (id, type, lng, status = "operational") => ({
    type: "Feature",
    id,
    geometry: {
      type: "LineString",
      coordinates: [
        [lng, 26.9],
        [lng + 0.01, 26.91],
      ],
    },
    properties: {
      name: `Line ${id}`,
      asset_type: "pipeline",
      pipeline_type: type,
      status,
      type_label: type,
      status_label: status,
    },
  });
  const features = [
    {
      type: "Feature",
      id: "1",
      geometry: { type: "Point", coordinates: [75.8, 26.9] },
      properties: {
        name: "Main Borewell",
        asset_type: "source",
        source_type: "borewell",
        status: "inactive",
        type_label: "Borewell",
        status_label: "Inactive",
      },
    },
    pipe("2", "underground", 75.82),
    pipe("3", "surface", 75.84),
    pipe("4", "portable", 75.86),
    pipe("5", "other", 75.88),
  ];
  const selected = [];
  const props = {
    sdk,
    map: { id: "map" },
    features,
    selectedId: "2",
    layers: { sources: true, pipelines: true },
    hiddenId: null,
    interactive: true,
    onSelect: (id) => selected.push(id),
  };
  runtime.render(Layer, props);
  const sources = () => created.data.filter((data) => data.map).at(-1);
  const live = () => created.lines.filter((line) => line.map);
  const linesOf = (lng) =>
    live().filter((line) => line.options.path[0].lng === lng);
  const patternOf = (lng) =>
    linesOf(lng).find((line) => [44, 45].includes(line.options.zIndex));
  const icon = (feature) => {
    const url = sources().style(feature).icon.url;
    return decodeURIComponent(url.slice(url.indexOf(",") + 1));
  };
  assert.deepEqual(
    sources().features.map((feature) => feature.getId()),
    ["1"],
  );
  const pin = sources().features[0];
  assert.equal(sources().style(pin).clickable, true);
  assert.equal(sources().style(pin).title, "Main Borewell");
  // Inactive pins are faded and carry the grey status dot.
  assert.match(icon(pin), /<g opacity="0.5">/);
  assert.match(icon(pin), /fill="#667085"/);
  sources().listeners.click({ feature: pin });
  assert.deepEqual(selected, ["1"]);

  // Underground dashed (selected: darker, with a glow), surface solid,
  // portable dotted and other dash-dot.
  assert.equal(linesOf(75.82).length, 4);
  assert.ok(linesOf(75.82).some((line) => line.options.zIndex === 41));
  assert.equal(patternOf(75.82).options.strokeOpacity, 0);
  assert.equal(patternOf(75.82).options.strokeColor, "#065986");
  assert.equal(patternOf(75.82).options.icons[0].icon.path, "M 0,-1 0,1");
  assert.equal(patternOf(75.84).options.strokeOpacity, 1);
  assert.equal(patternOf(75.84).options.icons, undefined);
  assert.equal(patternOf(75.84).options.strokeColor, "#0086c9");
  assert.equal(
    patternOf(75.86).options.icons[0].icon.path,
    sdk.SymbolPath.CIRCLE,
  );
  assert.equal(patternOf(75.88).options.icons.length, 2);
  linesOf(75.84)
    .find((line) => line.options.zIndex === 46)
    .listeners.click();
  assert.deepEqual(selected, ["1", "3"]);

  // While a location is edited: no taps, everything faded, the edited asset hidden.
  props.interactive = false;
  props.hiddenId = "1";
  runtime.render(Layer, props);
  assert.equal(sources().features.length, 0);
  assert.equal(
    live().some((line) => line.options.clickable),
    false,
  );
  assert.equal(
    linesOf(75.84).find((line) => line.options.zIndex === 42).options
      .strokeOpacity,
    0.92 * 0.35,
  );
  props.hiddenId = null;
  runtime.render(Layer, props);
  assert.match(icon(sources().features[0]), /<g opacity="0.35">/);
  // Each layer toggles on its own.
  props.layers = { sources: false, pipelines: true };
  runtime.render(Layer, props);
  assert.equal(sources().features.length, 0);
  assert.ok(live().length > 0);
  props.layers = { sources: true, pipelines: false };
  runtime.render(Layer, props);
  assert.equal(sources().features.length, 1);
  assert.equal(live().length, 0);
  runtime.cleanup();
  assert.equal(
    created.data.some((data) => data.map),
    false,
  );
});

test("the location editor adds route points by tapping, blocks a one-point route and hands the result to the form only on Confirm", () => {
  const runtime = hooks();
  const toasts = [];
  const Editor = load(
    feature + "IrrigationLocationEditor.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "react-hot-toast": { error: (message) => toasts.push(message) },
      "@/icons": icons,
      "../../_components/farmGeometry": load(
        base + "_components/farmGeometry.ts",
      ),
      "./irrigationMap": load(feature + "irrigationMap.ts"),
      "./IrrigationUi": {
        irrigationButton: "button",
        irrigationPrimary: "primary",
        useIrrigationFormat: () => ({
          coordinate: (value) => value.toFixed(6),
          fixed: (value) => Number(value).toFixed(2),
        }),
      },
    },
    {
      window: { addEventListener() {}, removeEventListener() {} },
      document: { querySelector: () => null },
      requestAnimationFrame: (callback) => (callback(), 1),
      cancelAnimationFrame() {},
      navigator: {
        geolocation: { getCurrentPosition: (_, fail) => fail({ code: 1 }) },
      },
    },
  ).default;
  const mapEvents = {};
  const settings = [];
  const map = {
    setOptions: (value) => settings.push(value),
    addListener(event, callback) {
      mapEvents[event] = callback;
      return { remove: () => delete mapEvents[event] };
    },
    panTo() {},
    setZoom() {},
    getZoom: () => 12,
  };
  const { sdk, created } = fakeSdk();
  const results = [];
  const fits = [];
  const props = {
    sdk,
    map,
    request: {
      kind: "line",
      assetId: null,
      geometry: null,
      onConfirm: (geometry) => results.push(["confirm", clone(geometry)]),
      onCancel: () => results.push(["cancel"]),
    },
    onFit: (positions) => fits.push(clone(positions)),
  };
  let tree = runtime.render(Editor, props);
  const render = () => (tree = runtime.render(Editor, props));
  const button = (label) =>
    nodes(tree).find(
      (node) => node.type === "button" && text(node).includes(label),
    );
  const tap = (lat, lng) =>
    mapEvents.click({ latLng: { lat: () => lat, lng: () => lng } });
  assert.deepEqual(clone(settings[0]), {
    draggableCursor: "crosshair",
    disableDoubleClickZoom: true,
  });
  assert.deepEqual(fits, []);
  assert.equal(
    nodes(tree).find((node) => node.props?.role === "region").props[
      "aria-labelledby"
    ].length > 0,
    true,
  );
  assert.match(text(tree), /Draw pipeline route/);

  tap(26.9, 75.8);
  render();
  assert.equal(button("Confirm").props.disabled, true);
  assert.match(text(tree), /1 point/);
  assert.match(text(tree), /Add at least 2 different points to make a route\./);
  tap(26.91, 75.81);
  render();
  assert.equal(button("Confirm").props.disabled, false);
  assert.match(text(tree), /2 points≈ 1[0-9.]+ m \(approximate\)/);

  // The editable line follows the draft: a dragged midpoint inserts a point,
  // double-clicking a point removes it.
  const line = created.lines.find((item) => item.options.editable && item.map);
  assert.equal(line.getPath().getArray().length, 2);
  line.path.array.splice(1, 0, { lat: () => 26.905, lng: () => 75.805 });
  line.path.listeners.insert_at();
  render();
  assert.match(text(tree), /3 points/);
  line.listeners.dblclick({ vertex: 1 });
  render();
  assert.match(text(tree), /2 points/);
  assert.equal(line.getPath().getArray().length, 2);
  button("Undo").props.onClick();
  render();
  assert.match(text(tree), /3 points/);
  button("Confirm").props.onClick();
  assert.deepEqual(results, [
    [
      "confirm",
      {
        type: "LineString",
        coordinates: [
          [75.8, 26.9],
          [75.805, 26.905],
          [75.81, 26.91],
        ],
      },
    ],
  ]);
  button("Cancel").props.onClick();
  assert.deepEqual(results.at(-1), ["cancel"]);
  // Refusing location access doesn't block picking by hand.
  button("My location").props.onClick();
  assert.deepEqual(toasts, [
    messages.en.farmerIrrigation.editor.locationDenied,
  ]);
  runtime.cleanup();
  assert.deepEqual(clone(settings.at(-1)), {
    draggableCursor: null,
    disableDoubleClickZoom: false,
  });
  assert.deepEqual(Object.keys(mapEvents), []);
  assert.equal(line.map, null);
});

test("the marker editor frames the saved location, follows a drag and can remove the location", () => {
  const runtime = hooks();
  const Editor = load(
    feature + "IrrigationLocationEditor.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "react-hot-toast": { error() {} },
      "@/icons": icons,
      "../../_components/farmGeometry": load(
        base + "_components/farmGeometry.ts",
      ),
      "./irrigationMap": load(feature + "irrigationMap.ts"),
      "./IrrigationUi": {
        irrigationButton: "button",
        irrigationPrimary: "primary",
        useIrrigationFormat: () => ({
          coordinate: (value) => value.toFixed(6),
          fixed: String,
        }),
      },
    },
    {
      window: { addEventListener() {}, removeEventListener() {} },
      document: { querySelector: () => null },
      requestAnimationFrame: (callback) => (callback(), 1),
      cancelAnimationFrame() {},
    },
  ).default;
  const map = {
    setOptions() {},
    addListener: () => ({ remove() {} }),
  };
  const { sdk, created } = fakeSdk();
  const results = [];
  const fits = [];
  const props = {
    sdk,
    map,
    request: {
      kind: "point",
      assetId: "7",
      geometry: { type: "Point", coordinates: [75.8, 26.9] },
      onConfirm: (geometry) => results.push(clone(geometry)),
      onCancel() {},
    },
    onFit: (positions) => fits.push(clone(positions)),
  };
  let tree = runtime.render(Editor, props);
  const render = () => (tree = runtime.render(Editor, props));
  const button = (label) =>
    nodes(tree).find(
      (node) => node.type === "button" && text(node).includes(label),
    );
  assert.deepEqual(fits, [[{ lat: 26.9, lng: 75.8 }]]);
  assert.match(text(tree), /Lat 26\.900000 · Lng 75\.800000/);
  const marker = () =>
    created.data.find((data) => data.map && data.style?.draggable);
  assert.deepEqual(
    clone(marker().features[0].source.geometry.coordinates),
    [75.8, 26.9],
  );
  marker().listeners.setgeometry({
    newGeometry: { get: () => ({ lat: () => 27, lng: () => 76 }) },
  });
  render();
  assert.match(text(tree), /Lat 27\.000000 · Lng 76\.000000/);
  assert.deepEqual(
    clone(marker().features[0].source.geometry.coordinates),
    [76, 27],
  );
  button("Clear").props.onClick();
  render();
  assert.equal(marker(), undefined);
  assert.match(
    text(tree),
    /Confirming with no marker will remove the location\./,
  );
  assert.equal(button("Confirm").props.disabled, false);
  button("Confirm").props.onClick();
  assert.deepEqual(results, [null]);
  runtime.cleanup();
});

test("map action groups gain Fit Irrigation Assets and the three layer toggles when the map shows irrigation assets", () => {
  const runtime = hooks();
  const fab = base + "_components/fab/";
  const FabButton = load(fab + "FabButton.tsx", { "@/utils": utils }).default;
  const FabGroup = load(fab + "FabGroup.tsx", {
    "@/components/common/Tooltip": "Tooltip",
    "@/icons": icons,
    "@/utils": utils,
    "./FabButton": FabButton,
  }).default;
  const Fab = load(
    base + "_components/AccountFloatingActions.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "@/components/common/Tooltip": "Tooltip",
      "@/icons": icons,
      "@/utils": utils,
      "./fab/FabButton": FabButton,
      "./fab/FabGroup": FabGroup,
      "./fab/fabGroups": load(fab + "fabGroups.ts", { "@/icons": icons }),
    },
    { document: { addEventListener() {}, removeEventListener() {} } },
  ).default;
  const expand = (tree) =>
    Array.isArray(tree)
      ? tree.map(expand)
      : !tree || typeof tree !== "object"
        ? tree
        : typeof tree.type === "function"
          ? expand(tree.type(tree.props))
          : {
              ...tree,
              props: { ...tree.props, children: expand(tree.props?.children) },
            };
  const calls = [];
  const props = {
    group: "view",
    mapType: "satellite",
    mapReady: true,
    availableHeight: 700,
    bottom: 48,
    onGroup: (group) => {
      calls.push(["group", group]);
      props.group = group;
    },
    onAddFarm() {},
    onDrawFarm() {},
    onMapType() {},
    onLocate() {},
    onFit() {},
    onReset() {},
  };
  let tree;
  const render = () => (tree = expand(runtime.render(Fab, props)));
  const menu = (label) =>
    nodes(tree).find(
      (node) =>
        node.props?.role === "group" && node.props["aria-label"] === label,
    );
  const items = (label) =>
    nodes(menu(label))
      .filter((node) => node.type === "button")
      .map((node) => [text(node), node.props["aria-pressed"]]);
  const main = (label) =>
    nodes(tree).find(
      (node) =>
        node.type === "button" &&
        node.props["aria-expanded"] !== undefined &&
        text(node).startsWith(label),
    );
  // A map without irrigation assets: only what it supports, and no layer badge.
  render();
  assert.deepEqual(items("Locate & Fit"), [
    ["My Location", undefined],
    ["Fit All Farms", undefined],
  ]);
  props.group = "layers";
  render();
  assert.deepEqual(items("Map Layers"), [
    ["Road Map", undefined],
    ["Reset Map Layers", undefined],
  ]);
  assert.equal(text(main("Map Layers")), "Map Layers");

  // Irrigation assets add their layer toggles and Fit Irrigation Assets.
  props.irrigation = {
    layers: { farms: true, sources: false, pipelines: true },
    onToggleLayer: (layer) => calls.push(["layer", layer]),
    onFit: () => calls.push(["fitIrrigation"]),
  };
  render();
  assert.deepEqual(items("Map Layers"), [
    ["Road Map", undefined],
    ["Farm Boundaries", true],
    ["Water Sources", false],
    ["Pipelines", true],
    ["Reset Map Layers", undefined],
  ]);
  assert.equal(text(main("Map Layers")), "Map Layers2/3");
  nodes(menu("Map Layers"))
    .find((node) => node.type === "button" && text(node) === "Water Sources")
    .props.onClick();
  // A toggle keeps the group open.
  assert.deepEqual(calls, [["layer", "sources"]]);
  props.group = "view";
  render();
  assert.deepEqual(items("Locate & Fit"), [
    ["My Location", undefined],
    ["Fit All Farms", undefined],
    ["Fit Irrigation Assets", undefined],
  ]);
  nodes(menu("Locate & Fit"))
    .find(
      (node) =>
        node.type === "button" && text(node) === "Fit Irrigation Assets",
    )
    .props.onClick();
  assert.deepEqual(calls.slice(1), [["group", null], ["fitIrrigation"]]);
  runtime.cleanup();
});

test("list rows show the type, dimensions, a text status and the map state, with labelled icon actions", () => {
  const runtime = hooks();
  const ui = load(feature + "IrrigationUi.tsx", {
    react: runtime.react,
    "next-intl": intl,
    "@/utils": utils,
    "@/icons": icons,
  });
  const Item = load(feature + "IrrigationListItem.tsx", {
    react: runtime.react,
    "next-intl": intl,
    "@/components/common/Tooltip": "Tooltip",
    "@/utils": utils,
    "@/icons": icons,
    "./IrrigationUi": ui,
  }).default;
  const calls = [];
  const asset = {
    id: "3",
    name: "North Field Pipeline",
    asset_type: "pipeline",
    source_type: null,
    pipeline_type: "underground",
    geometry: {
      type: "LineString",
      coordinates: [
        [1, 1],
        [2, 2],
      ],
    },
    length_meters: "295.52",
    diameter_mm: "90.00",
    depth_meters: null,
    status: "needs_maintenance",
    status_label: "Needs Maintenance",
    type_label: "Underground Pipeline",
  };
  const props = {
    asset,
    selected: true,
    mapReady: true,
    onSelect: (item) => calls.push(["select", item.id]),
    onLocate: (item) => calls.push(["locate", item.id]),
    onEdit: (item) => calls.push(["edit", item.id]),
    onDelete: (item) => calls.push(["delete", item.id]),
  };
  let tree = runtime.render(Item, props);
  const main = () =>
    nodes(tree).find(
      (node) =>
        node.type === "button" && node.props["aria-pressed"] !== undefined,
    );
  const actions = () =>
    nodes(tree).filter(
      (node) => node.type === "button" && node.props["aria-label"],
    );
  assert.equal(main().props["aria-pressed"], true);
  assert.match(text(main()), /North Field Pipeline/);
  assert.match(text(main()), /Underground Pipeline · 295\.52 m · Ø 90 mm/);
  assert.match(text(main()), /Needs Maintenance/);
  assert.match(text(main()), /On map/);
  assert.deepEqual(
    actions().map((node) => node.props["aria-label"]),
    [
      "Locate: North Field Pipeline",
      "Edit: North Field Pipeline",
      "Delete: North Field Pipeline",
    ],
  );
  main().props.onClick();
  for (const node of actions()) node.props.onClick();
  assert.deepEqual(calls, [
    ["select", "3"],
    ["locate", "3"],
    ["edit", "3"],
    ["delete", "3"],
  ]);
  // Without the map, Locate explains itself and does nothing.
  props.mapReady = false;
  tree = runtime.render(Item, props);
  assert.equal(actions()[0].props["aria-disabled"], true);
  assert.ok(actions()[0].props["aria-describedby"]);
  actions()[0].props.onClick();
  assert.equal(calls.length, 4);
  // An unmapped source offers to add its location, which opens the form even without the map.
  props.asset = {
    ...asset,
    asset_type: "source",
    source_type: "pond",
    pipeline_type: null,
    geometry: null,
    length_meters: null,
    diameter_mm: null,
    depth_meters: "3.50",
    status: "operational",
    status_label: "Operational",
    type_label: "Pond",
    name: "Farm Pond",
  };
  tree = runtime.render(Item, props);
  assert.match(text(main()), /Pond · Depth 3\.5 m/);
  assert.match(text(main()), /Not mapped/);
  assert.equal(actions()[0].props["aria-label"], "Add location: Farm Pond");
  assert.equal(actions()[0].props["aria-disabled"], false);
});

test("summary cards show mapped counts, attention, routes and partial, unavailable or empty pipeline totals", () => {
  const runtime = hooks();
  const ui = load(feature + "IrrigationUi.tsx", {
    react: runtime.react,
    "next-intl": intl,
    "@/utils": utils,
    "@/icons": icons,
  });
  const Cards = load(feature + "IrrigationSummaryCards.tsx", {
    "next-intl": intl,
    "@/icons": icons,
    "./IrrigationUi": ui,
  }).default;
  const summary = {
    total_assets: 9,
    water_sources: 5,
    water_sources_needing_attention: 1,
    pipelines: 4,
    pipelines_with_route: 2,
    total_pipeline_length_meters: "582.19",
    pipelines_with_known_length: 3,
    pipelines_with_unknown_length: 1,
    mapped_assets: 6,
    unmapped_assets: 3,
  };
  const show = (value) => text(runtime.render(Cards, { summary: value }));
  const full = show(summary);
  for (const part of [
    "6 on map · 3 not mapped",
    "1 need attention",
    "2 with route drawn",
    "582.19 m",
    "Partial · 1 with unknown length",
  ])
    assert.ok(full.includes(part), part);
  const unknown = show({
    ...summary,
    water_sources_needing_attention: 0,
    total_pipeline_length_meters: null,
    pipelines_with_known_length: 0,
    pipelines_with_unknown_length: 2,
  });
  for (const part of [
    "All operational or inactive",
    "Unavailable",
    "2 pipelines with unknown length",
  ])
    assert.ok(unknown.includes(part), part);
  const none = show({
    ...summary,
    pipelines: 0,
    pipelines_with_route: 0,
    total_pipeline_length_meters: "0.00",
    pipelines_with_known_length: 0,
    pipelines_with_unknown_length: 0,
  });
  assert.ok(none.includes("0.00 m"));
  assert.ok(none.includes("No pipelines yet"));
  assert.ok(show(null).includes("—"));
});

test("the manager publishes map features, selection and view to the shared map, keeps filters in the URL and ignores stale responses", async () => {
  const runtime = hooks();
  const filters = load(feature + "irrigationFilters.ts");
  let search = "";
  const urls = [];
  const window = {
    location: { pathname: "/account/irrigation" },
    history: {
      replaceState(_, __, url) {
        urls.push(url);
        search = url.split("?")[1] ?? "";
      },
    },
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  };
  const published = [];
  const located = [];
  const pending = [];
  const assetRequests = [];
  const assets = [
    {
      id: "1",
      name: "Main Borewell",
      asset_type: "source",
      source_type: "borewell",
      geometry: { type: "Point", coordinates: [75.8, 26.9] },
    },
    {
      id: "2",
      name: "Spare Pipe Roll",
      asset_type: "pipeline",
      pipeline_type: "other",
      geometry: null,
    },
  ];
  const page = (data) => ({
    status: true,
    data,
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: data.length,
      from: 1,
      to: data.length,
    },
    message: "",
  });
  // What every page's map already shows; the manager starts from it.
  const shown = {
    type: "Feature",
    id: "5",
    geometry: { type: "Point", coordinates: [75.9, 26.8] },
    properties: { name: "Old Well", asset_type: "source" },
  };
  let refreshes = 0;
  const context = {
    irrigation: {
      assets: [shown],
      refresh: () => refreshes++,
      requestedId: null,
      clearRequest() {},
      publish: (model) => published.push(model),
      mapStatus: "ready",
      editing: false,
      locate: (...args) => located.push(args),
      editLocation: () => true,
    },
  };
  const Manager = load(
    feature + "IrrigationManager.tsx",
    {
      react: runtime.react,
      "next/navigation": { useSearchParams: () => new URLSearchParams(search) },
      "next-intl": intl,
      "react-hot-toast": Object.assign(() => {}, { success() {}, error() {} }),
      "@/icons": icons,
      "@/utils": utils,
      "@/actions/account/irrigation": {
        getIrrigationWorkspace: (query, parts) =>
          new Promise((resolve) =>
            pending.push({ query: clone(query), parts: [...parts], resolve }),
          ),
        getIrrigationAsset: async (id) => {
          assetRequests.push(id);
          return {
            success: true,
            data: { ...assets[0], id, name: "Far Canal" },
          };
        },
        changeIrrigationStatus: async () => ({ success: false, message: "" }),
      },
      "../../_components/AccountFarmContext": {
        useAccountFarms: () => context,
      },
      "./IrrigationDeleteConfirm": "DeleteConfirm",
      "./IrrigationDetails": "Details",
      "./IrrigationFormDialog": "FormDialog",
      "./IrrigationList": "List",
      "./IrrigationSummaryCards": "Summary",
      "./IrrigationToolbar": "Toolbar",
      "./irrigationFilters": filters,
      "./IrrigationUi": {
        irrigationPrimary: "primary",
        irrigationWater: "water",
      },
    },
    { window },
  ).default;
  const props = {
    initialList: page(assets),
    initialSummary: { total_assets: 2 },
    initialOptions: options,
  };
  let tree;
  const render = () => (tree = runtime.render(Manager, props));
  const find = (type) => nodes(tree).find((node) => node.type === type);
  const model = () => published.at(-1);
  render();
  // The server rendered the list; only the map features load here.
  assert.deepEqual(
    pending.map((request) => request.parts),
    [["map"]],
  );
  assert.equal(model().view, "combined");
  // Unfiltered, the assets already on the map stay until its own map loads.
  assert.deepEqual(
    model().features.map((item) => item.id),
    ["5"],
  );
  const pin = {
    type: "Feature",
    id: "1",
    geometry: assets[0].geometry,
    properties: { name: "Main Borewell" },
  };
  pending[0].resolve({
    map: {
      success: true,
      data: { type: "FeatureCollection", features: [pin] },
    },
  });
  await tick();
  render();
  assert.deepEqual(
    model().features.map((item) => item.id),
    ["1"],
  );

  find("List").props.onSelect(assets[0]);
  render();
  assert.equal(model().selectedId, "1");
  assert.equal(find("Details").props.selection.asset, assets[0]);
  // A map selection outside this page loads its details.
  model().onSelect("9");
  await tick();
  render();
  assert.deepEqual(assetRequests, ["9"]);
  assert.equal(find("Details").props.selection.asset.name, "Far Canal");

  // Filters go into the URL; the list and map reload, the summary doesn't.
  const pipelines = filters.withGroup(
    filters.irrigationFilters({}),
    "pipeline",
  );
  find("Toolbar").props.onFilters(pipelines);
  render();
  find("Toolbar").props.onFilters({ ...pipelines, status: "inactive" });
  render();
  assert.deepEqual(urls, [
    "/account/irrigation?asset_type=pipeline",
    "/account/irrigation?asset_type=pipeline&status=inactive",
  ]);
  assert.deepEqual(
    pending.slice(1).map((request) => [request.parts, request.query]),
    [
      [["list", "map"], { asset_type: "pipeline", page: 1, per_page: 20 }],
      [
        ["list", "map"],
        { asset_type: "pipeline", status: "inactive", page: 1, per_page: 20 },
      ],
    ],
  );
  // The newer response wins even when the older one arrives later.
  pending[2].resolve({
    list: { success: true, data: page([assets[1]]) },
    map: { success: true, data: { type: "FeatureCollection", features: [] } },
  });
  await tick();
  pending[1].resolve({
    list: { success: true, data: page(assets) },
    map: {
      success: true,
      data: { type: "FeatureCollection", features: [pin] },
    },
  });
  await tick();
  render();
  assert.deepEqual(
    find("List").props.list.data.map((item) => item.id),
    ["2"],
  );
  assert.deepEqual(clone(model().features), []);
  // The selection the filters now exclude is cleared.
  assert.equal(model().selectedId, null);

  // Locate from the List view brings the map back and frames the asset.
  find("Toolbar").props.onView("list");
  render();
  assert.equal(model().view, "list");
  find("List").props.onLocate(assets[0]);
  render();
  assert.equal(model().view, "combined");
  assert.equal(model().selectedId, "1");
  assert.deepEqual(clone(located), [["source", assets[0].geometry]]);
  // Without a route, "Add route" opens the form straight into the map editor.
  find("List").props.onLocate(assets[1]);
  render();
  assert.equal(find("FormDialog").props.category, "pipeline");
  assert.equal(find("FormDialog").props.asset, assets[1]);
  assert.equal(find("FormDialog").props.startEditor, true);
  find("FormDialog").props.onClose();
  render();
  assert.equal(find("FormDialog"), undefined);
  // A deletion refreshes the list, summary and map quietly.
  find("List").props.onDelete(assets[1]);
  render();
  find("DeleteConfirm").props.onDeleted("2");
  render();
  assert.deepEqual(pending.at(-1).parts, ["list", "summary", "map"]);
  // The other pages' maps reload their assets too.
  assert.equal(refreshes, 1);
  runtime.cleanup();
  assert.equal(published.at(-1), null);
});

test("an asset tapped on another page's map opens here selected and framed, once; a filtered manager doesn't start from every asset", () => {
  const filters = load(feature + "irrigationFilters.ts");
  const source = {
    id: "1",
    name: "Main Borewell",
    asset_type: "source",
    source_type: "borewell",
    geometry: { type: "Point", coordinates: [75.8, 26.9] },
  };
  const pin = {
    type: "Feature",
    id: "1",
    geometry: source.geometry,
    properties: { name: "Main Borewell", asset_type: "source" },
  };
  function mount(search, requestedId) {
    const runtime = hooks();
    const published = [];
    const located = [];
    const context = {
      irrigation: {
        assets: [pin],
        refresh() {},
        requestedId,
        clearRequest() {
          context.irrigation.requestedId = null;
        },
        publish: (model) => published.push(model),
        mapStatus: "ready",
        editing: false,
        locate: (...args) => located.push(args),
        editLocation: () => true,
      },
    };
    const Manager = load(
      feature + "IrrigationManager.tsx",
      {
        react: runtime.react,
        "next/navigation": {
          useSearchParams: () => new URLSearchParams(search),
        },
        "next-intl": intl,
        "react-hot-toast": Object.assign(() => {}, {
          success() {},
          error() {},
        }),
        "@/icons": icons,
        "@/utils": utils,
        "@/actions/account/irrigation": {
          // Never resolves: only what the manager shows before its own load matters here.
          getIrrigationWorkspace: () => new Promise(() => {}),
          getIrrigationAsset: async () => ({ success: false, message: "" }),
          changeIrrigationStatus: async () => ({ success: false, message: "" }),
        },
        "../../_components/AccountFarmContext": {
          useAccountFarms: () => context,
        },
        "./IrrigationDeleteConfirm": "DeleteConfirm",
        "./IrrigationDetails": "Details",
        "./IrrigationFormDialog": "FormDialog",
        "./IrrigationList": "List",
        "./IrrigationSummaryCards": "Summary",
        "./IrrigationToolbar": "Toolbar",
        "./irrigationFilters": filters,
        "./IrrigationUi": {
          irrigationPrimary: "primary",
          irrigationWater: "water",
        },
      },
      {
        window: {
          location: { pathname: "/account/irrigation" },
          history: { replaceState() {} },
          matchMedia: () => ({
            matches: false,
            addEventListener() {},
            removeEventListener() {},
          }),
        },
      },
    ).default;
    const props = {
      initialList: {
        status: true,
        data: [source],
        pagination: {
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: 1,
          from: 1,
          to: 1,
        },
        message: "",
      },
      initialSummary: { total_assets: 1 },
      initialOptions: options,
    };
    return {
      runtime,
      published,
      located,
      context,
      render: () => runtime.render(Manager, props),
    };
  }

  const opened = mount("", "1");
  opened.render();
  const tree = opened.render();
  const model = opened.published.at(-1);
  assert.equal(opened.context.irrigation.requestedId, null);
  assert.equal(model.selectedId, "1");
  assert.equal(
    nodes(tree).find((node) => node.type === "Details").props.selection.asset,
    source,
  );
  assert.deepEqual(clone(opened.located), [["source", source.geometry]]);
  assert.deepEqual(
    model.features.map((item) => item.id),
    ["1"],
  );
  opened.render();
  assert.equal(opened.located.length, 1);
  opened.runtime.cleanup();

  const filtered = mount("asset_type=pipeline", null);
  filtered.render();
  assert.deepEqual(clone(filtered.published.at(-1).features), []);
  assert.equal(filtered.published.at(-1).selectedId, null);
  assert.equal(filtered.located.length, 0);
  filtered.runtime.cleanup();
});

test("the form uses react-hook-form, never sends an owner and shows depth only for the four depth types", () => {
  const form = fs.readFileSync(feature + "IrrigationFormDialog.tsx", "utf8");
  assert.match(form, /from "react-hook-form"/);
  assert.match(form, /useForm<IrrigationFormValues>/);
  assert.match(
    form,
    /showDepth = source && supportsDepth\(options, sourceType\)/,
  );
  for (const file of fs.readdirSync(feature))
    assert.doesNotMatch(
      fs.readFileSync(feature + file, "utf8"),
      /user_id/,
      file,
    );
  // Map clicks and an editable line; no Drawing Library.
  const editor = fs.readFileSync(
    feature + "IrrigationLocationEditor.tsx",
    "utf8",
  );
  assert.match(editor, /editable: true/);
  assert.doesNotMatch(editor, /DrawingManager|libraries=drawing/);
});

test("English and Hindi farmerIrrigation messages match, keep their placeholders and use the prototype wording", () => {
  const flatten = (object, prefix = "") =>
    Object.entries(object).flatMap(([key, value]) =>
      typeof value === "object"
        ? flatten(value, `${prefix}${key}.`)
        : [[`${prefix}${key}`, value]],
    );
  const en = Object.fromEntries(flatten(messages.en.farmerIrrigation));
  const hi = Object.fromEntries(flatten(messages.hi.farmerIrrigation));
  assert.deepEqual(Object.keys(hi).sort(), Object.keys(en).sort());
  // Arguments only ({name} or {name, plural, …}), not the text of plural branches.
  const placeholders = (value) =>
    [
      ...new Set(
        [...value.matchAll(/\{(\w+)\s*[,}]/g)].map((match) => match[1]),
      ),
    ].sort();
  for (const key of Object.keys(en)) {
    assert.deepEqual(placeholders(hi[key]), placeholders(en[key]), key);
    // ICU reads an ASCII apostrophe as an escape.
    assert.doesNotMatch(en[key] + hi[key], /'/, key);
  }
  for (const [key, english, hindi] of [
    ["title", "Irrigation Manager", "सिंचाई प्रबंधन"],
    ["actions.addSource", "Add Water Source", "जल स्रोत जोड़ें"],
    ["actions.addPipeline", "Add Pipeline", "पाइपलाइन जोड़ें"],
    ["summary.totalLength", "Total Pipeline Length", "कुल पाइपलाइन लंबाई"],
    [
      "states.emptyTitle",
      "No irrigation assets yet",
      "अभी कोई सिंचाई संसाधन नहीं",
    ],
  ]) {
    assert.equal(en[key], english, key);
    assert.equal(hi[key], hindi, key);
  }
  assert.equal(
    translator("farmerIrrigation")("summary.allUnknown", { count: 1 }),
    "1 pipeline with unknown length",
  );
  assert.equal(
    translator("farmerIrrigation", "hi")("details.routeSet", { count: 3 }),
    "रूट बना है · 3 बिंदु",
  );
  for (const locale of ["en", "hi"]) {
    const actions = messages[locale].farmerDashboard.actions;
    for (const key of [
      "fitIrrigation",
      "farmBoundaries",
      "waterSources",
      "pipelines",
    ])
      assert.ok(actions[key], `${locale}.${key}`);
    const keys = Object.keys(actions);
    assert.equal(keys[keys.indexOf("fitAll") + 1], "fitIrrigation");
  }
});
