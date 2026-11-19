const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const areaFixture = require("./helpers/areaUnits.cjs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const base = "src/app/[locale]/(account)/account/(protected)/";
const feature = base + "farms/_components/";
const geoPath =
  "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(path, deps = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    URLSearchParams,
    crypto: require("node:crypto").webcrypto,
    setTimeout,
    clearTimeout,
    setInterval: (...args) => {
      const timer = setInterval(...args);
      timer.unref();
      return timer;
    },
    clearInterval,
    ...globals,
    require: (name) =>
      name === "react/jsx-runtime"
        ? jsx
        : Object.hasOwn(deps, name)
          ? deps[name]
          : Object.hasOwn(areaFixture.dependencies, name)
            ? areaFixture.dependencies[name]
            : name === geoPath
              ? geometry
              : (() => {
                  throw Error(`Unexpected dependency ${name}`);
                })(),
  });
  return module.exports;
}
function hooks() {
  let slots = [],
    cursor = 0,
    effects = [];
  const changed = (a, b) =>
    !a || !b || a.length !== b.length || a.some((v, i) => v !== b[i]);
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= {
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
    useRef(value) {
      return (slots[cursor++] ??= { current: value });
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
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps))
        effects.push(() => {
          slots[i]?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
    },
    startTransition: (fn) => fn(),
  };
  return {
    react,
    render(fn, props, commit) {
      cursor = 0;
      const result = fn(props);
      commit?.(result);
      const queue = effects;
      effects = [];
      queue.forEach((fn) => fn());
      return result;
    },
    cleanup() {
      slots.forEach((s) => s?.cleanup?.());
    },
  };
}
function nodes(tree) {
  return !tree || typeof tree !== "object"
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const t = (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key);
const intl = { useTranslations: () => t, useLocale: () => "hi" };
const icons = new Proxy({}, { get: (_, key) => String(key) });
const geometry = load(base + "_components/farmGeometry.ts");
const mapStyle = load("src/components/common/maps/farmMapStyle.ts");
const staticMap = load("src/components/common/maps/farmStaticMap.ts", {
  [geoPath]: geometry,
  "./farmMapStyle": mapStyle,
});

test("satellite URLs fit the saved closed polygon, convert longitude/latitude, and preserve its data", () => {
  const boundary = geometry.pointsToBoundary(square);
  const before = JSON.stringify(boundary);
  const url = staticMap.farmStaticMapUrl(
    { boundary, strokeColor: mapStyle.farmMapColor(2) },
    "test-key",
  );
  const params = new URL(url).searchParams;
  assert.equal(params.get("maptype"), "satellite");
  assert.equal(params.get("size"), "240x168");
  assert.equal(params.get("scale"), "2");
  assert.equal(params.get("format"), "png");
  assert.equal(params.has("center"), false);
  assert.equal(params.has("zoom"), false);
  const path = params.get("path").split("|");
  assert.equal(path[0], "weight:3");
  assert.equal(path[1], `color:0x${mapStyle.farmMapColor(2).slice(1)}ff`);
  assert.equal(path[2], `fillcolor:0x${mapStyle.farmMapColor(2).slice(1)}40`);
  const [lng, lat] = boundary.coordinates[0][0][0];
  assert.equal(path[3], `${lat},${lng}`);
  assert.equal(path.at(-1), path[3]);
  assert.equal(JSON.stringify(boundary), before);
  assert.equal(
    staticMap.farmStaticMapUrl(
      { boundary, strokeColor: mapStyle.farmMapColor(2) },
      "test-key",
    ),
    url,
  );
  assert.notEqual(
    staticMap.farmStaticMapUrl(
      {
        boundary: geometry.pointsToBoundary(
          square.map((p) => ({ ...p, lng: p.lng + 0.001 })),
        ),
      },
      "test-key",
    ),
    url,
  );
});

test("satellite previews accept confirmed farm coordinates, including zero, without inventing a boundary", () => {
  const params = new URL(
    staticMap.farmStaticMapUrl(
      { latitude: "0.0000000", longitude: "75.1234567" },
      "key",
    ),
  ).searchParams;
  assert.equal(params.get("center"), "0,75.1234567");
  assert.equal(params.get("zoom"), "17");
  assert.equal(params.has("path"), false);
  for (const location of [
    {},
    { latitude: "", longitude: "75" },
    { latitude: null, longitude: "75" },
    { latitude: Infinity, longitude: 75 },
    { latitude: 91, longitude: 75 },
    { latitude: 27, longitude: 181 },
  ]) {
    assert.equal(staticMap.farmStaticMapUrl(location, "key"), null);
  }
  assert.equal(
    staticMap.farmStaticMapUrl({ latitude: 27, longitude: 75 }, ""),
    null,
  );
});

test("malformed or unsupported boundaries use the illustration even if a centroid is present", () => {
  const boundary = geometry.pointsToBoundary(square);
  const malformed = [
    {},
    { type: "MultiPolygon", coordinates: [] },
    {
      ...boundary,
      coordinates: [boundary.coordinates[0], boundary.coordinates[0]],
    },
    {
      ...boundary,
      coordinates: [[boundary.coordinates[0][0], boundary.coordinates[0][0]]],
    },
    {
      ...boundary,
      coordinates: [[[...boundary.coordinates[0][0].slice(0, -1)]]],
    },
    {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [75, 27],
            [75, 27],
            [75, 27],
            [75, 27],
          ],
        ],
      ],
    },
    {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [75, 27],
            [76, 28],
            [76, 27],
            [75, 28],
            [75, 27],
          ],
        ],
      ],
    },
  ];
  for (const value of malformed) {
    assert.equal(
      staticMap.farmStaticMapUrl(
        { boundary: value, latitude: 27, longitude: 75 },
        "key",
      ),
      null,
    );
  }
  const invalid = clone(boundary);
  invalid.coordinates[0][0][1][0] = NaN;
  assert.equal(staticMap.farmStaticMapUrl({ boundary: invalid }, "key"), null);
});

test("a valid saved Polygon renders the same preview as its MultiPolygon equivalent", () => {
  const boundary = geometry.pointsToBoundary(square);
  const polygon = { type: "Polygon", coordinates: boundary.coordinates[0] };
  const original = JSON.stringify(polygon);
  assert.equal(
    staticMap.farmStaticMapUrl({ boundary: polygon }, "key"),
    staticMap.farmStaticMapUrl({ boundary }, "key"),
  );
  assert.equal(JSON.stringify(polygon), original);
  assert.equal(
    staticMap.farmStaticMapUrl(
      {
        boundary: {
          ...polygon,
          coordinates: [...polygon.coordinates, polygon.coordinates[0]],
        },
      },
      "key",
    ),
    null,
  );
});

test("preview diagnostics distinguish absent configuration, invalid geometry and missing farm coordinates", () => {
  assert.equal(staticMap.farmStaticMapPreview({}, "").reason, "missing-key");
  assert.equal(
    staticMap.farmStaticMapPreview({}, "key").reason,
    "missing-location",
  );
  assert.equal(
    staticMap.farmStaticMapPreview({ boundary: {} }, "key").reason,
    "invalid-boundary",
  );
  assert.equal(
    staticMap.farmStaticMapPreview(
      { boundary: geometry.pointsToBoundary(square) },
      "key",
    ).reason,
    null,
  );
});

function decodePolyline(encoded) {
  let cursor = 0,
    lat = 0,
    lng = 0;
  const points = [];
  function next() {
    let value = 0,
      shift = 0,
      part;
    do {
      part = encoded.charCodeAt(cursor++) - 63;
      value |= (part & 31) << shift;
      shift += 5;
    } while (part >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  }
  while (cursor < encoded.length) {
    lat += next();
    lng += next();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

test("large GPS boundaries use closed encoded paths within Google's URL limit without simplifying saved geometry", () => {
  const circle = Array.from({ length: 499 }, (_, i) => ({
    lat: 27 + Math.sin((i / 499) * Math.PI * 2) * 0.002,
    lng: 75 + Math.cos((i / 499) * Math.PI * 2) * 0.003,
  }));
  const boundary = geometry.pointsToBoundary(circle);
  assert.ok(boundary);
  const before = JSON.stringify(boundary);
  const url = staticMap.farmStaticMapUrl({ boundary }, "key");
  assert.ok(url);
  assert.ok(url.length < staticMap.STATIC_MAP_URL_LIMIT);
  const path = new URL(url).searchParams.get("path");
  assert.ok(path.includes("|enc:"));
  const decoded = decodePolyline(path.split("|enc:")[1]);
  assert.deepEqual(decoded[0], decoded.at(-1));
  assert.equal(decoded.length, 500);
  assert.ok(
    Math.abs(
      geometry.boundaryArea(decoded.slice(0, -1)) /
        geometry.boundaryArea(circle) -
        1,
    ) <= 0.01,
  );
  assert.equal(JSON.stringify(boundary), before);
  const tiny = geometry.pointsToBoundary(
    circle.map((p) => ({
      lat: 27 + (p.lat - 27) / 1000,
      lng: 75 + (p.lng - 75) / 1000,
    })),
  );
  assert.ok(tiny);
  assert.equal(staticMap.farmStaticMapUrl({ boundary: tiny }, "key"), null);
  assert.equal(
    staticMap.farmStaticMapUrl({ boundary }, "k".repeat(17000)),
    null,
  );
});

test("satellite colors reuse the dashboard palette and selection stroke, with a safe green default", () => {
  assert.equal(mapStyle.farmMapColor(1), "#7a5af8");
  assert.equal(mapStyle.farmMapColor(2), "#fd853a");
  assert.equal(mapStyle.farmMapColor(3), "#0ba5ec");
  assert.equal(mapStyle.farmMapColor(4), "#12b76a");
  assert.equal(mapStyle.farmMapColor(2, true), "#027a48");
  assert.equal(mapStyle.farmMapColor(NaN), mapStyle.DEFAULT_FARM_COLOR);
  const url = staticMap.farmStaticMapUrl(
    {
      boundary: geometry.pointsToBoundary(square),
      strokeColor: "red|weight:99",
    },
    "key",
  );
  assert.match(
    new URL(url).searchParams.get("path"),
    /color:0x12b76aff\|fillcolor:0x12b76a40/,
  );
});

function satelliteHarness(
  env = { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "browser-key" },
) {
  const outerRuntime = hooks();
  let runtime = hooks(),
    key;
  const Component = load(
    "src/components/common/maps/FarmSatellitePreview.tsx",
    {
      react: {
        useState: (...args) => runtime.react.useState(...args),
        useMemo: (...args) => outerRuntime.react.useMemo(...args),
      },
      "next/image": "StaticImage",
      "next-intl": intl,
      "@/icons": icons,
      "@/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") },
      "./farmStaticMap": staticMap,
    },
    { process: { env } },
  ).default;
  return {
    render(props) {
      const node = outerRuntime.render(Component, props);
      if (key !== node.key) {
        runtime.cleanup();
        runtime = hooks();
        key = node.key;
      }
      return runtime.render(node.type, node.props);
    },
  };
}

test("satellite images load directly and lazily without cropping attribution or changing the thumbnail frame", () => {
  const h = satelliteHarness();
  const tree = h.render({
    name: "Saved Farm",
    boundary: geometry.pointsToBoundary(square),
    className: "hidden h-14 w-20 shrink-0 sm:flex",
  });
  const image = nodes(tree).find((n) => n.type === "StaticImage");
  assert.equal(image.props.unoptimized, true);
  assert.equal(image.props.loading, "lazy");
  assert.equal(image.props.decoding, "async");
  assert.match(
    image.props.src,
    /^https:\/\/maps.googleapis.com\/maps\/api\/staticmap\?/,
  );
  assert.equal(image.props.width / image.props.height, 80 / 56);
  assert.match(image.props.alt, /Saved Farm/);
  assert.match(image.props.className, /object-contain/);
  assert.match(image.props.className, /opacity-0/);
  assert.match(tree.props.className, /h-14 w-20/);
  assert.ok(nodes(tree).some((n) => n.type === "FarmLandscapeIcon"));
  assert.equal(tree.props["data-farm-preview"], "loading");
});

test("image errors stop retries until the saved URL changes; loading and Google error images retain the illustration", () => {
  const h = satelliteHarness();
  let props = { name: "Saved Farm", latitude: "27", longitude: "75" };
  let tree = h.render(props);
  nodes(tree)
    .find((n) => n.type === "StaticImage")
    .props.onError();
  tree = h.render({ ...props, name: "Renamed farm" });
  assert.equal(
    nodes(tree).some((n) => n.type === "StaticImage"),
    false,
  );
  assert.equal(tree.props.role, "img");
  assert.equal(tree.props["data-farm-preview"], "error");
  assert.equal(tree.props["data-farm-preview-reason"], "image-error");
  assert.match(tree.props["aria-label"], /Renamed farm/);
  props = { ...props, longitude: "75.001" };
  tree = h.render(props);
  assert.equal(tree.props["data-farm-preview"], "loading");
  nodes(tree)
    .find((n) => n.type === "StaticImage")
    .props.onLoad({ currentTarget: { naturalWidth: 480, naturalHeight: 336 } });
  tree = h.render(props);
  assert.equal(tree.props["data-farm-preview"], "loaded");
  assert.doesNotMatch(
    nodes(tree).find((n) => n.type === "StaticImage").props.className,
    /opacity-0/,
  );
  props = { ...props, longitude: "75.002" };
  tree = h.render(props);
  nodes(tree)
    .find((n) => n.type === "StaticImage")
    .props.onLoad({ currentTarget: { naturalWidth: 256, naturalHeight: 256 } });
  assert.equal(
    nodes(h.render(props)).some((n) => n.type === "StaticImage"),
    false,
  );
  assert.equal(
    h.render(props).props["data-farm-preview-reason"],
    "unexpected-image-size",
  );
});

test("missing key/data safely falls back, the dedicated key takes priority, and a server fallback never bypasses signing", () => {
  for (const [env, props] of [
    [{}, { latitude: 27, longitude: 75 }],
    [{ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "key" }, {}],
    [
      { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "key" },
      { latitude: 27, longitude: 75, src: null },
    ],
  ]) {
    const tree = satelliteHarness(env).render({ name: "Farm", ...props });
    assert.equal(
      nodes(tree).some((n) => n.type === "StaticImage"),
      false,
    );
    assert.ok(nodes(tree).some((n) => n.type === "FarmLandscapeIcon"));
  }
  const tree = satelliteHarness({
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "js-key",
    NEXT_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY: "static-key",
  }).render({ name: "Farm", latitude: 27, longitude: 75 });
  assert.equal(
    new URL(
      nodes(tree).find((n) => n.type === "StaticImage").props.src,
    ).searchParams.get("key"),
    "static-key",
  );
});

test("unavailable thumbnail status identifies the missing input without exposing keys or coordinates", () => {
  const missingKey = satelliteHarness({}).render({
    name: "Farm",
    latitude: 27,
    longitude: 75,
  });
  assert.equal(missingKey.props["data-farm-preview-reason"], "missing-key");
  const missingLocation = satelliteHarness().render({ name: "Farm" });
  assert.equal(
    missingLocation.props["data-farm-preview-reason"],
    "missing-location",
  );
  const signing = satelliteHarness().render({ name: "Farm", src: null });
  assert.equal(
    signing.props["data-farm-preview-reason"],
    "server-preview-unavailable",
  );
  assert.equal(signing.props["data-farm-preview"], "unavailable");
});

test("optional server signing uses HMAC-SHA1 on the encoded path/query and never returns its secret", () => {
  const crypto = require("node:crypto");
  const env = {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "js-key",
    NEXT_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY: "static-key",
    GOOGLE_MAPS_STATIC_SIGNING_SECRET: Buffer.from(
      "private-test-secret",
    ).toString("base64url"),
  };
  const server = load(
    "src/components/common/maps/farmStaticMap.server.ts",
    {
      "server-only": {},
      "node:crypto": crypto,
      "./farmMapStyle": mapStyle,
      "./farmStaticMap": staticMap,
    },
    { process: { env }, Buffer, URL },
  );
  const farm = {
    id: 2,
    boundary: geometry.pointsToBoundary(square),
    latitude: null,
    longitude: null,
  };
  const sources = server.signedFarmSatelliteSources([farm]);
  const url = new URL(sources[2].normal);
  const signature = url.searchParams.get("signature");
  url.searchParams.delete("signature");
  const expected = crypto
    .createHmac(
      "sha1",
      Buffer.from(env.GOOGLE_MAPS_STATIC_SIGNING_SECRET, "base64url"),
    )
    .update(url.pathname + url.search)
    .digest("base64url");
  assert.equal(signature, expected);
  assert.equal(url.searchParams.get("key"), "static-key");
  assert.ok(sources[2].selected.includes("signature="));
  assert.notEqual(sources[2].normal, sources[2].selected);
  assert.equal(
    server.signedFarmSatelliteSources([farm])[2].normal,
    sources[2].normal,
  );
  assert.equal(
    JSON.stringify(sources).includes(env.GOOGLE_MAPS_STATIC_SIGNING_SECRET),
    false,
  );
  env.GOOGLE_MAPS_STATIC_SIGNING_SECRET = "not a base64 secret!";
  assert.equal(server.signedFarmSatelliteSources([farm])[2].normal, null);
  delete env.GOOGLE_MAPS_STATIC_SIGNING_SECRET;
  assert.equal(server.signedFarmSatelliteSources([farm]), undefined);
});

test("the paginated list requests saved boundaries once, authenticates first, and signs only backend-owned records", async () => {
  const calls = [],
    farm = { id: 5, name: "Saved farm" };
  const response = {
    status: true,
    data: [farm],
    pagination: { current_page: 2, last_page: 3 },
  };
  const sources = {
    5: { normal: "signed-normal", selected: "signed-selected" },
  };
  const actions = load("src/actions/account/farms.ts", {
    "next-intl/server": { getTranslations: async () => t },
    "@/lib/userAuth/dal": { requireUser: async () => calls.push("auth") },
    "@/lib/api/handleActionError": {
      handleActionError: () => ({ success: false }),
    },
    "@/lib/api/ApiError": apiError,
    "@/lib/apis/account/regions": { accountRegionsAPI: {} },
    "@/lib/apis/account/farms": {
      accountFarmsAPI: {
        list: async (filters) => {
          calls.push(clone(filters));
          return response;
        },
      },
    },
    "@/components/common/maps/farmStaticMap.server": {
      signedFarmSatelliteSources: (farms) => {
        assert.equal(farms, response.data);
        return sources;
      },
    },
  });
  const result = await actions.getFarmerFarms({
    status: "inactive",
    page: 2,
    per_page: 15,
  });
  assert.equal(result.data, response);
  assert.equal(result.satellitePreviews, sources);
  assert.deepEqual(calls, [
    "auth",
    { status: "inactive", page: 2, per_page: 15, include_boundary: 1 },
  ]);
});

test("farm list thumbnails keep saved geometry, dimensions, selection, edit and locate actions intact", () => {
  const selected = [],
    edited = [];
  const Component = load(feature + "FarmList.tsx", {
    "next-intl": intl,
    "@headlessui/react": Object.fromEntries(
      ["Menu", "MenuButton", "MenuItems", "MenuItem"].map((key) => [key, key]),
    ),
    "@/icons": icons,
    "@/components/common/maps/FarmSatellitePreview": "SatellitePreview",
    "@/components/common/maps/farmMapStyle": mapStyle,
  }).default;
  const farm = {
    id: 2,
    name: "Saved farm",
    boundary: geometry.pointsToBoundary(square),
    latitude: "27",
    longitude: "75",
    has_boundary: true,
    is_active: true,
    area: "2.000",
    area_unit: "ha",
  };
  const tree = Component({
    farms: [farm],
    selectedId: 2,
    busyId: null,
    onSelect: (id) => selected.push(id),
    onEdit: (record) => edited.push(record),
    onStatus() {},
    satellitePreviews: { 2: { normal: "normal", selected: "selected" } },
  });
  const preview = nodes(tree).find((n) => n.type === "SatellitePreview");
  assert.equal(preview.props.boundary, farm.boundary);
  assert.equal(preview.props.src, "selected");
  assert.equal(preview.props.strokeColor, mapStyle.farmMapColor(2, true));
  assert.match(preview.props.className, /h-14 w-20/);
  assert.equal(
    nodes(tree).find((n) => n.type === "li").props["aria-current"],
    "true",
  );
  const buttons = nodes(tree).filter((n) => n.type === "button");
  buttons[0].props.onClick();
  buttons
    .find((n) => n.props["aria-label"]?.startsWith("locateFarm"))
    .props.onClick();
  buttons
    .find((n) => n.props["aria-label"]?.startsWith("editNamedFarm"))
    .props.onClick();
  assert.deepEqual(selected, [2, 2]);
  assert.equal(edited[0], farm);
});

test("thumbnails reuse workspace geometry by farm ID only when the row omits it, preserving explicit removals and newer rows", () => {
  const Component = load(feature + "FarmList.tsx", {
    "next-intl": intl,
    "@headlessui/react": Object.fromEntries(
      ["Menu", "MenuButton", "MenuItems", "MenuItem"].map((key) => [key, key]),
    ),
    "@/icons": icons,
    "@/components/common/maps/FarmSatellitePreview": "SatellitePreview",
    "@/components/common/maps/farmMapStyle": mapStyle,
  }).default;
  const saved = {
    id: 2,
    boundary: geometry.pointsToBoundary(square),
    latitude: "27",
    longitude: "75",
    updated_at: "2026-11-15T10:00:00Z",
  };
  const row = {
    id: 2,
    name: "Current row",
    latitude: null,
    longitude: null,
    has_boundary: true,
    area_unit: "ha",
    updated_at: saved.updated_at,
  };
  const props = {
    farms: [row],
    selectedId: 2,
    busyId: null,
    onSelect() {},
    onEdit() {},
    onStatus() {},
    savedFarms: [saved],
    savedSatellitePreviews: {
      2: { normal: "saved-normal", selected: "saved-selected" },
    },
  };
  const preview = (values) =>
    nodes(Component(values)).find((n) => n.type === "SatellitePreview").props;
  let result = preview(props);
  assert.equal(result.boundary, saved.boundary);
  assert.equal(result.latitude, saved.latitude);
  assert.equal(result.src, "saved-selected");
  assert.ok(staticMap.farmStaticMapUrl(result, "key"));
  result = preview({ ...props, farms: [{ ...row, boundary: null }] });
  assert.equal(result.boundary, null);
  assert.equal(result.latitude, null);
  result = preview({
    ...props,
    farms: [{ ...row, updated_at: "2026-11-15T11:00:00Z" }],
  });
  assert.equal(result.boundary, undefined);
  assert.equal(result.latitude, null);
  result = preview({ ...props, farms: [{ ...row, id: 99 }] });
  assert.equal(result.boundary, undefined);
});
const filters = load(feature + "farmFilters.ts");
const formTypes = load(feature + "farmFormTypes.ts");
const apiError = load("src/lib/api/ApiError.ts");
const square = [
  { lat: 26, lng: 77 },
  { lat: 26, lng: 77.001 },
  { lat: 26.001, lng: 77.001 },
  { lat: 26.001, lng: 77 },
];

test("boundary normalization closes a CCW MultiPolygon in longitude/latitude without changing the draft", () => {
  const original = JSON.stringify(square);
  const boundary = geometry.pointsToBoundary(square);
  assert.equal(boundary.type, "MultiPolygon");
  assert.deepEqual(clone(boundary.coordinates[0][0][0]), [77, 26]);
  assert.deepEqual(clone(geometry.boundaryPoints(boundary)), square);
  assert.equal(JSON.stringify(square), original);
  assert.equal(geometry.boundaryError([...square].reverse()), null);
});
test("geometry rejects crossings, touching, duplicate vertices, malformed coordinates, zero area and point overflow", () => {
  assert.equal(geometry.boundaryError(square.slice(0, 2)), "vertices");
  assert.equal(geometry.boundaryError([...square, square[0]]), "vertices");
  assert.equal(
    geometry.boundaryError([square[0], square[2], square[1], square[3]]),
    "intersection",
  );
  assert.equal(
    geometry.boundaryError([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ]),
    "area",
  );
  assert.equal(
    geometry.boundaryError([{ lat: 91, lng: 77 }, square[1], square[2]]),
    "coordinates",
  );
  assert.equal(
    geometry.boundaryError([{ lat: NaN, lng: 77 }, square[1], square[2]]),
    "coordinates",
  );
  assert.equal(
    geometry.boundaryError(
      Array.from({ length: 500 }, (_, i) => ({
        lat: i / 10000,
        lng: i / 10000,
      })),
    ),
    "vertices",
  );
  assert.equal(
    geometry.boundaryError([
      { lat: 0, lng: 179 },
      { lat: 1, lng: -179 },
      { lat: 1, lng: 179 },
    ]),
    "coordinates",
  );
});
test("spherical measurements use square metres and configured units; unresolved Bigha has no invented factor", () => {
  const area = geometry.boundaryArea(square);
  assert.ok(area > 10000 && area < 12000);
  assert.ok(geometry.pointDistance(square[0], square[1]) > 90);
  assert.equal(
    areaFixture.utils.fromSquareMeters(10000, "hectare", areaFixture.config),
    1,
  );
  assert.equal(
    areaFixture.utils.fromSquareMeters(
      4046.8564224,
      "acre",
      areaFixture.config,
    ),
    1,
  );
  assert.equal(
    areaFixture.utils.fromSquareMeters(10000, "bigha", areaFixture.config),
    null,
  );
});
test("URL filters preserve inactive, reject invalid pages and cap backend search length", () => {
  assert.deepEqual(clone(filters.farmFilters(" खेत ", "inactive", "3")), {
    search: "खेत",
    status: "inactive",
    page: 3,
    per_page: 15,
  });
  assert.equal(
    filters.farmFilters("x".repeat(151), "bad", "-2").search.length,
    150,
  );
  assert.equal(filters.farmFilters(null, null, "Infinity").page, 1);
});

function boundaryHarness(initial, savedAreaSqm) {
  const runtime = hooks(),
    watchers = [],
    cleared = [],
    events = {};
  const document = {
    visibilityState: "visible",
    addEventListener: (name, fn) => (events[name] = fn),
    removeEventListener: (name) => delete events[name],
  };
  const navigator = {
    geolocation: {
      watchPosition: (success, error, options) => {
        watchers.push({ success, error, options });
        return watchers.length;
      },
      clearWatch: (id) => cleared.push(id),
    },
  };
  const Hook = load(
    "src/hooks/useFarmBoundary.ts",
    { react: runtime.react, [geoPath]: geometry },
    { navigator, document, window: { isSecureContext: true } },
  ).default;
  const render = () => runtime.render(() => Hook(initial, savedAreaSqm));
  function reading(index, point, time = Date.now(), accuracy = 5) {
    watchers[index].success({
      coords: { latitude: point.lat, longitude: point.lng, accuracy },
      timestamp: time,
    });
  }
  return { render, runtime, watchers, cleared, events, document, reading };
}
test("manual draft confirms, edits, recalculates and clears without altering government record fields", () => {
  const h = boundaryHarness();
  let s = h.render();
  s.draw();
  for (const point of square) {
    s = h.render();
    s.add(point);
  }
  s = h.render();
  assert.equal(s.boundary, null);
  assert.ok(s.area > 0);
  assert.equal(s.confirm(), true);
  s = h.render();
  assert.equal(s.draft.boundary_source, "manual");
  assert.ok(s.boundary);
  s.edit();
  s = h.render();
  s.update([...square.slice(0, 3), { lat: 26.002, lng: 77 }]);
  s = h.render();
  assert.equal(s.boundary, null);
  assert.ok(s.area > geometry.boundaryArea(square));
  s.confirm();
  s = h.render();
  s.undo();
  assert.equal(h.render().points.length, 4);
  s.clear();
  s = h.render();
  assert.equal(s.area, null);
  assert.deepEqual(clone(s.draft), {
    boundary: null,
    boundary_source: null,
    gps_accuracy_m: null,
  });
  h.runtime.cleanup();
});
test("GPS never starts automatically; duplicate starts share one watcher and noisy/stale/jumping readings are rejected", () => {
  const h = boundaryHarness();
  let s = h.render();
  assert.equal(h.watchers.length, 0);
  s.changeMode("gps");
  s = h.render();
  s.start();
  s.start();
  assert.equal(h.watchers.length, 1);
  assert.equal(h.watchers[0].options.enableHighAccuracy, true);
  const now = Date.now();
  h.reading(0, square[0], now, 90);
  s = h.render();
  assert.equal(s.points.length, 0);
  assert.equal(s.notice, "gpsLowAccuracy");
  h.reading(0, square[0], now);
  s = h.render();
  assert.equal(s.points.length, 1);
  h.reading(0, square[0], now + 1000);
  assert.equal(h.render().points.length, 1);
  h.reading(0, { lat: 30, lng: 80 }, now + 2000);
  s = h.render();
  assert.equal(s.points.length, 1);
  assert.equal(s.notice, "gpsJump");
  h.reading(0, square[1], now - 40000);
  assert.equal(h.render().notice, "gpsInvalid");
  h.runtime.cleanup();
  assert.equal(h.cleared.length, 1);
});
test("GPS pause/resume preserves points, ignores stale subscription callbacks and preserves GPS source after vertex edits", () => {
  const h = boundaryHarness();
  let s = h.render();
  s.changeMode("gps");
  s = h.render();
  s.start();
  const now = Date.now();
  h.reading(0, square[0], now);
  s = h.render();
  s.pause();
  assert.deepEqual(h.cleared, [1]);
  s = h.render();
  assert.equal(s.gpsState, "paused");
  s.start();
  h.reading(0, square[1], now + 10000);
  assert.equal(h.render().points.length, 1);
  for (let i = 1; i < square.length; i++) {
    h.reading(1, square[i], now + i * 10000);
    s = h.render();
  }
  assert.equal(s.confirm(), true);
  s = h.render();
  assert.equal(s.draft.boundary_source, "gps");
  assert.equal(s.draft.gps_accuracy_m, 5);
  s.edit();
  s = h.render();
  s.update(square);
  s = h.render();
  s.confirm();
  assert.equal(h.render().draft.boundary_source, "gps");
  h.runtime.cleanup();
});
test("hidden pages pause GPS, permission errors preserve accepted points, and unmount removes listeners/watchers", () => {
  const h = boundaryHarness();
  let s = h.render();
  s.changeMode("gps");
  s = h.render();
  s.start();
  h.reading(0, square[0]);
  h.document.visibilityState = "hidden";
  h.events.visibilitychange();
  s = h.render();
  assert.equal(s.gpsState, "paused");
  assert.equal(s.notice, "gpsInterrupted");
  assert.equal(s.points.length, 1);
  s.start();
  h.watchers[1].error({ code: 1 });
  s = h.render();
  assert.equal(s.gpsState, "error");
  assert.equal(s.notice, "gpsDenied");
  assert.equal(s.points.length, 1);
  h.runtime.cleanup();
  assert.equal(Object.keys(h.events).length, 0);
});

test("Farm actions authenticate, collect all region pages and allowlist a single final creation payload", async () => {
  const calls = [];
  let auth = 0;
  const actions = load("src/actions/account/farms.ts", {
    "@/components/common/maps/farmStaticMap.server": {
      signedFarmSatelliteSources: () => undefined,
    },
    "next-intl/server": { getTranslations: async () => t },
    "@/lib/userAuth/dal": { requireUser: async () => auth++ },
    "@/lib/api/handleActionError": {
      handleActionError: (error, message) => ({
        success: false,
        message,
        errors: error.errors,
      }),
    },
    "@/lib/api/ApiError": apiError,
    "@/lib/apis/account/regions": {
      accountRegionsAPI: {
        list: async (type, parent, page = 1) => {
          calls.push([type, parent, page]);
          return {
            status: true,
            data: [{ id: page, region_type: type }],
            pagination: { last_page: 2 },
          };
        },
      },
    },
    "@/lib/apis/account/farms": {
      accountFarmsAPI: {
        create: async (payload, key) => {
          calls.push({ payload, key });
          return { status: true, data: { id: 10, ...payload } };
        },
      },
    },
  });
  const regions = await actions.getFarmRegions("district", 1);
  assert.equal(regions.data.length, 2);
  assert.deepEqual(calls.slice(0, 2), [
    ["district", 1, 1],
    ["district", 1, 2],
  ]);
  const payload = {
    name: "खेत",
    description: null,
    ownership_type: "owned",
    area: "2.345",
    area_unit: "bigha",
    state_id: 1,
    district_id: 2,
    tehsil_id: null,
    village: "गाँव",
    address: null,
    boundary: null,
    boundary_source: null,
    gps_accuracy_m: null,
    user_id: 999,
    actual_area: 999,
  };
  const result = await actions.saveFarmerFarm(payload, "uuid");
  assert.equal(result.success, true);
  assert.equal(auth, 2);
  assert.equal(calls[2].key, "uuid");
  assert.equal(calls[2].payload.user_id, undefined);
  assert.equal(calls[2].payload.actual_area, undefined);
});

function wizardHarness({
  profile,
  farm,
  boundary = farm?.boundary,
  saveResult,
  trigger,
  unitMetadata = areaFixture.metadata,
} = {}) {
  const runtime = hooks(),
    saved = [],
    closed = [],
    calls = [],
    notifications = [],
    errors = {};
  let config;
  const session = {
    points: boundary ? square : [],
    source: farm?.boundary_source ?? "manual",
    accuracy: farm?.gps_accuracy_m == null ? null : Number(farm.gps_accuracy_m),
    boundary: boundary ?? null,
    draft: {
      boundary: boundary ?? null,
      boundary_source: boundary ? "manual" : null,
      gps_accuracy_m: null,
    },
    active: false,
    pause() {},
    clear() {
      session.points = [];
      session.boundary = null;
      session.draft = {
        boundary: null,
        boundary_source: null,
        gps_accuracy_m: null,
      };
    },
    setNotice: (value) => (session.notice = value),
  };
  const form = {
    formState: { errors, isDirty: false },
    control: {},
    getValues: () => config.defaultValues,
    getFieldState: (name) => ({ isDirty: Boolean(form.dirtyFields?.[name]) }),
    resetField: (name, options) => {
      config.defaultValues[name] = options.defaultValue;
    },
    trigger: async (fields) => (trigger ? trigger(fields) : true),
    clearErrors() {},
    setError: (field, error) => {
      if (field === "root.server") errors.root = { server: error };
      else errors[field] = error;
    },
  };
  const Component = load(feature + "AddFarmDialog.tsx", {
    "@/hooks/useAreaUnits": { __esModule: true, default: () => unitMetadata },
    react: runtime.react,
    "next-intl": intl,
    "react-hot-toast": {
      success: (v) => notifications.push(["success", v]),
      error: (v) => notifications.push(["error", v]),
    },
    "@headlessui/react": Object.fromEntries(
      [
        "Dialog",
        "DialogBackdrop",
        "DialogPanel",
        "DialogTitle",
        "Description",
      ].map((key) => [key, key]),
    ),
    "react-hook-form": {
      useForm: (options) => {
        config ??= options;
        return form;
      },
      useWatch: () => config.defaultValues,
    },
    "@/hooks/useFarmBoundary": { default: () => session, __esModule: true },
    [geoPath]: geometry,
    "@/actions/account/farms": {
      saveFarmerFarm: async (...args) => {
        calls.push(args);
        return typeof saveResult === "function"
          ? saveResult(...args)
          : (saveResult ?? {
              success: true,
              data: { id: 5 },
              message: "saved",
            });
      },
    },
    "@/components/common/maps/BoundaryConfirmDialog": "Confirm",
    "@/icons": icons,
    "./FarmStepper": "Stepper",
    "./FarmInformationStep": "Information",
    "./FarmLocationStep": "Location",
    "./FarmBoundaryStep": "Boundary",
    "./FarmReviewStep": "Review",
    "./FarmIllustration": "Illustration",
    "./farmFormTypes": formTypes,
  }).default;
  const props = {
    farm,
    profile: profile ?? {
      state_id: 1,
      district_id: 2,
      village: "गाँव",
      preferred_units: "bigha_pakka",
    },
    onClose: () => closed.push(true),
    onSaved: (farm) => saved.push(farm),
  };
  const render = () => runtime.render(Component, props);
  const get = (type) => nodes(render()).find((n) => n.type === type);
  render();
  const submit = () => get("form").props.onSubmit({ preventDefault() {} });
  const Stepper = load(feature + "FarmStepper.tsx", {
    "next-intl": intl,
    "@/icons": icons,
  }).default;
  return {
    render,
    get,
    submit,
    form,
    values: config.defaultValues,
    props,
    calls,
    saved,
    closed,
    session,
    notifications,
    stepper() {
      return Stepper(get("Stepper").props);
    },
    async clickStep(index) {
      const button = nodes(Stepper(get("Stepper").props)).filter(
        (node) => node.type === "button",
      )[index];
      assert.equal(
        button.props.disabled,
        false,
        `Step ${index + 1} must be available`,
      );
      button.props.onClick();
      await tick();
    },
    async next() {
      submit();
      await tick();
    },
  };
}
test("four wizard steps preserve profile defaults and local values; only final Save creates a farm", async () => {
  const h = wizardHarness();
  assert.equal(
    nodes(h.stepper()).filter((node) => node.type === "CheckLineIcon").length,
    0,
  );
  assert.equal(h.values.area_unit, "bigha_pakka");
  assert.equal(h.values.state_id, "1");
  assert.equal(h.values.village, "गाँव");
  h.values.name = "  नया खेत  ";
  h.values.area = "10.123";
  await h.next();
  assert.equal(h.get("Stepper").props.step, 1);
  assert.equal(
    nodes(h.stepper()).filter((node) => node.type === "CheckLineIcon").length,
    1,
  );
  await h.next();
  assert.equal(h.get("Stepper").props.step, 2);
  assert.equal(h.calls.length, 0);
  const skip = nodes(h.render()).find(
    (n) => n.type === "button" && n.props.children === "skipBoundary",
  );
  skip.props.onClick();
  assert.equal(h.get("Stepper").props.step, 3);
  assert.ok(h.get("Review"));
  assert.equal(h.calls.length, 0);
  await h.next();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0].name, "नया खेत");
  assert.equal(h.calls[0][0].area, "10.123");
  assert.equal(h.calls[0][0].boundary, null);
  assert.equal(h.saved.length, 1);
  assert.equal(h.notifications.filter((n) => n[0] === "success").length, 1);
});
test("wizard validation blocks advancement and final errors return to the correct field without losing values", async () => {
  let allow = false;
  const h = wizardHarness({
    trigger: () => allow,
    saveResult: {
      success: false,
      message: "invalid",
      errors: { village: ["backend village error"] },
    },
  });
  h.values.name = "Retained";
  await h.next();
  assert.equal(h.get("Stepper").props.step, 0);
  assert.equal(h.calls.length, 0);
  allow = true;
  await h.next();
  await h.next();
  nodes(h.render())
    .find((n) => n.props?.children === "skipBoundary")
    .props.onClick();
  await h.next();
  assert.equal(h.get("Stepper").props.step, 1);
  assert.equal(
    h.form.formState.errors.village.message,
    "backend village error",
  );
  assert.equal(h.values.name, "Retained");
  assert.equal(h.saved.length, 0);
});
test("pending save blocks duplicate submissions/dismissal; retry reuses the creation key", async () => {
  let resolve;
  const first = new Promise((r) => (resolve = r));
  let count = 0;
  const h = wizardHarness({
    saveResult: () =>
      ++count === 1
        ? first
        : { success: true, data: { id: 9 }, message: "saved" },
  });
  h.values.name = "Draft";
  h.values.area = "1";
  await h.next();
  await h.next();
  nodes(h.render())
    .find((n) => n.props?.children === "skipBoundary")
    .props.onClick();
  h.submit();
  h.submit();
  await tick();
  assert.equal(h.calls.length, 1);
  h.get("Dialog").props.onClose();
  assert.equal(h.closed.length, 0);
  resolve({ success: false, message: "timeout" });
  await tick();
  assert.equal(h.saved.length, 0);
  h.values.name = "Corrected after timeout";
  await h.next();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0][1], h.calls[1][1]);
  assert.equal(h.saved.length, 1);
});
test("unfinished boundaries cannot advance; skipping or canceling meaningful drafts requires confirmation", async () => {
  const h = wizardHarness();
  h.values.name = "Draft";
  await h.next();
  await h.next();
  h.session.points = square;
  await h.next();
  assert.equal(h.get("Stepper").props.step, 2);
  assert.equal(h.session.notice, "finishOrSkipBoundary");
  nodes(h.render())
    .find((n) => n.props?.children === "skipBoundary")
    .props.onClick();
  assert.ok(h.get("Confirm"));
  assert.equal(h.session.points.length, 4);
  h.get("Confirm").props.onConfirm();
  assert.equal(h.session.points.length, 0);
  assert.equal(h.get("Stepper").props.step, 3);
  h.form.formState.isDirty = true;
  h.get("Dialog").props.onClose();
  assert.equal(h.closed.length, 0);
  h.get("Confirm").props.onConfirm();
  assert.equal(h.closed.length, 1);
  assert.equal(h.calls.length, 0);
});

const savedFarm = {
  id: 42,
  name: "Saved farm",
  description: "Existing details",
  ownership_type: "owned",
  area: "2.500",
  area_unit: "ha",
  state_id: 10,
  district_id: 20,
  tehsil_id: null,
  village: "Existing village",
  address: "Existing address",
  boundary: null,
  boundary_source: null,
  gps_accuracy_m: null,
};

test("edit opens every step for direct navigation, including Review without an optional boundary", async () => {
  let validations = 0;
  const h = wizardHarness({
    farm: savedFarm,
    trigger: () => {
      validations++;
      return true;
    },
  });
  assert.equal(h.values.name, savedFarm.name);
  assert.equal(h.values.area_unit, "hectare");
  assert.equal(h.values.state_id, "10");
  assert.equal(h.get("Stepper").props.reached, 3);
  assert.equal(
    nodes(h.stepper()).filter((node) => node.type === "CheckLineIcon").length,
    4,
  );
  for (const step of [3, 1, 2, 0, 3]) {
    await h.clickStep(step);
    assert.equal(h.get("Stepper").props.step, step);
    const indicators = nodes(h.stepper());
    assert.equal(
      indicators.filter((node) => node.type === "CheckLineIcon").length,
      4,
    );
    assert.equal(
      indicators.filter((node) => node.props?.["aria-current"] === "step")
        .length,
      1,
    );
  }
  assert.equal(validations, 0);
  assert.equal(h.calls.length, 0);
  assert.equal(h.get("Review").props.values.address, savedFarm.address);
  await h.next();
  assert.equal(validations, 2);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][2], savedFarm.id);
  assert.equal(h.calls[0][0].boundary, null);
});

test("edit step jumps preserve a saved boundary and unsaved form changes", async () => {
  const boundary = geometry.pointsToBoundary(square);
  const h = wizardHarness({
    farm: { ...savedFarm, boundary, boundary_source: "manual" },
  });
  h.values.name = "Edited farm";
  for (const step of [2, 1, 0, 3]) await h.clickStep(step);
  assert.equal(h.values.name, "Edited farm");
  assert.equal(h.session.boundary, boundary);
  await h.next();
  assert.equal(h.calls[0][0].name, "Edited farm");
  assert.equal(h.calls[0][0].boundary, boundary);
});

test("unchanged edits close without confirmation through Cancel, Close or dialog dismissal", async () => {
  const boundary = geometry.pointsToBoundary(square);
  for (const dismiss of ["cancel", "close", "dialog"]) {
    const h = wizardHarness({
      farm: {
        ...savedFarm,
        boundary,
        boundary_source: "gps",
        gps_accuracy_m: "5.00",
      },
    });
    for (const step of [2, 3, 1, 0]) await h.clickStep(step);
    if (dismiss === "dialog") h.get("Dialog").props.onClose();
    else if (dismiss === "close")
      nodes(h.render())
        .find(
          (node) =>
            node.type === "button" && node.props["aria-label"] === "close",
        )
        .props.onClick();
    else
      nodes(h.render())
        .find(
          (node) => node.type === "button" && node.props.children === "cancel",
        )
        .props.onClick();
    assert.equal(
      h.closed.length,
      1,
      `${dismiss} should close the unchanged edit`,
    );
    assert.equal(h.get("Confirm"), undefined);
    assert.equal(h.calls.length, 0);
  }
  const withoutBoundary = wizardHarness({ farm: savedFarm });
  withoutBoundary.get("Dialog").props.onClose();
  assert.equal(withoutBoundary.closed.length, 1);
});

test("boundary-only edits and removals ask for confirmation even when form fields are unchanged", () => {
  const boundary = geometry.pointsToBoundary(square);
  for (const change of ["move", "remove", "source", "accuracy"]) {
    const h = wizardHarness({
      farm: {
        ...savedFarm,
        boundary,
        boundary_source: "gps",
        gps_accuracy_m: "5.00",
      },
    });
    if (change === "move")
      h.session.points = [{ lat: 26.0001, lng: 77 }, ...square.slice(1)];
    else if (change === "remove") h.session.clear();
    else if (change === "source") h.session.source = "manual";
    else h.session.accuracy = 10;
    h.get("Dialog").props.onClose();
    assert.equal(
      h.closed.length,
      0,
      `${change} must retain the draft until confirmed`,
    );
    assert.ok(h.get("Confirm"));
    h.get("Confirm").props.onClose();
    assert.equal(h.closed.length, 0);
    assert.equal(h.get("Confirm"), undefined);
    assert.equal(h.calls.length, 0);
  }
});

test("reverting boundary changes allows immediate close while real form changes still require confirmation", () => {
  const boundary = geometry.pointsToBoundary(square);
  const h = wizardHarness({
    farm: { ...savedFarm, boundary, boundary_source: "manual" },
  });
  h.session.points = [{ lat: 26.0001, lng: 77 }, ...square.slice(1)];
  h.get("Dialog").props.onClose();
  assert.ok(h.get("Confirm"));
  h.get("Confirm").props.onClose();
  h.session.points = square.map((point) => ({ ...point }));
  h.get("Dialog").props.onClose();
  assert.equal(h.closed.length, 1);
  const edited = wizardHarness({ farm: savedFarm });
  edited.values.name = "Changed name";
  edited.form.formState.isDirty = true;
  edited.get("Dialog").props.onClose();
  assert.ok(edited.get("Confirm"));
  assert.equal(edited.closed.length, 0);
  edited.get("Confirm").props.onConfirm();
  assert.equal(edited.closed.length, 1);
});

test("new farm cancellation distinguishes an empty draft from an unsaved transferred boundary", () => {
  const empty = wizardHarness();
  empty.get("Dialog").props.onClose();
  assert.equal(empty.closed.length, 1);
  assert.equal(empty.get("Confirm"), undefined);
  const transferred = wizardHarness({
    boundary: geometry.pointsToBoundary(square),
  });
  transferred.get("Dialog").props.onClose();
  assert.equal(transferred.closed.length, 0);
  assert.ok(transferred.get("Confirm"));
  assert.equal(transferred.calls.length, 0);
});

function farmLocationHarness({
  farm,
  profile = {
    state_id: 10,
    district_id: 20,
    state: { id: 10, name: "Profile State" },
    district: { id: 20, name: "Profile District" },
    village: "Profile Village",
  },
} = {}) {
  const runtime = hooks(),
    regions = new Map(),
    rules = {},
    changes = [],
    locations = [];
  const values = {
    state_id: String(farm?.state_id ?? profile.state_id ?? ""),
    district_id: String(farm?.district_id ?? profile.district_id ?? ""),
    tehsil_id: String(farm?.tehsil_id ?? ""),
    village: farm?.village ?? profile.village ?? "",
    address: farm?.address ?? "",
  };
  const form = {
    control: {},
    formState: { errors: {}, dirtyFields: {} },
    getValues: (name) => values[name],
    register: (name, options) => {
      rules[name] = options;
      return {
        name,
        onChange: (event) => {
          values[name] = event.target.value;
        },
      };
    },
    setValue: (name, value) => {
      values[name] = value;
      changes.push([name, value]);
    },
  };
  function lookup(type, parent) {
    const key = `${type}:${parent ?? ""}`;
    if (!regions.has(key))
      regions.set(key, {
        items: [],
        loading: type === "state" || !!parent,
        error: false,
        retry() {},
      });
    return regions.get(key);
  }
  const Component = load(feature + "FarmLocationStep.tsx", {
    react: runtime.react,
    "react-hook-form": {
      useWatch: ({ name }) => name.map((key) => values[key]),
    },
    "next-intl": intl,
    "@/components/admin/form/input/InputField": "Input",
    "@/icons": icons,
    "./FarmField": "Field",
    "./useFarmRegions": { default: lookup, __esModule: true },
    "./farmFormTypes": formTypes,
  }).default;
  const props = {
    form,
    profile,
    farm,
    hasBoundary: false,
    onLocation: (location) => locations.push(location),
  };
  const render = () => runtime.render(Component, props);
  const select = (id) =>
    nodes(render()).find(
      (node) => node.type === "select" && node.props.id === id,
    );
  return {
    render,
    select,
    values,
    form,
    props,
    rules,
    changes,
    locations,
    complete(type, parent, items) {
      Object.assign(lookup(type, parent), {
        items,
        loading: false,
        error: false,
      });
    },
  };
}

test("farm location selects profile defaults before and after asynchronous region options load", () => {
  const { renderToStaticMarkup } = require("react-dom/server");
  const h = farmLocationHarness();
  assert.match(
    renderToStaticMarkup(h.select("farm-state")),
    /<option value="10" selected="">Profile State<\/option>/,
  );
  assert.match(
    renderToStaticMarkup(h.select("farm-district")),
    /<option value="20" selected="">Profile District<\/option>/,
  );
  h.complete("state", undefined, [
    { id: 11, name: "Other State" },
    { id: 10, name: "Loaded State" },
  ]);
  h.complete("district", "10", [
    { id: 21, parent_id: 10, name: "Other District" },
    { id: 20, parent_id: 10, name: "Loaded District" },
  ]);
  assert.match(
    renderToStaticMarkup(h.select("farm-state")),
    /<option value="10" selected="">Loaded State<\/option>/,
  );
  assert.match(
    renderToStaticMarkup(h.select("farm-district")),
    /<option value="20" selected="">Loaded District<\/option>/,
  );
  assert.equal(h.rules.state_id.validate("10"), true);
  assert.equal(h.rules.district_id.validate("20"), true);
  assert.deepEqual(h.changes, []);
});

test("farm edit selects its own saved location instead of profile defaults, including its tehsil", () => {
  const { renderToStaticMarkup } = require("react-dom/server");
  const farm = {
    ...savedFarm,
    state_id: 11,
    district_id: 21,
    tehsil_id: 31,
    state: { id: 11, name: "Farm State" },
    district: { id: 21, name: "Farm District" },
    tehsil: { id: 31, name: "Farm Tehsil" },
  };
  const h = farmLocationHarness({ farm });
  assert.match(
    renderToStaticMarkup(h.select("farm-state")),
    /<option value="11" selected="">Farm State<\/option>/,
  );
  assert.match(
    renderToStaticMarkup(h.select("farm-district")),
    /<option value="21" selected="">Farm District<\/option>/,
  );
  assert.match(
    renderToStaticMarkup(h.select("farm-tehsil")),
    /<option value="31" selected="">Farm Tehsil<\/option>/,
  );
  h.complete("state", undefined, [
    { id: 10, name: "Profile State" },
    { id: 11, name: "Loaded Farm State" },
  ]);
  h.complete("district", "11", [
    { id: 21, parent_id: 11, name: "Loaded Farm District" },
  ]);
  h.complete("subdistrict", "21", [
    { id: 31, parent_id: 21, name: "Loaded Farm Tehsil" },
  ]);
  assert.match(
    renderToStaticMarkup(h.select("farm-state")),
    /<option value="11" selected="">Loaded Farm State<\/option>/,
  );
  assert.match(
    renderToStaticMarkup(h.select("farm-district")),
    /<option value="21" selected="">Loaded Farm District<\/option>/,
  );
  assert.match(
    renderToStaticMarkup(h.select("farm-tehsil")),
    /<option value="31" selected="">Loaded Farm Tehsil<\/option>/,
  );
  assert.deepEqual(h.changes, []);
});

test("changing the farm state clears dependent selections without changing the profile", () => {
  const h = farmLocationHarness();
  const profile = clone(h.props.profile);
  h.complete("state", undefined, [
    { id: 10, name: "Profile State" },
    { id: 11, name: "New State" },
  ]);
  h.select("farm-state").props.onChange({ target: { value: "11" } });
  assert.equal(h.values.state_id, "11");
  assert.equal(h.values.district_id, "");
  assert.equal(h.values.tehsil_id, "");
  assert.equal(h.select("farm-district").props.value, "");
  assert.equal(h.select("farm-district").props.disabled, true);
  h.complete("district", "11", [
    { id: 21, parent_id: 11, name: "New District" },
  ]);
  h.select("farm-district").props.onChange({ target: { value: "21" } });
  assert.equal(h.select("farm-district").props.value, "21");
  assert.equal(h.rules.district_id.validate("21"), true);
  assert.deepEqual(clone(h.props.profile), profile);
});

test("a farm-specific location is submitted and remains selected when the saved farm is reopened", async () => {
  const profile = {
    state_id: 10,
    district_id: 20,
    village: "Profile Village",
    preferred_units: "ha",
  };
  const h = wizardHarness({
    profile,
    saveResult: (payload) => ({
      success: true,
      data: { ...savedFarm, ...payload, id: 99 },
      message: "saved",
    }),
  });
  assert.equal(h.values.state_id, "10");
  assert.equal(h.values.district_id, "20");
  h.values.name = "Farm";
  h.values.area = "1.000";
  h.values.state_id = "11";
  h.values.district_id = "21";
  h.values.village = "Farm Village";
  await h.next();
  await h.next();
  nodes(h.render())
    .find(
      (node) =>
        node.type === "button" && node.props.children === "skipBoundary",
    )
    .props.onClick();
  await h.next();
  assert.equal(h.calls[0][0].state_id, 11);
  assert.equal(h.calls[0][0].district_id, 21);
  assert.equal(profile.state_id, 10);
  assert.equal(profile.district_id, 20);
  const edit = wizardHarness({ profile, farm: h.saved[0] });
  assert.equal(edit.values.state_id, "11");
  assert.equal(edit.values.district_id, "21");
  assert.equal(edit.values.village, "Farm Village");
});

test("edit validates all required fields on final save after unrestricted step navigation", async () => {
  let invalid = "information";
  const h = wizardHarness({
    farm: savedFarm,
    trigger: (fields) =>
      invalid === "information"
        ? !fields.includes("name")
        : !fields.includes("village"),
  });
  h.values.name = "";
  await h.clickStep(3);
  await h.next();
  assert.equal(h.get("Stepper").props.step, 0);
  assert.equal(h.calls.length, 0);
  invalid = "location";
  h.values.name = "Corrected";
  await h.clickStep(3);
  await h.next();
  assert.equal(h.get("Stepper").props.step, 1);
  assert.equal(h.calls.length, 0);
  assert.equal(h.values.name, "Corrected");
});

test("edit surfaces an unfinished or backend-rejected boundary even when Review was opened first", async () => {
  const h = wizardHarness({ farm: savedFarm });
  await h.clickStep(3);
  h.session.points = square;
  await h.next();
  assert.equal(h.get("Stepper").props.step, 2);
  assert.ok(h.get("Boundary"));
  assert.equal(h.calls.length, 0);
  const rejected = wizardHarness({
    farm: savedFarm,
    saveResult: {
      success: false,
      message: "Invalid boundary",
      errors: { boundary: ["Review geometry"] },
    },
  });
  await rejected.clickStep(3);
  await rejected.next();
  assert.equal(rejected.get("Stepper").props.step, 2);
  assert.ok(rejected.get("Boundary"));
  assert.equal(rejected.saved.length, 0);
});

test("step changes scroll only the form content back to the top", async () => {
  const h = wizardHarness({ farm: savedFarm });
  const scrolls = [];
  const scroller = nodes(h.render()).find(
    (node) => node.type === "div" && node.props.ref,
  );
  scroller.props.ref.current = {
    scrollTo: (position) => scrolls.push(position.top),
  };
  await h.clickStep(3);
  h.render();
  await h.clickStep(1);
  h.render();
  assert.deepEqual(scrolls, [0, 0]);
});

test("edit navigation stays locked during GPS recording and pending saves", async () => {
  let resolve;
  const result = new Promise((done) => (resolve = done));
  const h = wizardHarness({ farm: savedFarm, saveResult: () => result });
  await h.clickStep(2);
  h.session.active = true;
  assert.equal(h.get("Stepper").props.disabled, true);
  h.get("Stepper").props.onStep(3);
  assert.equal(h.get("Stepper").props.step, 2);
  h.session.active = false;
  await h.clickStep(3);
  h.submit();
  await tick();
  assert.equal(h.get("Stepper").props.disabled, true);
  h.get("Stepper").props.onStep(0);
  h.get("Dialog").props.onClose();
  assert.equal(h.get("Stepper").props.step, 3);
  assert.equal(h.closed.length, 0);
  resolve({ success: false, message: "Try again" });
  await tick();
  await h.clickStep(0);
  assert.equal(h.get("Stepper").props.step, 0);
});

test("create can revisit Review after explicitly skipping its optional boundary but rejects a new unfinished drawing", async () => {
  const h = wizardHarness();
  await h.next();
  await h.next();
  nodes(h.render())
    .find((node) => node.props?.children === "skipBoundary")
    .props.onClick();
  await h.clickStep(0);
  await h.clickStep(3);
  assert.equal(h.get("Stepper").props.step, 3);
  await h.clickStep(2);
  h.session.points = square;
  await h.clickStep(3);
  assert.equal(h.get("Stepper").props.step, 2);
  assert.equal(h.session.notice, "finishOrSkipBoundary");
  assert.equal(h.calls.length, 0);
});
function informationHarness(
  values = { area: "2.500", area_unit: "bigha" },
  farm,
  unitMetadata = areaFixture.metadata,
) {
  const runtime = hooks(),
    rules = {},
    updates = [];
  const form = {
    control: {},
    formState: { errors: {} },
    register: (name, options) => {
      rules[name] = options;
      return { name };
    },
    getValues: (name) => values[name],
    setValue: (name, value) => {
      values[name] = value;
      updates.push([name, value]);
    },
  };
  const Component = load(feature + "FarmInformationStep.tsx", {
    "@/hooks/useAreaUnits": { __esModule: true, default: () => unitMetadata },
    react: runtime.react,
    "react-hook-form": { useWatch: () => values.area_unit },
    "next-intl": intl,
    "@/components/admin/form/input/InputField": "Input",
    "@/components/common/maps/BoundaryConfirmDialog": "Confirm",
    "@/icons": icons,
    "./FarmField": "Field",
    "./farmFormTypes": formTypes,
  }).default;
  const render = () => runtime.render(Component, { form, farm });
  return { render, rules, values, updates };
}

test("information validation handles Unicode names and decimal precision; unit corrections preserve the recorded number", () => {
  const { render, rules, values } = informationHarness();
  let tree = render();
  assert.equal(rules.name.validate("हिंदी खेत"), true);
  assert.equal(rules.name.validate("   "), "validation.nameRequired");
  for (const invalid of ["0", "-1", "1e3", ".5", "1.1234", "1000000000", "NaN"])
    assert.notEqual(rules.area.validate(invalid), true);
  assert.equal(rules.area.validate("999999999.999"), true);
  assert.equal(rules.area.validate("0.001"), true);
  nodes(tree)
    .find((n) => n.props?.id === "farm-unit" && n.type === "AreaUnitSelect")
    .props.onChange("hectare");
  tree = render();
  assert.equal(values.area, "2.500");
  nodes(tree)
    .find((n) => n.type === "Confirm")
    .props.onConfirm();
  assert.equal(values.area_unit, "hectare");
  assert.equal(values.area, "2.500");
});

test("new drafts apply configured defaults once without overwriting an unsaved farm unit or unrelated fields", () => {
  const metadata = { ...areaFixture.metadata, config: null, status: "loading" };
  const h = wizardHarness({
    profile: { preferred_units: "bigha_pakka", village: "Village" },
    unitMetadata: metadata,
  });
  assert.equal(h.values.area_unit, "");
  h.values.name = "Unsaved name";
  metadata.config = areaFixture.config;
  metadata.status = "ready";
  h.render();
  assert.equal(h.values.area_unit, "bigha_pakka");
  h.values.area_unit = "guntha";
  h.props.profile = { preferred_units: "acre" };
  metadata.config = { ...areaFixture.config };
  h.render();
  assert.equal(h.values.area_unit, "guntha");
  assert.equal(h.values.name, "Unsaved name");
  assert.equal(
    h.form.formState.isDirty,
    false,
    "loading the default does not itself dirty the form",
  );
});

test("new farms use the backend default only for a missing preference and keep ambiguous preferences unresolved", () => {
  assert.equal(wizardHarness({ profile: {} }).values.area_unit, "hectare");
  assert.equal(
    wizardHarness({ profile: { preferred_units: "ha" } }).values.area_unit,
    "hectare",
  );
  for (const preference of ["bigha", "metric", "imperial"]) {
    assert.equal(
      wizardHarness({ profile: { preferred_units: preference } }).values
        .area_unit,
      "",
    );
  }
  const h = wizardHarness({
    farm: { ...savedFarm, area_unit: "bigha" },
    profile: { preferred_units: "bigha_pakka" },
  });
  assert.equal(h.values.area_unit, "bigha");
  assert.equal(h.values.area, savedFarm.area);
});

test("metadata arriving late preserves a unit the farmer has already changed", () => {
  const metadata = { ...areaFixture.metadata, config: null, status: "loading" };
  const h = wizardHarness({ unitMetadata: metadata });
  h.values.area_unit = "acre";
  h.form.dirtyFields = { area_unit: true };
  metadata.config = areaFixture.config;
  h.render();
  assert.equal(h.values.area_unit, "acre");
});

test("explicit conversions use saved API square metres and preserve boundary coordinates", () => {
  const boundary = geometry.pointsToBoundary(square);
  const farm = {
    ...savedFarm,
    area: "4.000",
    area_unit: "bigha_pakka",
    area_sqm: "10117.141920",
    boundary,
  };
  const before = JSON.stringify(farm);
  const h = informationHarness(
    { area: farm.area, area_unit: farm.area_unit },
    farm,
  );
  nodes(h.render())
    .find(
      (node) =>
        node.type === "AreaUnitSelect" && node.props?.id === "farm-unit",
    )
    .props.onChange("hectare");
  const confirm = nodes(h.render()).find((node) => node.type === "Confirm");
  assert.equal(typeof confirm.props.onAlternative, "function");
  assert.equal(
    h.values.area,
    "4.000",
    "selection alone cannot change recorded area",
  );
  confirm.props.onAlternative();
  assert.equal(h.values.area_unit, "hectare");
  assert.equal(h.values.area, "1.012");
  assert.equal(JSON.stringify(farm), before);
});

test("legacy Bigha can only be corrected explicitly; unsupported units and missing metadata fail validation", () => {
  const h = informationHarness();
  h.render();
  for (const unit of ["bigha", "ha", "metric", "imperial", "unknown"])
    assert.notEqual(h.rules.area_unit.validate(unit), true);
  for (const unit of areaFixture.config.units)
    assert.equal(h.rules.area_unit.validate(unit.value), true);
  nodes(h.render())
    .find(
      (node) =>
        node.type === "AreaUnitSelect" && node.props?.id === "farm-unit",
    )
    .props.onChange("bigha_kaccha");
  const confirm = nodes(h.render()).find((node) => node.type === "Confirm");
  assert.equal(confirm.props.onAlternative, undefined);
  confirm.props.onClose();
  assert.equal(h.values.area_unit, "bigha");
  const failed = informationHarness(
    { area: "4", area_unit: "acre" },
    undefined,
    { ...areaFixture.metadata, config: null, status: "error" },
  );
  failed.render();
  assert.notEqual(failed.rules.area_unit.validate("acre"), true);
  assert.equal(failed.values.area, "4");
});

test("boundary previews use authoritative saved square metres until geometry is edited, then clear with the boundary", () => {
  const h = boundaryHarness(
    { boundary: geometry.pointsToBoundary(square), boundary_source: "manual" },
    "8000.123456789",
  );
  assert.equal(h.render().area, 8000.123456789);
  h.render().edit();
  assert.equal(h.render().area, 8000.123456789);
  const changed = [...square.slice(0, 3), { lat: 26.002, lng: 77 }];
  h.render().update(changed);
  assert.equal(h.render().area, geometry.boundaryArea(changed));
  h.render().clear();
  assert.equal(h.render().area, null);
  h.runtime.cleanup();
});

test("manual and GPS previews share conversion and unit changes keep the original square metres and geometry", () => {
  const h = editorHarness();
  const initialPoints = h.session.points;
  const sqm = h.session.area;
  for (const mode of ["manual", "gps"]) {
    h.session.mode = mode;
    for (const unit of ["bigha_kaccha", "bigha_pakka", "hectare", "acre"]) {
      h.props.areaUnit = unit;
      const number = areaFixture.utils.formatArea(
        areaFixture.utils.fromSquareMeters(sqm, unit, areaFixture.config),
        "hi",
      );
      const strong = nodes(h.render())
        .filter((node) => node.type === "strong")
        .map((node) => node.props.children);
      assert.ok(
        strong.includes(`${number} ${areaFixture.metadata.label(unit)}`),
      );
      assert.equal(h.session.area, sqm);
      assert.equal(h.session.points, initialPoints);
    }
  }
  h.session.area = null;
  assert.ok(
    nodes(h.render()).some(
      (node) =>
        node.type === "strong" &&
        node.props.children === "wizard.notCalculated",
    ),
  );
  h.runtime.cleanup();
});

test("metadata outages show measured square metres without discarding the boundary or GPS state", () => {
  const h = editorHarness({
    ...areaFixture.metadata,
    config: null,
    status: "error",
  });
  h.props.areaUnit = "bigha_pakka";
  const before = JSON.stringify(h.session.points);
  const tree = nodes(h.render());
  const expected = `${areaFixture.utils.formatArea(h.session.area, "hi")} ${areaFixture.metadata.label("sqm")}`;
  assert.ok(
    tree.some(
      (node) => node.type === "strong" && node.props.children === expected,
    ),
  );
  assert.equal(JSON.stringify(h.session.points), before);
  assert.equal(h.session.gpsState, "tracking");
  assert.equal(h.calls.length, 0);
  h.runtime.cleanup();
});
function summaryAreaHarness(total) {
  const runtime = hooks();
  const workspace = {
    farms: [],
    summary: {
      total_farms: 2,
      active_farms: 1,
      inactive_farms: 1,
      total_land_area: total,
    },
    selectedFarmId: null,
    status: "ready",
    revision: 0,
  };
  const Component = load(feature + "FarmManager.tsx", {
    react: runtime.react,
    "next-intl": intl,
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "./farmFilters": filters,
    "react-hot-toast": {},
    "@/actions/account/farms": {},
    "@/icons": icons,
    "@/components/admin/tables/Pagination": "Pagination",
    "@/components/common/maps/BoundaryConfirmDialog": "Confirm",
    "../../_components/AccountFarmContext": {
      useAccountFarms: () => workspace,
    },
    "./FarmList": "List",
    "./farmFormTypes": formTypes,
    "@/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
  });
  const tree = runtime.render(Component.default, {
    initialData: {
      data: [{ id: 1, area: "999", area_unit: "acre" }],
      pagination: { current_page: 1, last_page: 1, total: 1 },
    },
    initialError: "",
  });
  runtime.cleanup();
  return nodes(tree).find(
    (node) =>
      node.type === "section" &&
      nodes(node).some(
        (child) => child.type === "h3" && child.props.children === "totalArea",
      ),
  );
}

test("Farm Manager displays the authoritative preferred-unit summary even when visible paginated rows differ", () => {
  const card = summaryAreaHarness({
    value: "11.907",
    unit: "bigha_pakka",
    conversion_available: true,
    preference_resolution_required: false,
    breakdown: [],
  });
  assert.ok(
    nodes(card).some(
      (node) =>
        node.type === "p" && node.props.children === "11.907 Pakka Bigha",
    ),
  );
  const empty = summaryAreaHarness({
    value: "0.000",
    unit: "hectare",
    conversion_available: true,
    breakdown: [],
  });
  assert.ok(
    nodes(empty).some((node) => node.props?.children === "0.000 Hectare"),
  );
});

test("unresolved totals display their backend breakdown and confirmation guidance without inventing a mixed-unit sum", () => {
  const card = summaryAreaHarness({
    value: null,
    unit: "hectare",
    conversion_available: false,
    unresolved_farms_count: 1,
    preference_resolution_required: true,
    breakdown: [
      { value: "4.000", unit: "bigha" },
      { value: "2.000", unit: "hectare" },
    ],
  });
  const text = nodes(card)
    .filter((node) => node.type === "p")
    .map((node) => node.props.children);
  assert.ok(
    text.includes("4.000 Bigha (standard unconfirmed) + 2.000 Hectare"),
  );
  assert.ok(text.includes("unresolvedTotal"));
  assert.ok(text.includes("confirmPreference"));
  assert.equal(
    text.some((value) => /null|6\.000/.test(value)),
    false,
  );
});

test("individual farm rows retain their original recorded measurements and localized configured labels", () => {
  const Component = load(feature + "FarmList.tsx", {
    "next-intl": intl,
    "@headlessui/react": {},
    "@/icons": icons,
    "@/components/common/maps/FarmSatellitePreview": "Preview",
    "@/components/common/maps/farmMapStyle": mapStyle,
  }).default;
  const farms = [
    { id: 1, area: "4.000", area_unit: "bigha_pakka", name: "A" },
    { id: 2, area: "2.000", area_unit: "hectare", name: "B" },
  ];
  const before = JSON.stringify(farms);
  const text = nodes(Component({ farms, selectedId: null, busyId: null }))
    .filter((node) => node.type === "strong")
    .map((node) => node.props.children)
    .flat()
    .join(" ");
  assert.match(text, /4\.000\s+Pakka Bigha/);
  assert.match(text, /2\.000\s+Hectare/);
  assert.equal(JSON.stringify(farms), before);
});

test("farm message structures and interpolation match in English and Hindi", () => {
  const en = JSON.parse(
    fs.readFileSync("src/messages/en.json", "utf8"),
  ).farmerFarms;
  const hi = JSON.parse(
    fs.readFileSync("src/messages/hi.json", "utf8"),
  ).farmerFarms;
  function keys(object, prefix = "") {
    return Object.entries(object).flatMap(([key, value]) =>
      typeof value === "object"
        ? keys(value, `${prefix}${key}.`)
        : `${prefix}${key}`,
    );
  }
  assert.deepEqual(keys(en), keys(hi));
  for (const key of [
    "nextStep",
    "distance",
    "unitChangeDescription",
    "locateFarm",
    "moreActions",
  ]) {
    assert.deepEqual(en[key].match(/\{\w+\}/g), hi[key].match(/\{\w+\}/g));
    assert.match(hi[key], /[\u0900-\u097f]/);
  }
});

test("region lookups ignore stale parent responses and preserve retryable errors", async () => {
  const runtime = hooks(),
    requests = [];
  const Hook = load(feature + "useFarmRegions.ts", {
    react: runtime.react,
    "next-intl": intl,
    "@/actions/account/farms": {
      getFarmRegions: (type, parent) =>
        new Promise((resolve) => requests.push({ type, parent, resolve })),
    },
  }).default;
  let parent = "1";
  const render = () => runtime.render(() => Hook("district", parent));
  assert.equal(render().loading, true);
  parent = "2";
  render();
  requests[1].resolve({
    success: true,
    data: [{ id: 20, parent_id: 2, name: "District B" }],
  });
  await tick();
  assert.equal(render().items[0].id, 20);
  requests[0].resolve({
    success: true,
    data: [{ id: 10, parent_id: 1, name: "District A" }],
  });
  await tick();
  assert.equal(render().items[0].id, 20);
  parent = "3";
  render();
  requests[2].resolve({ success: false, message: "unavailable" });
  await tick();
  let state = render();
  assert.equal(state.error, true);
  state.retry();
  assert.equal(render().loading, true);
  requests[3].resolve({ success: true, data: [] });
  await tick();
  assert.equal(render().error, false);
  runtime.cleanup();
});

test("list filters retain URL parameters, reject stale responses and show a map selection outside the current page", async () => {
  const runtime = hooks(),
    requests = [],
    history = [];
  let url = new URLSearchParams("keep=1");
  const selected = {
    id: 99,
    name: "Selected real farm",
    area: "1.000",
    area_unit: "ha",
    village: "गाँव",
    is_active: true,
    latitude: null,
    longitude: null,
    has_boundary: false,
  };
  const workspace = {
    farms: [selected],
    satellitePreviews: {
      99: { normal: "saved-normal", selected: "saved-selected" },
    },
    summary: null,
    status: "ready",
    selectedFarmId: 99,
    revision: 0,
    openFarm() {},
    selectFarm() {},
    refresh() {},
  };
  const Component = load(
    feature + "FarmManager.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "next/navigation": { useSearchParams: () => url },
      "./farmFilters": filters,
      "react-hot-toast": { success() {}, error() {} },
      "@/actions/account/farms": {
        getFarmerFarms: (values) =>
          new Promise((resolve) => requests.push({ values, resolve })),
      },
      "@/icons": icons,
      "@/components/admin/tables/Pagination": "Pagination",
      "@/components/common/maps/BoundaryConfirmDialog": "Confirm",
      "../../_components/AccountFarmContext": {
        useAccountFarms: () => workspace,
      },
      "./FarmList": "List",
      "./farmFormTypes": formTypes,
      "@/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") },
    },
    {
      window: {
        location: { pathname: "/account/farms" },
        history: {
          pushState(_a, _b, value) {
            history.push(value);
            url = new URLSearchParams(value.split("?")[1] ?? "");
          },
        },
      },
    },
  ).default;
  const initialData = {
    status: true,
    data: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
  };
  const render = () =>
    runtime.render(Component, { initialData, initialError: "" });
  let tree = render();
  assert.equal(requests.length, 0);
  assert.equal(
    nodes(tree).find((n) => n.type === "List").props.farms[0].id,
    99,
  );
  nodes(tree)
    .find((n) => n.type === "select")
    .props.onChange({ target: { value: "inactive" } });
  tree = render();
  assert.match(history.at(-1), /keep=1/);
  assert.match(history.at(-1), /status=inactive/);
  assert.equal(requests[0].values.status, "inactive");
  nodes(tree)
    .find((n) => n.type === "select")
    .props.onChange({ target: { value: "active" } });
  render();
  requests[1].resolve({
    success: true,
    satellitePreviews: {
      2: { normal: "updated-normal", selected: "updated-selected" },
    },
    data: {
      ...initialData,
      data: [{ ...selected, id: 2, name: "Active result" }],
    },
  });
  await tick();
  render();
  requests[0].resolve({
    success: true,
    data: {
      ...initialData,
      data: [{ ...selected, id: 1, name: "Stale inactive result" }],
    },
  });
  await tick();
  tree = render();
  const lists = nodes(tree).filter((n) => n.type === "List");
  assert.equal(lists[1].props.farms[0].name, "Active result");
  assert.equal(lists[1].props.satellitePreviews[2].normal, "updated-normal");
  assert.equal(lists[1].props.savedFarms, workspace.farms);
  assert.equal(
    lists[1].props.savedSatellitePreviews,
    workspace.satellitePreviews,
  );
  assert.equal(lists[0].props.satellitePreviews[99].selected, "saved-selected");
  assert.equal(lists[0].props.selectedId, 99);
  runtime.cleanup();
});

test("boundary failures after basic edits report the partial save and preserve backend field errors", async () => {
  const calls = [];
  const actions = load("src/actions/account/farms.ts", {
    "@/components/common/maps/farmStaticMap.server": {
      signedFarmSatelliteSources: () => undefined,
    },
    "next-intl/server": { getTranslations: async () => t },
    "@/lib/userAuth/dal": { requireUser: async () => {} },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => ({
        success: false,
        message: "geometry invalid",
        errors: error.errors,
      }),
    },
    "@/lib/api/ApiError": apiError,
    "@/lib/apis/account/regions": { accountRegionsAPI: {} },
    "@/lib/apis/account/farms": {
      accountFarmsAPI: {
        update: async () => {
          calls.push("basic");
          return { status: true };
        },
        updateBoundary: async () => {
          calls.push("boundary");
          throw { errors: { boundary: ["invalid shape"] } };
        },
      },
    },
  });
  const result = await actions.saveFarmerFarm(
    { name: "Draft", boundary: null },
    "key",
    5,
  );
  assert.deepEqual(calls, ["basic", "boundary"]);
  assert.equal(result.success, false);
  assert.match(result.message, /partialSaveFailed/);
  assert.equal(result.errors.boundary[0], "invalid shape");
});

test("creation conflicts direct the farmer to inspect saved farms without retrying a new create", async () => {
  let calls = 0;
  const actions = load("src/actions/account/farms.ts", {
    "@/components/common/maps/farmStaticMap.server": {
      signedFarmSatelliteSources: () => undefined,
    },
    "next-intl/server": { getTranslations: async () => t },
    "@/lib/userAuth/dal": { requireUser: async () => {} },
    "@/lib/api/handleActionError": {
      handleActionError: async () => ({ success: false, message: "conflict" }),
    },
    "@/lib/api/ApiError": apiError,
    "@/lib/apis/account/regions": { accountRegionsAPI: {} },
    "@/lib/apis/account/farms": {
      accountFarmsAPI: {
        create: async () => {
          calls++;
          throw new apiError.ApiError("conflict", 409);
        },
      },
    },
  });
  const result = await actions.saveFarmerFarm(
    { name: "Changed draft" },
    "same-key",
  );
  assert.equal(calls, 1);
  assert.equal(result.success, false);
  assert.equal(result.message, "creationConflict");
});

function editorHarness(unitMetadata = areaFixture.metadata) {
  const runtime = hooks(),
    calls = [],
    events = {},
    focused = [];
  let attachedRefs = [];
  const session = {
    points: square,
    mode: "gps",
    source: "gps",
    phase: "drawing",
    gpsState: "tracking",
    active: true,
    accuracy: 20,
    area: geometry.boundaryArea(square),
    distance: 100,
    boundary: null,
    notice: "",
    start() {
      calls.push("start");
      session.active = true;
      session.gpsState = "tracking";
    },
    pause() {
      calls.push("pause");
      session.active = false;
      session.gpsState = "paused";
    },
    confirm() {
      calls.push("confirm");
      session.active = false;
      session.phase = "confirmed";
      session.boundary = geometry.pointsToBoundary(session.points);
    },
    changeMode(mode) {
      calls.push(`mode:${mode}`);
      session.mode = mode;
      session.points = [];
      session.phase = "idle";
      session.active = false;
    },
    clear() {
      calls.push("clear");
      session.points = [];
    },
    add() {},
    update() {},
    edit() {},
    undo() {},
    draw() {},
  };
  const Component = load(
    "src/components/common/maps/FarmBoundaryEditor.tsx",
    {
      "@/hooks/useAreaUnits": { __esModule: true, default: () => unitMetadata },
      react: runtime.react,
      "next-intl": intl,
      "./FarmBoundaryMap": "EditorMap",
      "./BoundaryConfirmDialog": "Confirm",
      [geoPath]: geometry,
      "@/icons": icons,
    },
    {
      window: {
        addEventListener: (name, fn) => (events[name] = fn),
        removeEventListener: (name) => delete events[name],
      },
    },
  ).default;
  const props = {
    session,
    areaUnit: "bigha",
    location: "A long village name, district name, state name",
  };
  const render = () =>
    runtime.render(Component, props, (tree) => {
      for (const ref of attachedRefs) ref.current = null;
      attachedRefs = [];
      for (const node of nodes(tree))
        if (node.props?.ref) {
          const ref = node.props.ref;
          ref.current = { focus: () => focused.push(node.props["aria-label"]) };
          attachedRefs.push(ref);
        }
    });
  const getButton = (label) =>
    nodes(render()).find(
      (node) =>
        node.type === "button" &&
        (node.props["aria-label"] === label || node.props.children === label),
    );
  const getMap = () =>
    nodes(render()).find((node) => node.type === "EditorMap");
  return {
    render,
    getButton,
    getMap,
    session,
    props,
    calls,
    events,
    focused,
    runtime,
  };
}

test("fullscreen GPS retains the same route and map callbacks while pause, resume and finish remain functional", () => {
  const h = editorHarness();
  const original = h.getMap();
  h.getButton("fullscreen").props.onClick();
  let map = h.getMap();
  assert.equal(map.type, original.type);
  assert.equal(map.key, original.key);
  assert.equal(map.props.points, original.props.points);
  assert.equal(map.props.onEdit, original.props.onEdit);
  assert.equal(map.props.gps, true);
  assert.deepEqual(h.calls, []);
  h.getButton("wizard.pauseTracking").props.onClick();
  h.getButton("resumeTracking").props.onClick();
  h.getButton("finishGps").props.onClick();
  assert.deepEqual(h.calls, ["pause", "start", "confirm"]);
  h.getButton("exitFullscreen").props.onClick();
  map = h.getMap();
  assert.equal(map.props.points, original.props.points);
  assert.equal(map.props.gps, false);
  assert.ok(h.session.boundary);
  h.runtime.cleanup();
});

test("fullscreen focuses its exit action, Escape restores the entry button and removes its listener", () => {
  const h = editorHarness();
  h.getButton("fullscreen").props.onClick();
  h.render();
  assert.equal(h.focused.at(-1), "exitFullscreen");
  let prevented = 0,
    stopped = 0;
  h.events.keydown({
    key: "Escape",
    preventDefault() {
      prevented++;
    },
    stopPropagation() {
      stopped++;
    },
  });
  h.render();
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.equal(h.focused.at(-1), "fullscreen");
  assert.equal(h.events.keydown, undefined);
  assert.deepEqual(h.calls, []);
  assert.equal(h.session.active, true);
  h.getButton("fullscreen").props.onClick();
  h.render();
  h.runtime.cleanup();
  assert.equal(h.events.keydown, undefined);
});

test("fullscreen defers Escape to boundary confirmation and never discards a GPS route on an unconfirmed mode switch", () => {
  const h = editorHarness();
  h.getButton("fullscreen").props.onClick();
  h.render();
  const manual = nodes(h.render()).find(
    (node) =>
      node.type === "button" &&
      nodes(node).some(
        (child) => child.props?.children === "wizard.manualDrawing",
      ),
  );
  manual.props.onClick();
  const confirmation = nodes(h.render()).find(
    (node) => node.type === "Confirm",
  );
  assert.ok(confirmation);
  assert.equal(h.events.keydown, undefined);
  assert.deepEqual(h.calls, []);
  confirmation.props.onClose();
  h.render();
  assert.equal(typeof h.events.keydown, "function");
  assert.equal(h.session.points, square);
  h.runtime.cleanup();
});

function boundaryMapHarness({
  points = [],
  editable = false,
  drawing = false,
  gps = false,
  failOnce = false,
  delayed = false,
} = {}) {
  const runtime = hooks(),
    polygons = [],
    layers = [],
    paths = [],
    lines = [],
    maps = [],
    edits = [],
    events = {};
  let loads = 0,
    resolveSDK;
  class Path {
    constructor(points) {
      this.points = [...points];
      this.listeners = {};
      paths.push(this);
    }
    getArray() {
      return this.points.map((point) => ({
        lat: () => point.lat,
        lng: () => point.lng,
      }));
    }
    addListener(event, callback) {
      const listeners = (this.listeners[event] ??= new Set());
      listeners.add(callback);
      return { remove: () => listeners.delete(callback) };
    }
    change(point) {
      this.points[0] = point;
      for (const callback of this.listeners.set_at ?? []) callback();
    }
    listenerCount() {
      return Object.values(this.listeners).reduce(
        (count, listeners) => count + listeners.size,
        0,
      );
    }
  }
  class Polygon {
    constructor(options) {
      this.options = options;
      this.map = options.map;
      const points = Array.isArray(options.paths[0])
        ? options.paths[0]
        : options.paths;
      this.path = options.paths.length ? new Path(points) : undefined;
      polygons.push(this);
    }
    getPath() {
      return this.path;
    }
    setPath(points) {
      this.path = new Path(points);
    }
    setMap(map) {
      this.map = map;
    }
  }
  class MapSDK {
    constructor() {
      maps.push(this);
      this.zoom = 16;
    }
    addListener(event, callback) {
      this[event] = callback;
      return { remove: () => delete this[event] };
    }
    setMapTypeId() {}
    setZoom(zoom) {
      this.zoom = zoom;
    }
    getZoom() {
      return this.zoom;
    }
    panTo() {}
  }
  class Data {
    constructor(options) {
      this.map = options.map;
      layers.push(this);
    }
    addGeoJson(value) {
      this.geometry = value;
    }
    setStyle(value) {
      this.style = value;
    }
    setMap(map) {
      this.map = map;
    }
  }
  class Line {
    constructor(options) {
      this.map = options.map;
      lines.push(this);
    }
    setMap(map) {
      this.map = map;
    }
  }
  const sdk = {
    Map: MapSDK,
    Polygon,
    Data,
    Polyline: Line,
    Circle: Line,
    SymbolPath: { CIRCLE: 0 },
    event: {
      trigger() {},
      clearInstanceListeners(instance) {
        assert.ok(instance, "Cleanup must never receive an undefined path");
      },
    },
  };
  const ready = new Promise((resolve) => (resolveSDK = resolve));
  const Component = load(
    "src/components/common/maps/FarmBoundaryMap.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "@/icons": icons,
      "@/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") },
      ["@/app/[locale]/(account)/account/(protected)/_components/googleMaps"]: {
        loadGoogleMaps: async () => {
          loads++;
          if (failOnce && loads === 1) throw Error("offline");
          return delayed ? ready : sdk;
        },
      },
      ["@/app/[locale]/(account)/account/(protected)/_components/dashboardState"]:
        { DEFAULT_MAP_VIEW: { center: { lat: 22.5, lng: 79 }, zoom: 5 } },
      ["@/app/[locale]/(account)/account/(protected)/_components/mapViewport"]:
        { fitMapPositions: () => true },
    },
    {
      process: { env: { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "test-map-key" } },
      window: {
        addEventListener: (name, fn) => (events[name] = fn),
        removeEventListener: (name) => delete events[name],
      },
      ResizeObserver: class {
        observe() {}
        disconnect() {}
      },
    },
  ).default;
  const props = {
    points,
    editable,
    drawing,
    gps,
    onEdit: (points) => edits.push(points),
  };
  const host = {};
  const render = () =>
    runtime.render(Component, props, (tree) => {
      for (const node of nodes(tree))
        if (node.props?.ref) node.props.ref.current = host;
    });
  return {
    render,
    props,
    polygons,
    layers,
    paths,
    lines,
    maps,
    edits,
    events,
    runtime,
    resolve: () => resolveSDK(sdk),
    get loads() {
      return loads;
    },
    async mount() {
      render();
      await tick();
      return render();
    },
  };
}

test("an empty or incomplete boundary never creates a polygon or subscribes to an absent path", async () => {
  const h = boundaryMapHarness();
  await h.mount();
  assert.equal(h.polygons.length, 0);
  for (const count of [1, 2]) {
    h.props.points = square.slice(0, count);
    h.render();
    assert.equal(h.polygons.length, 0);
  }
  h.runtime.cleanup();
});

test("crop map orders independent read-only references below the current selection, keeps vertices noneditable and cleans overlays without duplicates", async () => {
  const h = boundaryMapHarness({ points: square });
  const boundary = geometry.pointsToBoundary(square);
  h.props.referenceLayers = [
    {
      id: "farm",
      name: "Farm",
      boundary,
      color: "green",
      fillOpacity: 0,
      zIndex: 1,
    },
    {
      id: "occupied",
      name: "Crop",
      boundary: structuredClone(boundary),
      color: "gold",
      zIndex: 2,
    },
  ];
  h.props.displayGeometry = structuredClone(boundary);
  await h.mount();
  const references = h.layers.find(
    (layer) => layer.geometry.features?.[0]?.id === "farm",
  );
  const selected = h.layers.find((layer) => layer.geometry.type === "Feature");
  const vertices = h.layers.find(
    (layer) => layer.geometry.features?.[0]?.geometry.type === "Point",
  );
  for (const feature of references.geometry.features) {
    const style = references.style({
      getProperty: (name) => feature.properties[name],
    });
    assert.equal(style.editable, false);
    assert.equal(style.draggable, false);
    assert.equal(style.clickable, false);
    assert.ok(style.zIndex < selected.style.zIndex);
  }
  assert.equal(selected.style.zIndex, 3);
  assert.equal(selected.style.editable, false);
  assert.equal(vertices.style.zIndex, 5);
  assert.equal(h.polygons[0].options.editable, false);
  assert.equal(h.polygons[0].options.zIndex, 4);
  assert.equal(h.layers.filter((layer) => layer.map !== null).length, 3);
  const count = h.layers.length;
  h.render();
  h.render();
  assert.equal(h.layers.length, count);
  h.props.editable = true;
  h.render();
  assert.equal(h.polygons.at(-1).options.editable, true);
  assert.equal(references.map, h.maps[0]);
  h.props.points = [];
  h.props.displayGeometry = null;
  h.render();
  assert.equal(references.map, h.maps[0]);
  assert.equal(selected.map, null);
  h.runtime.cleanup();
  assert.ok(h.layers.every((layer) => layer.map === null));
  assert.ok(h.polygons.every((polygon) => polygon.map === null));
});

test("manual drawing uses a line until completion; clearing a polygon removes its path listeners safely", async () => {
  const h = boundaryMapHarness({ points: square, drawing: true });
  await h.mount();
  assert.equal(h.polygons.length, 0);
  assert.equal(h.lines.length, 1);
  h.props.drawing = false;
  h.render();
  assert.equal(h.polygons.length, 1);
  const polygon = h.polygons[0],
    path = polygon.getPath();
  assert.equal(path.listenerCount(), 3);
  h.props.points = [];
  h.render();
  assert.equal(path.listenerCount(), 0);
  assert.equal(polygon.map, null);
  path.change(square[1]);
  assert.equal(h.edits.length, 0);
  h.props.points = square;
  h.render();
  assert.equal(h.polygons.length, 2);
  h.runtime.cleanup();
  assert.equal(h.polygons[1].getPath().listenerCount(), 0);
});

test("vertex drags preserve the polygon and replacement paths keep editing listeners without stale callbacks", async () => {
  const h = boundaryMapHarness({ points: square, editable: true });
  await h.mount();
  const polygon = h.polygons[0],
    firstPath = polygon.getPath();
  const moved = { lat: 26.0001, lng: 77 };
  firstPath.change(moved);
  assert.deepEqual(clone(h.edits[0][0]), moved);
  h.props.points = h.edits[0];
  h.render();
  assert.equal(h.polygons.length, 1);
  assert.equal(polygon.getPath(), firstPath);
  h.props.points = [...square.slice(0, 3), { lat: 26.002, lng: 77 }];
  h.render();
  const replacement = polygon.getPath();
  assert.notEqual(replacement, firstPath);
  assert.equal(firstPath.listenerCount(), 0);
  assert.equal(replacement.listenerCount(), 3);
  firstPath.change(square[0]);
  assert.equal(h.edits.length, 1);
  replacement.change(moved);
  assert.equal(h.edits.length, 2);
  h.runtime.cleanup();
  assert.equal(replacement.listenerCount(), 0);
});

test("map retry and late SDK completion do not leave empty polygons or listeners after unmount", async () => {
  const failed = boundaryMapHarness({ failOnce: true });
  let tree = await failed.mount();
  const retry = nodes(tree).find(
    (node) => node.type === "button" && node.props.children === "retry",
  );
  assert.ok(retry);
  retry.props.onClick();
  failed.render();
  await tick();
  failed.render();
  assert.equal(failed.loads, 2);
  assert.equal(failed.maps.length, 1);
  assert.equal(failed.polygons.length, 0);
  failed.runtime.cleanup();
  const pending = boundaryMapHarness({ points: square, delayed: true });
  pending.render();
  pending.runtime.cleanup();
  pending.resolve();
  await tick();
  assert.equal(pending.maps.length, 0);
  assert.equal(pending.polygons.length, 0);
});
