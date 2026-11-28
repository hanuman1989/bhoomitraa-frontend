const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { createTranslator } = require("next-intl");

const base = "src/app/[locale]/(account)/account/(protected)/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
const messages = Object.fromEntries(
  ["en", "hi"].map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(`src/messages/${locale}.json`, "utf8")),
  ]),
);
const translators = new Map();
// Real English messages: a key the code uses but the dictionary lacks fails the test.
const intl = {
  useTranslations(namespace) {
    if (!translators.has(namespace))
      translators.set(
        namespace,
        createTranslator({
          locale: "en",
          messages: messages.en,
          namespace,
          timeZone: "Asia/Kolkata",
          onError(error) {
            throw error;
          },
        }),
      );
    return translators.get(namespace);
  },
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
function hooks() {
  const slots = [];
  let cursor = 0;
  let queue = [];
  const changed = (a, b) =>
    !a || !b || a.length !== b.length || a.some((v, i) => v !== b[i]);
  const react = {
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
function text(tree) {
  if (tree === null || tree === undefined || typeof tree === "boolean")
    return "";
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join("");
  return text(tree.props?.children);
}
/** Renders the hook-free FabGroup and FabButton so the real markup can be inspected. */
function expand(tree) {
  if (Array.isArray(tree)) return tree.map(expand);
  if (!tree || typeof tree !== "object") return tree;
  if (typeof tree.type === "function") return expand(tree.type(tree.props));
  return {
    ...tree,
    props: { ...tree.props, children: expand(tree.props?.children) },
  };
}

const config = load(base + "fab/fabGroups.ts", { "@/icons": icons });
const FabButton = load(base + "fab/FabButton.tsx", {
  "@/utils": utils,
}).default;
const FabGroup = load(base + "fab/FabGroup.tsx", {
  "@/components/common/Tooltip": "Tooltip",
  "@/icons": icons,
  "@/utils": utils,
  "./FabButton": FabButton,
}).default;

function harness(overrides = {}) {
  const runtime = hooks();
  const listeners = {};
  const dom = { dialog: false, active: null };
  class Node {}
  const Fab = load(
    base + "AccountFloatingActions.tsx",
    {
      react: runtime.react,
      "next-intl": intl,
      "@/components/common/Tooltip": "Tooltip",
      "@/icons": icons,
      "@/utils": utils,
      "./fab/FabButton": FabButton,
      "./fab/FabGroup": FabGroup,
      "./fab/fabGroups": config,
    },
    {
      Node,
      document: {
        addEventListener: (name, fn) => (listeners[name] = fn),
        removeEventListener: (name) => delete listeners[name],
        querySelector: () => (dom.dialog ? {} : null),
        get activeElement() {
          return dom.active;
        },
      },
    },
  ).default;
  const calls = [];
  const props = {
    group: null,
    mapType: "satellite",
    mapReady: true,
    availableHeight: 700,
    maxHeight: 520,
    bottom: 48,
    onGroup(group) {
      calls.push(["group", group]);
      props.group = group;
    },
    onAddFarm: () => calls.push(["addFarm"]),
    onDrawFarm: () => calls.push(["drawFarm"]),
    onMapType: (type) => calls.push(["mapType", type]),
    onLocate: () => calls.push(["locate"]),
    onFit: () => calls.push(["fitAll"]),
    onReset: () => calls.push(["reset"]),
    ...overrides,
  };
  let tree;
  const h = {
    runtime,
    listeners,
    dom,
    Node,
    calls,
    props,
    render: () => (tree = expand(runtime.render(Fab, props))),
    get tree() {
      return tree;
    },
    stack: () =>
      nodes(tree).find(
        (node) =>
          node.props?.role === "group" &&
          node.props["aria-label"] === "Map actions",
      ),
    rows: () => [h.stack().props.children].flat(Infinity).filter(Boolean),
    mains: () =>
      nodes(tree).filter(
        (node) =>
          node.type === "button" && node.props["aria-expanded"] !== undefined,
      ),
    main: (label) => h.mains().find((node) => text(node).startsWith(label)),
    menu: (label) =>
      nodes(tree).find(
        (node) =>
          node.props?.role === "group" && node.props["aria-label"] === label,
      ),
    items: (label) =>
      nodes(h.menu(label))
        .filter((node) => node.type === "button")
        .map((node) => text(node)),
    item: (label, name) =>
      nodes(h.menu(label)).find(
        (node) => node.type === "button" && text(node) === name,
      ),
    catcher: () =>
      nodes(tree).find(
        (node) => node.props?.["data-fab-catcher"] !== undefined,
      ),
  };
  h.render();
  return h;
}
const irrigation = (
  layers = { farms: true, sources: true, pipelines: true },
) => {
  const calls = [];
  return {
    calls,
    layers,
    onToggleLayer: (layer) => calls.push(["layer", layer]),
    onFit: () => calls.push(["fitIrrigation"]),
  };
};

test("closed: Draw Farm Boundary and the three groups stack at the bottom right with no '–' toggle", () => {
  const h = harness();
  const stack = h.stack();
  // Grows upward from a fixed bottom, 16 px above the panel button.
  assert.match(stack.props.className, /\bflex-col\b/);
  assert.match(stack.props.className, /\bjustify-end\b/);
  assert.match(stack.props.className, /\bend-5\b.*\bsm:end-7\b/);
  assert.equal(
    stack.props.style.bottom,
    "max(48px, env(safe-area-inset-bottom))",
  );
  const [draw, ...groups] = h.rows();
  assert.equal(draw.type, "button");
  assert.equal(text(draw), "Draw Farm Boundary");
  assert.equal(groups.length, 3);
  assert.deepEqual(
    h.mains().map((node) => [text(node), node.props["aria-expanded"]]),
    [
      ["Farm Actions", false],
      ["Locate & Fit", false],
      ["Map Layers", false],
    ],
  );
  for (const main of h.mains())
    assert.equal(h.menu(text(main)).props.hidden, true);
  assert.equal(h.catcher(), undefined);
  // The old open/close toggle is gone.
  assert.equal(
    nodes(h.tree).some(
      (node) => node.props?.["aria-controls"] === "account-map-actions",
    ),
    false,
  );
  // Same circle as the panel button; rows stay 44 px tall on phones.
  const circle = nodes(draw).find((node) =>
    String(node.props?.className).includes("rounded-full text-white"),
  );
  assert.match(circle.props.className, /\bsize-8\b/);
  assert.match(draw.props.className, /\bmin-h-11\b.*\bsm:min-h-0\b/);
  assert.match(
    fs.readFileSync(base + "AccountBottomPanel.tsx", "utf8"),
    /end-5 z-30 size-8/,
  );
  h.runtime.cleanup();
});

test("opening a group shows its exact items above its button, marks it expanded and hides the Draw button", () => {
  const h = harness({ irrigation: irrigation() });
  h.main("Farm Actions").props.onClick();
  assert.deepEqual(h.calls, [["group", "farm"]]);
  h.render();
  const farm = h.main("Farm Actions");
  assert.equal(farm.props["aria-expanded"], true);
  assert.equal(farm.props["aria-controls"], h.menu("Farm Actions").props.id);
  assert.equal(h.menu("Farm Actions").props.hidden, false);
  assert.ok(nodes(farm).some((node) => node.type === "CloseLineIcon"));
  assert.deepEqual(h.items("Farm Actions"), ["Add Farm", "Draw Farm Boundary"]);
  // The items come right before (above) the main button.
  const farmRow = h.rows()[0];
  const parts = [farmRow.props.children].flat(Infinity).filter(Boolean);
  assert.equal(parts[0].props.id, h.menu("Farm Actions").props.id);
  assert.equal(nodes(parts[1]).includes(farm), true);
  assert.notEqual(h.rows()[0].type, "button");

  h.props.group = "view";
  h.render();
  assert.deepEqual(h.items("Locate & Fit"), [
    "My Location",
    "Fit All Farms",
    "Fit Irrigation Assets",
  ]);
  h.props.group = "layers";
  h.render();
  assert.deepEqual(h.items("Map Layers"), [
    "Road Map",
    "Farm Boundaries",
    "Water Sources",
    "Pipelines",
    "Reset Map Layers",
  ]);
  // A thin divider separates Reset from the toggles.
  const layers = nodes(h.menu("Map Layers"));
  const divider = layers.findIndex(
    (node) =>
      node.type === "span" && String(node.props.className).includes("h-px"),
  );
  const buttons = (list) => list.filter((node) => node.type === "button");
  assert.equal(text(buttons(layers.slice(0, divider)).at(-1)), "Pipelines");
  assert.equal(text(buttons(layers.slice(divider))[0]), "Reset Map Layers");
  h.runtime.cleanup();
});

test("one group at a time: opening another closes the first, and ✕ closes it", () => {
  const h = harness({ group: "farm" });
  h.main("Locate & Fit").props.onClick();
  h.render();
  assert.equal(h.props.group, "view");
  assert.equal(h.menu("Farm Actions").props.hidden, true);
  assert.equal(h.menu("Locate & Fit").props.hidden, false);
  h.main("Locate & Fit").props.onClick();
  h.render();
  assert.equal(h.props.group, null);
  assert.equal(h.menu("Locate & Fit").props.hidden, true);
  h.runtime.cleanup();
});

test("a tap on the map or Esc closes the group, and the tap never reaches the map", () => {
  const h = harness({ group: "layers" });
  const catcher = h.catcher();
  // A full-screen layer above the map and below the stack takes the tap.
  assert.match(catcher.props.className, /\babsolute inset-0 z-10\b/);
  assert.equal(catcher.props["aria-hidden"], "true");
  let prevented = 0;
  let stopped = 0;
  catcher.props.onClick({
    preventDefault: () => prevented++,
    stopPropagation: () => stopped++,
  });
  assert.deepEqual([prevented, stopped], [1, 1]);
  assert.equal(h.props.group, null);

  // Pointer presses elsewhere close it too, but the catcher handles its own.
  h.props.group = "view";
  h.render();
  const onCatcher = new h.Node();
  h.catcher().props.ref.current = {
    contains: (target) => target === onCatcher,
  };
  h.stack().props.ref.current = { contains: () => false };
  h.listeners.pointerdown({ target: onCatcher });
  assert.equal(h.props.group, "view");
  h.listeners.pointerdown({ target: new h.Node() });
  assert.equal(h.props.group, null);

  // Esc closes, except over a dialog or while typing; focus returns to the group button.
  h.props.group = "view";
  h.render();
  const escape = () => {
    let handled = false;
    h.listeners.keydown({
      key: "Escape",
      preventDefault: () => (handled = true),
    });
    return handled;
  };
  h.dom.dialog = true;
  assert.equal(escape(), false);
  h.dom.dialog = false;
  h.dom.active = { closest: () => ({}) };
  assert.equal(escape(), false);
  assert.equal(h.props.group, "view");
  let focused = 0;
  h.main("Locate & Fit").props.ref({ focus: () => focused++ });
  h.dom.active = { closest: () => null };
  h.stack().props.ref.current = {
    contains: (target) => target === h.dom.active,
  };
  assert.equal(escape(), true);
  assert.equal(h.props.group, null);
  assert.equal(focused, 1);
  h.render();
  h.runtime.cleanup();
  assert.deepEqual(Object.keys(h.listeners), []);
});

test("actions run their existing handler once and close the group; toggles keep it open", () => {
  const layers = irrigation({ farms: true, sources: true, pipelines: false });
  const h = harness({ irrigation: layers });
  const press = (group, label, name) => {
    h.props.group = group;
    h.render();
    h.calls.length = 0;
    layers.calls.length = 0;
    h.item(label, name).props.onClick();
    return [...h.calls, ...layers.calls];
  };
  assert.deepEqual(press("farm", "Farm Actions", "Add Farm"), [
    ["group", null],
    ["addFarm"],
  ]);
  assert.deepEqual(press("farm", "Farm Actions", "Draw Farm Boundary"), [
    ["group", null],
    ["drawFarm"],
  ]);
  assert.deepEqual(press("view", "Locate & Fit", "My Location"), [
    ["group", null],
    ["locate"],
  ]);
  assert.deepEqual(press("view", "Locate & Fit", "Fit All Farms"), [
    ["group", null],
    ["fitAll"],
  ]);
  assert.deepEqual(press("view", "Locate & Fit", "Fit Irrigation Assets"), [
    ["group", null],
    ["fitIrrigation"],
  ]);
  assert.deepEqual(press("layers", "Map Layers", "Reset Map Layers"), [
    ["group", null],
    ["reset"],
  ]);
  // Toggles: the map type and the three layers.
  assert.deepEqual(press("layers", "Map Layers", "Road Map"), [
    ["mapType", "roadmap"],
  ]);
  for (const [name, layer] of [
    ["Farm Boundaries", "farms"],
    ["Water Sources", "sources"],
    ["Pipelines", "pipelines"],
  ])
    assert.deepEqual(press("layers", "Map Layers", name), [["layer", layer]]);
  assert.equal(h.props.group, "layers");
  // Layer toggles are pressed buttons with a ✓ and grey when off.
  const off = h.item("Map Layers", "Pipelines");
  assert.equal(off.props["aria-pressed"], false);
  assert.ok(
    nodes(off).some((node) =>
      String(node.props?.className).includes("bg-gray-400"),
    ),
  );
  assert.equal(
    h.item("Map Layers", "Water Sources").props["aria-pressed"],
    true,
  );
  assert.equal(
    h.item("Map Layers", "Road Map").props["aria-pressed"],
    undefined,
  );
  h.runtime.cleanup();
});

test("the Map Layers badge counts the layers that are on", () => {
  const h = harness({
    irrigation: irrigation({ farms: true, sources: false, pipelines: true }),
  });
  assert.equal(text(h.main("Map Layers")), "Map Layers2/3");
  h.props.irrigation = irrigation({
    farms: false,
    sources: false,
    pipelines: false,
  });
  h.render();
  assert.equal(text(h.main("Map Layers")), "Map Layers0/3");
  h.props.irrigation = undefined;
  h.render();
  assert.equal(text(h.main("Map Layers")), "Map Layers");
  h.runtime.cleanup();
});

test("while drawing or holding a draft, Confirm / Save as Farm and the toolbar stay and Farm Actions is disabled", () => {
  const h = harness({
    group: "layers",
    drawMode: "drawing",
    canCompleteDraw: false,
    drawToolbar: jsx.jsx("DrawToolbar", {}),
  });
  // Even with Map Layers open, the drawing row stays on top.
  const draw = h.rows()[0];
  assert.ok(nodes(draw).some((node) => node.type === "DrawToolbar"));
  const confirm = nodes(draw).find(
    (node) => node.props?.["aria-label"] === "Confirm Boundary",
  );
  assert.equal(confirm.props["aria-disabled"], true);
  assert.equal(h.menu("Map Layers").props.hidden, false);
  // Farm Actions explains why it is unavailable and stays shut.
  const farm = h.main("Farm Actions");
  assert.equal(farm.props["aria-disabled"], true);
  const reason = nodes(h.tree).find(
    (node) =>
      node.type === "Tooltip" &&
      node.props.content === "Finish or clear the boundary first",
  );
  assert.ok(reason);
  assert.equal(farm.props["aria-describedby"], reason.props.id);
  h.calls.length = 0;
  farm.props.onClick();
  assert.deepEqual(h.calls, []);
  // A blocked group can't be open.
  h.props.group = "farm";
  h.render();
  assert.equal(h.menu("Farm Actions").props.hidden, true);
  assert.equal(h.catcher(), undefined);
  // An unsaved draft keeps the same rules.
  h.props.drawMode = "drawn";
  h.props.canCompleteDraw = true;
  h.render();
  assert.ok(
    nodes(h.rows()[0]).some(
      (node) => node.props?.["aria-label"] === "Save as Farm",
    ),
  );
  assert.equal(h.main("Farm Actions").props["aria-disabled"], true);
  h.runtime.cleanup();
});

test("groups follow what the page supports: irrigation items only when the map shows irrigation assets, empty groups left out", () => {
  const context = {
    mapType: "satellite",
    mapReady: true,
    drawing: false,
    onAddFarm() {},
    onDrawFarm() {},
    onMapType() {},
    onLocate() {},
    onFit() {},
    onReset() {},
  };
  const ids = (groups) =>
    groups.map((group) => [group.id, group.items.map((item) => item.id)]);
  const other = config.fabGroups(context);
  assert.deepEqual(clone(ids(other)), [
    ["farm", ["addFarm", "drawFarm"]],
    ["view", ["myLocation", "fitAll"]],
    ["layers", ["mapType", "resetLayers"]],
  ]);
  assert.equal(other[2].badge, undefined);
  const irrigationPage = config.fabGroups({
    ...context,
    irrigation: irrigation(),
  });
  assert.deepEqual(clone(ids(irrigationPage)), [
    ["farm", ["addFarm", "drawFarm"]],
    ["view", ["myLocation", "fitAll", "fitIrrigation"]],
    [
      "layers",
      ["mapType", "farmBoundaries", "waterSources", "pipelines", "resetLayers"],
    ],
  ]);
  assert.equal(irrigationPage[2].badge, "3/3");
  // Before the map loads only Add Farm works; while drawing Farm Actions is blocked.
  const loading = config.fabGroups({ ...context, mapReady: false });
  assert.deepEqual(
    clone(
      loading.flatMap((group) =>
        group.items.filter((item) => !item.disabled).map((item) => item.id),
      ),
    ),
    ["addFarm"],
  );
  assert.equal(
    config.fabGroups({ ...context, drawing: true })[0].blocked,
    "finishDrawing",
  );
  // A group with nothing to offer on this page is left out.
  const [, view] = config.fabGroupDefinitions;
  const hidden = config.fabGroups(context, [
    { ...view, items: view.items.filter((item) => item.available) },
  ]);
  assert.deepEqual(hidden, []);
  // Grouping lives in the config, not in route checks in the component.
  const component = fs.readFileSync(
    base + "AccountFloatingActions.tsx",
    "utf8",
  );
  assert.doesNotMatch(component, /pathname|\/account\/|usePathname/);
});

test("the stack doesn't scroll where it fits: 32 px rows from sm, then the buttons above an open group and the zoom buttons make room", () => {
  const groups = config.fabGroups({
    mapType: "satellite",
    mapReady: true,
    drawing: false,
    onAddFarm() {},
    onDrawFarm() {},
    onMapType() {},
    onLocate() {},
    onFit() {},
    onReset() {},
    irrigation: irrigation(),
  });
  const layout = (open, row, space, zoomSpace, draw = !open) =>
    clone(config.fabLayout({ groups, open, draw, row, space, zoomSpace }));
  const desktop = config.fabRowHeight(false);
  const phone = config.fabRowHeight(true);
  assert.deepEqual([desktop, phone], [32, 44]);
  const fits = { hideAbove: false, hideZoom: false, scrolls: false };
  // The reported desktop map with the panel down: open Map Layers (325 px) fits.
  assert.deepEqual(layout("layers", desktop, 366, 92), fits);
  assert.deepEqual(layout("layers", desktop, 325, 0), fits);
  // Short of room: the buttons above make way first, then the zoom buttons, then both.
  assert.deepEqual(layout("layers", desktop, 300, 92), {
    ...fits,
    hideAbove: true,
  });
  assert.deepEqual(layout("layers", desktop, 240, 92), {
    ...fits,
    hideZoom: true,
  });
  assert.deepEqual(layout("layers", phone, 262, 92), {
    hideAbove: true,
    hideZoom: true,
    scrolls: false,
  });
  // While drawing, the Confirm row stays above the open group.
  assert.deepEqual(layout("layers", desktop, 300, 0, true), {
    ...fits,
    hideAbove: true,
  });
  assert.deepEqual(layout("layers", desktop, 280, 0, true), {
    hideAbove: true,
    hideZoom: false,
    scrolls: true,
  });
  // Only a tiny map scrolls.
  assert.deepEqual(layout("layers", phone, 150, 92), {
    hideAbove: true,
    hideZoom: true,
    scrolls: true,
  });
  // The top group has nothing above it; a closed stack can only use the zoom room.
  assert.equal(layout("farm", phone, 100, 92).hideAbove, false);
  assert.deepEqual(layout(null, phone, 200, 92), fits);
  assert.deepEqual(layout(null, phone, 141, 92), { ...fits, hideZoom: true });

  // In the component: the buttons above leave the stack, the zoom buttons are
  // asked to step aside only while needed, and nothing shows a scrollbar.
  const reports = [];
  const h = harness({
    irrigation: irrigation(),
    maxHeight: 300,
    zoomRoom: 92,
    onZoomHidden: (value) => reports.push(value),
  });
  assert.deepEqual(reports, [false]);
  h.main("Map Layers").props.onClick();
  h.render();
  assert.deepEqual(
    h.mains().map((node) => text(node)),
    ["Map Layers3/3"],
  );
  assert.deepEqual(h.items("Map Layers"), [
    "Road Map",
    "Farm Boundaries",
    "Water Sources",
    "Pipelines",
    "Reset Map Layers",
  ]);
  assert.match(h.stack().props.className, /\bjustify-end\b/);
  assert.equal(h.stack().props.style.maxHeight, undefined);
  assert.deepEqual(reports, [false]);
  h.props.maxHeight = 240;
  h.render();
  assert.equal(h.mains().length, 3);
  assert.equal(reports.at(-1), true);
  // Closing gives the zoom buttons back.
  h.main("Map Layers").props.onClick();
  h.render();
  assert.equal(reports.at(-1), false);
  const scrollStyles = () =>
    nodes(h.tree).filter((node) =>
      /scrollbar|overflow/.test(String(node.props?.className)),
    );
  assert.deepEqual(scrollStyles(), []);
  // A tiny phone map: the stack itself scrolls, with no scrollbar and no
  // sideways scrolling; the open items never scroll on their own.
  h.props.maxHeight = 100;
  h.props.compact = true;
  h.main("Map Layers").props.onClick();
  h.render();
  assert.deepEqual(scrollStyles(), [h.stack()]);
  assert.match(h.stack().props.className, /\bno-scrollbar\b/);
  assert.match(h.stack().props.className, /\boverflow-x-hidden\b/);
  assert.match(h.stack().props.className, /\boverflow-y-auto\b/);
  assert.equal(h.stack().props.style.maxHeight, 192);
  h.runtime.cleanup();
  assert.equal(reports.at(-1), false);
});

test("the white icons on every main button have at least 3:1 contrast", () => {
  const css = [
    fs.readFileSync("src/app/[locale]/admin-globals.css", "utf8"),
    fs.readFileSync("node_modules/tailwindcss/theme.css", "utf8"),
  ];
  const linear = (channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  function luminance(value) {
    let rgb;
    if (value.startsWith("#")) {
      rgb = [1, 3, 5].map((i) =>
        linear(parseInt(value.slice(i, i + 2), 16) / 255),
      );
    } else {
      // oklch(L% C h) → OKLab → linear sRGB, clipped to the sRGB gamut.
      const [l, c, h] = value
        .match(/oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/)
        .slice(1)
        .map(Number);
      const L = l / 100;
      const a = c * Math.cos((h * Math.PI) / 180);
      const b = c * Math.sin((h * Math.PI) / 180);
      const lms = [
        L + 0.3963377774 * a + 0.2158037573 * b,
        L - 0.1055613458 * a - 0.0638541728 * b,
        L - 0.0894841775 * a - 1.291485548 * b,
      ].map((v) => v ** 3);
      rgb = [
        4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
        -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
        -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
      ].map((v) => Math.min(1, Math.max(0, v)));
    }
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  const token = (name) => {
    for (const sheet of css) {
      const match = sheet.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
      if (match) return match[1].trim();
    }
    throw new Error(`No colour token ${name}`);
  };
  const mains = [
    // The Draw button, then each group button.
    "bg-success-700",
    ...config.fabGroupDefinitions.map((group) => group.color),
  ];
  assert.deepEqual(mains, [
    "bg-success-700",
    "bg-success-700",
    "bg-violet-700",
    "bg-blue-light-800",
  ]);
  assert.match(
    fs.readFileSync(base + "AccountFloatingActions.tsx", "utf8"),
    /icon=\{PencilIcon\}\s*color="bg-success-700"/,
  );
  for (const color of mains) {
    const ratio = 1.05 / (luminance(token(color.slice(3))) + 0.05);
    assert.ok(ratio >= 3, `${color}: ${ratio.toFixed(2)}:1`);
  }
});

test("English and Hindi labels exist for the three groups and the drawing reason; the toggle's keys are gone", () => {
  const expected = {
    en: {
      farmGroup: "Farm Actions",
      viewGroup: "Locate & Fit",
      layerGroup: "Map Layers",
      finishDrawing: "Finish or clear the boundary first",
    },
    hi: {
      farmGroup: "खेत कार्य",
      viewGroup: "स्थान व दृश्य",
      layerGroup: "मानचित्र परतें",
      finishDrawing: "पहले सीमा पूरी करें या हटाएं",
    },
  };
  for (const locale of ["en", "hi"]) {
    const actions = messages[locale].farmerDashboard.actions;
    for (const [key, value] of Object.entries(expected[locale]))
      assert.equal(actions[key], value, `${locale}.${key}`);
    for (const key of ["open", "close", "layers"])
      assert.equal(actions[key], undefined, `${locale}.${key}`);
  }
});
