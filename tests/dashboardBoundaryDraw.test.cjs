const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const areaFixture = require("./helpers/areaUnits.cjs");

const base = "src/app/[locale]/(account)/account/(protected)/_components/";
const geoPath =
  "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";
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
const clone = (value) => JSON.parse(JSON.stringify(value));
const t = (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key);
const intl = { useTranslations: () => t, useLocale: () => "en" };
const icons = new Proxy({}, { get: (_, key) => String(key) });
function hooks() {
  const slots = [];
  let cursor = 0;
  let queued = [];
  const entry = () => [cursor, slots[cursor++]];
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
    useEffect(fn, deps) {
      const [index, prior] = entry();
      if (!prior || changed(prior.deps, deps))
        queued.push(() => {
          prior?.cleanup?.();
          slots[index] = { deps, effect: fn, cleanup: fn() };
        });
    },
  };
  return {
    react,
    render(Component, props) {
      cursor = 0;
      return Component(props);
    },
    flush() {
      const current = queued;
      queued = [];
      current.forEach((fn) => fn());
    },
    cleanup: () => slots.forEach((slot) => slot?.cleanup?.()),
  };
}

const geometry = load(base + "farmGeometry.ts");
const drawState = load(base + "boundaryDraw/boundaryDrawState.ts", {
  "../farmGeometry": geometry,
});
const { boundaryDrawReducer: reduce, initialBoundaryDrawState: idle } =
  drawState;
const square = [
  { lat: 26, lng: 77 },
  { lat: 26, lng: 77.001 },
  { lat: 26.001, lng: 77.001 },
  { lat: 26.001, lng: 77 },
];
const run = (state, ...actions) => actions.reduce(reduce, state);
const add = (point) => ({ type: "add", point });

test("boundary draw state machine adds, undoes, blocks short shapes, completes, reopens and resets", () => {
  let state = run(idle, { type: "start" });
  assert.deepEqual(clone(state), { mode: "drawing", points: [], error: null });
  assert.equal(reduce(idle, add(square[0])), idle, "idle ignores map clicks");
  state = run(state, add(square[0]), add(square[1]), add(square[2]));
  state = run(state, { type: "undo" });
  assert.equal(state.points.length, 2);
  state = run(state, { type: "complete" });
  assert.equal(state.mode, "drawing");
  assert.equal(state.error, "boundaryErrors.vertices");
  state = run(state, add(square[2]), add(square[3]));
  assert.equal(state.error, null);
  state = run(state, { type: "complete" });
  assert.equal(state.mode, "drawn");
  assert.equal(reduce(state, add({ lat: 1, lng: 1 })), state);
  const reopened = run(state, { type: "reopen" });
  assert.deepEqual(clone(reopened), clone({ ...state, mode: "drawing" }));
  assert.deepEqual(clone(run(state, { type: "undo" })), clone(reopened));
  assert.equal(run(reopened, { type: "start" }), reopened);
  assert.equal(run(reopened, { type: "reset" }), idle);
});

test("boundary draw rejects step 3's invalid shapes, duplicates and the vertex limit", () => {
  const crossing = run(
    idle,
    { type: "start" },
    add(square[0]),
    add(square[2]),
    add(square[1]),
    add(square[3]),
    { type: "complete" },
  );
  assert.equal(crossing.mode, "drawing");
  assert.equal(crossing.error, "boundaryErrors.intersection");
  assert.equal(geometry.boundaryError(crossing.points), "intersection");
  const drawing = run(idle, { type: "start" }, add(square[0]));
  assert.equal(
    reduce(drawing, add({ lat: 26.0000001, lng: 77 })),
    drawing,
    "a point within 0.05 m is ignored",
  );
  const full = {
    mode: "drawing",
    points: Array.from({ length: geometry.MAX_BOUNDARY_VERTICES }, (_, i) => ({
      lat: 26 + i / 1e4,
      lng: 77,
    })),
    error: null,
  };
  assert.equal(reduce(full, add({ lat: 1, lng: 1 })).error, "pointLimit");
  assert.equal(drawState.boundaryDrawArea(square.slice(0, 2)), null);
  assert.equal(drawState.boundaryDrawArea(crossing.points), null);
  assert.equal(
    drawState.boundaryDrawArea(square),
    geometry.boundaryArea(square),
  );
});

test("first-point snap uses pixel tolerance and closing never duplicates the first vertex", () => {
  const project = ({ lat, lng }) => ({ x: lng * 1e5, y: -lat * 1e5 });
  const first = project(square[0]);
  const near = { x: first.x + 8, y: first.y + 8 };
  const far = { x: first.x + 16, y: first.y };
  assert.equal(geometry.isNearFirstPoint(square, near, project, 12), true);
  assert.equal(geometry.isNearFirstPoint(square, far, project, 12), false);
  assert.equal(
    geometry.isNearFirstPoint(square, far, project, 20),
    true,
    "touch screens get a larger target",
  );
  assert.equal(
    geometry.isNearFirstPoint(square.slice(0, 2), near, project, 12),
    false,
    "two points cannot close",
  );
  assert.equal(geometry.isNearFirstPoint(square, null, project, 12), false);
  assert.deepEqual(clone(geometry.SNAP_TOLERANCE_PX), { mouse: 12, touch: 20 });
  const drawn = run(idle, { type: "start" }, ...square.map(add), {
    type: "complete",
  });
  assert.equal(drawn.points.length, 4);
  const boundary = geometry.pointsToBoundary(drawn.points);
  assert.equal(boundary.coordinates[0][0].length, 5);
});

test("drawn points become the exact MultiPolygon shape and [lng, lat] order step 3 saves", () => {
  const boundary = geometry.pointsToBoundary(square);
  assert.deepEqual(clone(boundary), {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [77, 26],
          [77.001, 26],
          [77.001, 26.001],
          [77, 26.001],
          [77, 26],
        ],
      ],
    ],
  });
  assert.deepEqual(clone(geometry.boundaryPoints(boundary)), clone(square));
  assert.deepEqual(
    clone(geometry.pointsToBoundary([...square].reverse())),
    clone(boundary),
    "clockwise drawings are normalised like step 3",
  );
});

test("the shared add guard keeps Add Farm step 3's spacing and limit rules", () => {
  assert.equal(geometry.MIN_VERTEX_SPACING_M, 0.05);
  assert.equal(geometry.boundaryPointRejection(square, square[0]), "duplicate");
  assert.equal(
    geometry.boundaryPointRejection([], { lat: 91, lng: 0 }),
    "pointLimit",
  );
  assert.equal(
    geometry.boundaryPointRejection(square, { lat: 26.5, lng: 77 }),
    null,
  );
  const source = fs.readFileSync("src/hooks/useFarmBoundary.ts", "utf8");
  assert.match(source, /boundaryPointRejection\(points, point\)/);
  assert.doesNotMatch(source, /pointDistance\(p, point\) < 0\.05/);
});

test("draft memory survives remounts for the same Farmer only and never touches storage", () => {
  const react = {
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    useCallback: (fn) => fn,
    useMemo: (factory) => factory(),
  };
  // No localStorage/sessionStorage globals exist here: any access would throw.
  const useBoundaryDraw = load(base + "boundaryDraw/useBoundaryDraw.ts", {
    react,
    "./boundaryDrawState": drawState,
  }).default;
  let draw = useBoundaryDraw(4);
  assert.equal(draw.mode, "idle");
  draw.dispatch({ type: "start" });
  for (const point of square) useBoundaryDraw(4).dispatch(add(point));
  draw = useBoundaryDraw(4);
  assert.equal(draw.mode, "drawing");
  assert.equal(draw.points.length, 4);
  assert.equal(draw.area, geometry.boundaryArea(square));
  assert.equal(useBoundaryDraw(5).mode, "idle", "another Farmer sees nothing");
  assert.equal(useBoundaryDraw(undefined).mode, "idle");
  useBoundaryDraw(undefined).dispatch({ type: "start" });
  assert.equal(useBoundaryDraw(4).points.length, 4);
  useBoundaryDraw(4).dispatch({ type: "reset" });
  assert.equal(useBoundaryDraw(4).mode, "idle");
});

test("keyboard shortcuts map Enter, Backspace, Ctrl/Cmd+Z and Esc and ignore fields and dialogs", () => {
  const { boundaryDrawShortcut: shortcut } = load(
    base + "boundaryDraw/useBoundaryDrawShortcuts.ts",
    { react: {} },
  );
  const element = (selector) => ({
    closest: (query) => (selector && query.includes(selector) ? {} : null),
  });
  const key = (value, extra = {}) => ({
    key: value,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    defaultPrevented: false,
    target: element(null),
    ...extra,
  });
  assert.equal(shortcut(key("Enter")), "complete");
  assert.equal(shortcut(key("Backspace")), "undo");
  assert.equal(shortcut(key("z", { ctrlKey: true })), "undo");
  assert.equal(shortcut(key("Z", { metaKey: true })), "undo");
  assert.equal(shortcut(key("Escape")), "clear");
  assert.equal(shortcut(key("a")), null);
  assert.equal(shortcut(key("Enter", { ctrlKey: true })), null);
  assert.equal(shortcut(key("Backspace", { target: element("input") })), null);
  assert.equal(
    shortcut(key("Escape", { target: element("[role='dialog']") })),
    null,
  );
  assert.equal(shortcut(key("Enter", { target: element("button") })), null);
  assert.equal(shortcut(key("Escape", { defaultPrevented: true })), null);
});

function layerHarness(props) {
  const runtime = hooks();
  const log = { mapListeners: [], shapes: [], overlays: [], options: [] };
  const listener = (list, event, fn) => {
    const entry = {
      event,
      fn,
      removed: false,
      remove: () => (entry.removed = true),
    };
    list.push(entry);
    return entry;
  };
  class OverlayView {
    constructor() {
      this.map = null;
      log.overlays.push(this);
    }
    setMap(map) {
      const previous = this.map;
      this.map = map;
      if (map && !previous) this.onAdd?.();
      if (!map && previous) this.onRemove?.();
    }
    getPanes() {
      return { floatPane: { appendChild() {} } };
    }
    getProjection() {
      return {
        fromLatLngToContainerPixel: ({ lat, lng }) => ({
          x: lng * 1e5,
          y: -lat * 1e5,
        }),
        fromLatLngToDivPixel: ({ lat, lng }) => ({ x: lng, y: lat }),
      };
    }
    static preventMapHitsAndGesturesFrom() {}
  }
  const shape = (kind) =>
    function (options) {
      const item = {
        kind,
        options,
        map: options?.map,
        listeners: [],
        setMap: (map) => (item.map = map),
        setPath: (path) => (item.path = path),
        addGeoJson: (value) => (item.geojson = value),
        setStyle: (style) => (item.style = style),
        addListener: (event, fn) => listener(item.listeners, event, fn),
      };
      log.shapes.push(item);
      return item;
    };
  const map = {
    addListener: (event, fn) => listener(log.mapListeners, event, fn),
    setOptions: (options) => log.options.push(options),
  };
  const sdk = {
    OverlayView,
    Polyline: shape("polyline"),
    Polygon: shape("polygon"),
    Data: shape("data"),
    SymbolPath: { CIRCLE: 0 },
    event: { clearInstanceListeners() {} },
  };
  const Layer = load(
    base + "boundaryDraw/BoundaryDrawLayer.tsx",
    {
      react: runtime.react,
      "react-dom": {
        createPortal: (child) => ({
          type: "Portal",
          props: { children: child },
        }),
      },
      "../farmGeometry": geometry,
    },
    {
      document: {
        createElement: () => ({ style: {}, remove() {} }),
      },
      window: { matchMedia: () => ({ matches: false }) },
    },
  ).default;
  const calls = { added: [], completed: 0, opened: 0 };
  const current = {
    sdk,
    map,
    mode: "drawing",
    points: [],
    label: "draft",
    onAdd: (point) => calls.added.push(point),
    onComplete: () => calls.completed++,
    onOpen: () => calls.opened++,
    ...props,
  };
  const render = (next = {}) => {
    Object.assign(current, next);
    const tree = runtime.render(Layer, current);
    runtime.flush();
    return runtime.render(Layer, current);
  };
  const click = (lat, lng) =>
    log.mapListeners
      .find((entry) => entry.event === "click" && !entry.removed)
      .fn({ latLng: { lat: () => lat, lng: () => lng } });
  return { render, runtime, log, calls, click };
}

test("map layer adds points, snaps to the first point and removes every listener and overlay", () => {
  const h = layerHarness();
  h.render();
  assert.deepEqual(h.log.mapListeners.map((entry) => entry.event).sort(), [
    "click",
    "mousemove",
    "mouseout",
  ]);
  assert.deepEqual(clone(h.log.options[0]), {
    draggableCursor: "crosshair",
    disableDoubleClickZoom: true,
  });
  h.click(26, 77);
  assert.deepEqual(clone(h.calls.added), [{ lat: 26, lng: 77 }]);
  h.render({ points: square });
  h.click(26.00005, 77.00005); // about 7 px from the first point
  assert.equal(h.calls.completed, 1);
  assert.equal(h.calls.added.length, 1, "closing adds no duplicate point");
  h.click(26.0004, 77.0004);
  assert.equal(h.calls.added.length, 2);
  const move = h.log.mapListeners.find((entry) => entry.event === "mousemove");
  const rubber = h.log.shapes.find(
    (item) => item.kind === "polyline" && item.options.path.length === 0,
  );
  move.fn({ latLng: { lat: () => 26.00005, lng: () => 77.00005 } });
  assert.deepEqual(
    clone(rubber.path),
    [square[3], square[0]],
    "rubber band snaps",
  );
  h.render({ mode: "drawn" });
  const polygon = h.log.shapes.find(
    (item) => item.kind === "polygon" && item.map,
  );
  assert.equal(polygon.options.clickable, true);
  assert.equal(polygon.options.fillColor, "#fdb022");
  polygon.listeners[0].fn();
  assert.equal(h.calls.opened, 1);
  h.click(26.3, 77.3);
  assert.equal(h.calls.added.length, 2, "a closed draft ignores map clicks");
  h.runtime.cleanup();
  assert.equal(
    h.log.mapListeners.every((entry) => entry.removed),
    true,
  );
  assert.equal(
    polygon.listeners.every((entry) => entry.removed),
    true,
  );
  assert.equal(
    h.log.shapes.every((item) => item.map === null),
    true,
  );
  assert.equal(
    h.log.overlays.every((overlay) => overlay.map === null),
    true,
  );
  assert.deepEqual(clone(h.log.options.at(-1)), {
    draggableCursor: null,
    disableDoubleClickZoom: false,
  });
});

test("floating actions keep the idle stack and pin Confirm Boundary / Save as Farm while drawing", () => {
  const runtime = hooks();
  const Fab = load(
    base + "AccountFloatingActions.tsx",
    { react: runtime.react, "next-intl": intl, "@/icons": icons },
    { document: { addEventListener() {}, removeEventListener() {} } },
  ).default;
  let drawn = 0;
  const props = {
    open: true,
    mapType: "roadmap",
    mapReady: true,
    availableHeight: 600,
    bottom: 24,
    onToggle() {},
    onAddFarm() {},
    onDrawFarm: () => drawn++,
    onMapType() {},
    onLocate() {},
    onFit() {},
    onReset() {},
  };
  const labels = (tree) =>
    nodes(tree)
      .filter((node) => node.type === "span")
      .map((node) => node.props.children);
  let tree = runtime.render(Fab, props);
  assert.equal(labels(tree).includes("drawFarm"), true);
  assert.equal(labels(tree).includes("confirm"), false);
  tree = runtime.render(Fab, {
    ...props,
    drawMode: "drawing",
    canCompleteDraw: false,
    drawToolbar: { type: "DrawToolbar", props: {} },
  });
  assert.equal(labels(tree).includes("drawFarm"), false);
  assert.equal(
    nodes(tree).some((node) => node.type === "DrawToolbar"),
    true,
  );
  let pinned = nodes(tree).find(
    (node) => node.props?.["aria-label"] === "confirm",
  );
  assert.equal(pinned.props["aria-disabled"], true);
  assert.equal(pinned.props.title, "minPoints");
  pinned.props.onClick();
  assert.equal(drawn, 0);
  tree = runtime.render(Fab, {
    ...props,
    drawMode: "drawn",
    canCompleteDraw: true,
  });
  pinned = nodes(tree).find(
    (node) => node.props?.["aria-label"] === "saveAsFarm",
  );
  pinned.props.onClick();
  assert.equal(drawn, 1);
});

test("toolbar switches Undo to Reopen and blocks Complete below three points", () => {
  const Toolbar = load(base + "boundaryDraw/BoundaryDrawToolbar.tsx", {
    "next-intl": intl,
    "@/icons": icons,
  }).default;
  const calls = [];
  const props = {
    mode: "drawing",
    count: 0,
    onUndo: () => calls.push("undo"),
    onClear: () => calls.push("clear"),
    onComplete: () => calls.push("complete"),
  };
  const buttons = (tree) =>
    nodes(tree).filter((node) => node.type === "button");
  let [undo, clear, complete] = buttons(Toolbar(props));
  assert.equal(undo.props.disabled, true);
  assert.equal(complete.props["aria-disabled"], true);
  assert.equal(complete.props.title, "minPoints");
  complete.props.onClick();
  clear.props.onClick();
  assert.deepEqual(calls, ["clear"]);
  [undo, , complete] = buttons(Toolbar({ ...props, mode: "drawn", count: 4 }));
  assert.equal(undo.props["aria-label"], "reopen");
  assert.equal(complete.props["aria-label"], "addFarm");
  undo.props.onClick();
  complete.props.onClick();
  assert.deepEqual(calls, ["clear", "undo", "complete"]);
});

function wizard({ farm, initialBoundary, profile } = {}) {
  const runtime = hooks();
  let config;
  const form = {
    formState: { errors: {}, isDirty: false },
    control: {},
    getValues: (name) =>
      name ? config.defaultValues[name] : config.defaultValues,
    getFieldState: () => ({ isDirty: false }),
    resetField: (name, options) =>
      (config.defaultValues[name] = options.defaultValue),
    trigger: async () => true,
    clearErrors() {},
    setError() {},
  };
  const session = {
    points: [],
    boundary: null,
    draft: { boundary: null, boundary_source: null, gps_accuracy_m: null },
    active: false,
    pause() {},
    setNotice() {},
  };
  const sessions = [];
  const Dialog = load(base + "../farms/_components/AddFarmDialog.tsx", {
    react: runtime.react,
    "next-intl": intl,
    "react-hot-toast": { success() {}, error() {} },
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
        config ??= clone(options);
        return form;
      },
      useWatch: () => config.defaultValues,
    },
    "@/hooks/useFarmBoundary": {
      __esModule: true,
      default: (...args) => {
        sessions.push(args);
        return session;
      },
    },
    [geoPath]: geometry,
    "@/actions/account/farms": { saveFarmerFarm: async () => ({}) },
    "@/components/common/maps/BoundaryConfirmDialog": "Confirm",
    "@/icons": icons,
    "./FarmStepper": "Stepper",
    "./FarmInformationStep": "Information",
    "./FarmLocationStep": "Location",
    "./FarmBoundaryStep": "Boundary",
    "./FarmReviewStep": "Review",
    "./FarmIllustration": "Illustration",
    "./farmFormTypes": load(base + "../farms/_components/farmFormTypes.ts"),
  }).default;
  const props = {
    profile: profile ?? {
      state_id: 1,
      district_id: 2,
      village: "V",
      preferred_units: "acre",
    },
    farm,
    initialBoundary,
    onClose() {},
    onSaved() {},
  };
  runtime.render(Dialog, props);
  runtime.flush();
  const tree = runtime.render(Dialog, props);
  return { values: config.defaultValues, sessions, tree };
}

test("Add Farm from a drawn boundary starts at step 1 with Total Farm Area pre-filled", () => {
  const boundary = geometry.pointsToBoundary(square);
  const draft = { boundary, boundary_source: "manual", gps_accuracy_m: null };
  const h = wizard({ initialBoundary: draft });
  const acres = areaFixture.utils.fromSquareMeters(
    geometry.boundaryArea(square),
    "acre",
    areaFixture.config,
  );
  assert.equal(h.values.area_unit, "acre");
  assert.equal(h.values.area, acres.toFixed(3));
  assert.match(h.values.area, /^\d{1,9}\.\d{3}$/);
  assert.equal(h.sessions[0][0], draft, "boundary reaches step 3 unchanged");
  const stepper = nodes(h.tree).find((node) => node.type === "Stepper");
  assert.equal(stepper.props.step, 0);
  assert.equal(stepper.props.isEditing, false);
  const hectare = wizard({
    initialBoundary: draft,
    profile: { preferred_units: "hectare" },
  });
  assert.equal(
    hectare.values.area,
    (geometry.boundaryArea(square) / 10000).toFixed(3),
  );
});

test("Add Farm without a drawn boundary and Edit Farm keep today's area defaults", () => {
  const plain = wizard();
  assert.equal(plain.values.area, "");
  assert.equal(plain.values.area_unit, "acre");
  assert.equal(
    nodes(plain.tree).find((node) => node.type === "Stepper").props.step,
    0,
  );
  const farm = {
    id: 3,
    name: "Saved",
    area: "7.500",
    area_unit: "acre",
    boundary: geometry.pointsToBoundary(square),
    boundary_source: "manual",
    gps_accuracy_m: null,
    state_id: 1,
    district_id: 2,
    village: "V",
  };
  const edit = wizard({
    farm,
    initialBoundary: {
      boundary: geometry.pointsToBoundary(
        square.map((p) => ({ lat: p.lat + 1, lng: p.lng })),
      ),
      boundary_source: "manual",
      gps_accuracy_m: null,
    },
  });
  assert.equal(edit.values.area, "7.500");
  assert.equal(edit.sessions[0][0].boundary, farm.boundary);
});

test("boundary drawing copy exists in English and Hindi with matching placeholders", () => {
  const en = JSON.parse(fs.readFileSync("src/messages/en.json", "utf8"));
  const hi = JSON.parse(fs.readFileSync("src/messages/hi.json", "utf8"));
  const keys = [
    "confirm",
    "saveAsFarm",
    "minPoints",
    "toolbar",
    "undo",
    "reopen",
    "clear",
    "complete",
    "addFarm",
    "hint",
    "drawnHint",
    "progress",
    "progressWithArea",
    "shortcuts",
    "draftLabel",
  ];
  const placeholders = (text) =>
    [...text.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort();
  for (const messages of [en, hi]) {
    const draw = messages.farmerDashboard.boundaryDraw;
    assert.deepEqual(Object.keys(draw).sort(), [...keys].sort());
    for (const key of keys) assert.ok(draw[key].trim(), key);
    for (const key of [
      "pointLimit",
      "discardBoundaryTitle",
      "discardBoundaryDescription",
    ])
      assert.ok(messages.farmerFarms[key], key);
    for (const key of ["vertices", "coordinates", "intersection", "area"])
      assert.ok(messages.farmerFarms.boundaryErrors[key], key);
  }
  for (const key of keys)
    assert.deepEqual(
      placeholders(hi.farmerDashboard.boundaryDraw[key]),
      placeholders(en.farmerDashboard.boundaryDraw[key]),
      key,
    );
  assert.equal(en.farmerDashboard.boundaryDraw.confirm, "Confirm Boundary");
  assert.equal(
    en.farmerDashboard.boundaryDraw.minPoints,
    "Add at least 3 points",
  );
});
