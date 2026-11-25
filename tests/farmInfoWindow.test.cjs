const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");
const { createTranslator } = require("next-intl");
const { config, utils } = require("./helpers/areaUnits.cjs");
const base = "src/app/[locale]/(account)/account/(protected)/_components/";
const maps = "src/components/common/maps/";
const geoAlias =
  "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";
const viewAlias =
  "@/app/[locale]/(account)/account/(protected)/_components/mapViewport";
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      ...globals,
      require(name) {
        if (name === "react/jsx-runtime") return jsx;
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        throw Error(`Unexpected dependency ${name}`);
      },
    },
  );
  return module.exports;
}
const geometry = load(base + "farmGeometry.ts");
const viewport = load(base + "mapViewport.ts", {
  "./googleMaps": {},
  "./farmGeometry": geometry,
});
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return Array.isArray(tree)
    ? tree.flatMap(nodes)
    : [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  return Array.isArray(tree)
    ? tree.map(text).join("")
    : tree && typeof tree === "object"
      ? text(tree.props?.children)
      : "";
}
function card(locale = "en", react = { useId: () => "farm-info" }) {
  const icons = new Proxy(
    {},
    {
      get: (_, name) => (props) =>
        jsx.jsx("span", { ...props, "data-icon": name }),
    },
  );
  return load(maps + "FarmInfoWindow.tsx", {
    react,
    "next-intl": {
      useLocale: () => locale,
      useTranslations: () =>
        createTranslator({
          locale,
          messages: JSON.parse(
            fs.readFileSync(`src/messages/${locale}.json`, "utf8"),
          ),
        }),
    },
    "@/hooks/useAreaUnits": {
      __esModule: true,
      default: () => ({
        label: (unit) =>
          utils.getAreaUnitLabel(unit, config, locale) ?? "Unconfirmed unit",
      }),
    },
    "@/lib/areaUnits": utils,
    "@/i18n/languages": { getLanguage: () => ({ dir: "ltr" }) },
    "@/icons": icons,
    "@/components/common/Tooltip": "Tooltip",
  }).default;
}
const farm = {
  id: 3,
  name: "Actual Farm",
  area: "4.000",
  area_unit: "bigha_pakka",
};

test("farm popup matches the header/menu structure in English and Hindi and shows original recorded measurements", () => {
  for (const locale of ["en", "hi"]) {
    const Card = card(locale);
    const tree = Card({ farm, onClose() {} });
    const all = nodes(tree);
    assert.equal(
      all.find((node) => node.type === "h3").props.children,
      farm.name,
    );
    assert.match(
      text(tree),
      locale === "hi" ? /4\.000 पक्का बीघा/ : /4\.000 Pakka Bigha/,
    );
    const buttons = all.filter((node) => node.type === "button");
    assert.equal(buttons.length, 6);
    assert.equal(
      buttons[0].props["aria-label"],
      locale === "hi" ? "बंद करें" : "Close",
    );
    assert.deepEqual(
      buttons.slice(1).map(text),
      locale === "hi"
        ? [
            "फसल लगाएं",
            "पिछली फसलें",
            "खेत का विवरण",
            "खेत संपादित करें",
            "खेत हटाएं",
          ]
        : [
            "Planting Crops",
            "Historical Crops",
            "Farm Details",
            "Edit Farm",
            "Delete Farm",
          ],
    );
    assert.match(buttons.at(-1).props.className, /text-error-600/);
    assert.doesNotMatch(
      buttons.at(-1).props.className,
      /(?<!hover:)\bbg-error/,
    );
    for (const button of buttons.slice(1, -1))
      assert.match(
        button.props.children[0].props.className,
        /text-success-700/,
      );
    assert.match(
      all.find((node) => node.type === "header").props.className,
      /bg-success-50/,
    );
    assert.match(
      all.find((node) => node.type === "ul").props.className,
      /divide-y/,
    );
  }
});

test("only the custom close action is active; all five menu rows communicate unavailability and perform no operation", () => {
  let closed = 0,
    prevented = 0;
  const before = JSON.stringify(farm);
  const tree = card()({ farm, onClose: () => closed++ });
  const buttons = nodes(tree).filter((node) => node.type === "button");
  // Shared tooltips: the full farm name, then "Coming soon" on each menu row;
  // the first row's tip opens downwards to stay inside the scrolling menu.
  const [name, ...rows] = nodes(tree).filter((node) => node.type === "Tooltip");
  assert.equal(name.props.content, farm.name);
  assert.equal(name.props.as, "div");
  assert.deepEqual(
    rows.map((tip) => tip.props.content),
    Array(5).fill("Coming soon"),
  );
  assert.deepEqual(
    rows.map((tip) => tip.props.side),
    ["bottom", "top", "top", "top", "top"],
  );
  for (const button of buttons.slice(1)) {
    assert.equal(button.props["aria-disabled"], "true");
    assert.ok(button.props["aria-describedby"]);
    assert.equal(button.props.title, undefined);
    button.props.onClick({ preventDefault: () => prevented++ });
  }
  assert.equal(prevented, 5);
  assert.equal(closed, 0);
  buttons[0].props.onClick();
  assert.equal(closed, 1);
  assert.equal(JSON.stringify(farm), before);
});

test("popup keyboard events leave Tab navigation intact and prevent map shortcuts while Escape reaches its close handler", () => {
  const tree = card()({ farm, onClose() {} });
  let stopped = 0;
  for (const key of ["ArrowUp", "Enter", " ", "Tab"])
    tree.props.onKeyDown({ key, stopPropagation: () => stopped++ });
  assert.equal(stopped, 4);
  tree.props.onKeyDown({ key: "Escape", stopPropagation: () => stopped++ });
  assert.equal(stopped, 4);
});

test("real React markup escapes record text, keeps long names clear of Close, and uses an existing local illustration", () => {
  const Card = card("en", require("react"));
  const name =
    '<img src=x onerror="bad()"> ' +
    "Long government-record farm name ".repeat(8);
  const html = renderToStaticMarkup(
    jsx.jsx(Card, { farm: { ...farm, name }, onClose() {} }),
  );
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /data-icon="FarmLandscapeIcon"/);
  assert.match(html, /line-clamp-2/);
  assert.match(html, /min-w-0/);
  assert.match(html, /aria-modal="false"/);
  assert.doesNotMatch(html, /staticmap|maps\.googleapis|<iframe/);
});

test("empty measurements remain unavailable and zero stays a real recorded value", () => {
  const Card = card();
  assert.match(
    text(
      Card({ farm: { ...farm, area: "0", area_unit: "sqm" }, onClose() {} }),
    ),
    /0\.000 Square Metre/,
  );
  assert.match(
    text(Card({ farm: { id: 2, name: "Missing area" }, onClose() {} })),
    /Area unavailable/,
  );
});

const rect = [
  [77, 26],
  [77.02, 26],
  [77.02, 26.02],
  [77, 26.02],
  [77, 26],
];
test("anchors reuse a valid interior point or extent center and keep concave, holed and disjoint farms on their boundary", () => {
  const regular = {
    id: 1,
    name: "A",
    boundary: { type: "MultiPolygon", coordinates: [[rect]] },
    location: null,
  };
  const center = geometry.farmAnchor(regular);
  assert.ok(Math.abs(center.lat - 26.01) < 1e-10);
  assert.ok(Math.abs(center.lng - 77.01) < 1e-10);
  const position = { lat: 26.003, lng: 77.004 };
  assert.equal(
    geometry.farmAnchor({ ...regular, location: position }),
    position,
  );
  const concave = [
    [0, 0],
    [4, 0],
    [4, 1],
    [1, 1],
    [1, 4],
    [0, 4],
    [0, 0],
  ];
  const hole = [
    [77.001, 26.001],
    [77.019, 26.001],
    [77.019, 26.019],
    [77.001, 26.019],
    [77.001, 26.001],
  ];
  for (const boundary of [
    { type: "Polygon", coordinates: [concave] },
    { type: "MultiPolygon", coordinates: [[rect, hole]] },
    {
      type: "MultiPolygon",
      coordinates: [[rect], [rect.map(([lng, lat]) => [lng + 2, lat + 2])]],
    },
  ]) {
    const before = JSON.stringify(boundary);
    const anchor = geometry.farmAnchor({ ...regular, boundary });
    const ring =
      boundary.type === "Polygon"
        ? boundary.coordinates[0]
        : boundary.coordinates[0][0];
    assert.deepEqual(clone(anchor), { lat: ring[0][1], lng: ring[0][0] });
    assert.equal(JSON.stringify(boundary), before);
  }
  assert.deepEqual(
    clone(
      geometry.farmAnchor({
        ...regular,
        boundary: null,
        location: { lat: 0, lng: 0 },
      }),
    ),
    { lat: 0, lng: 0 },
  );
  assert.equal(geometry.farmAnchor({ ...regular, boundary: null }), null);
});

test("popup layout prefers a side, flips near edges and stays clear of the panel, sidebar and map controls", () => {
  const size = { width: 1366, height: 900, sidebarWidth: 300 };
  const right = viewport.farmPopupLayout({ x: 700, y: 270 }, size, 350, 344);
  assert.equal(right.side, "right");
  assert.equal(right.x, 712);
  assert.ok(right.y + right.height <= 550 - 16);
  const left = viewport.farmPopupLayout({ x: 1200, y: 270 }, size, 350, 344);
  assert.equal(left.side, "left");
  assert.ok(left.x >= 316);
  const mobile = viewport.farmPopupLayout(
    { x: 180, y: 200 },
    { width: 375, height: 800, sidebarWidth: 0 },
    350,
    344,
    true,
  );
  assert.equal(mobile.side, "above");
  assert.ok(mobile.width < 320);
  assert.ok(mobile.y >= 80);
  assert.ok(mobile.y + mobile.height < 450);
  assert.ok(mobile.pan.y < 0);
  assert.equal(
    viewport.farmPopupLayout({ x: 180, y: 50 }, size, 850, 344),
    null,
  );
  assert.equal(
    viewport.farmPopupLayout(
      { x: 180, y: 100 },
      { ...size, width: 375 },
      350,
      344,
    ),
    null,
  );
  const rtl = viewport.farmPopupLayout(
    { x: 500, y: 200 },
    { ...size, rtl: true },
    350,
    344,
  );
  assert.ok(rtl.x + rtl.width <= 1366 - 316);
});

function hooks() {
  const slots = [];
  let cursor = 0,
    effects = [];
  return {
    react: {
      useState(initial) {
        const i = cursor++;
        slots[i] ??= {
          value: typeof initial === "function" ? initial() : initial,
        };
        return [
          slots[i].value,
          (next) => {
            slots[i].value =
              typeof next === "function" ? next(slots[i].value) : next;
          },
        ];
      },
      useRef(initial) {
        return (slots[cursor++] ??= { current: initial });
      },
      useEffect(fn, deps) {
        const i = cursor++,
          old = slots[i];
        if (!old || deps.some((value, n) => value !== old.deps[n]))
          effects.push(() => {
            old?.cleanup?.();
            slots[i] = { deps, fn, cleanup: fn() };
          });
      },
    },
    render(Component, props) {
      cursor = 0;
      const tree = Component(props);
      effects.splice(0).forEach((fn) => fn());
      return tree;
    },
    cleanup() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
    replay() {
      slots.forEach((slot) => {
        if (slot?.fn) {
          slot.cleanup?.();
          slot.cleanup = slot.fn();
        }
      });
    },
  };
}

function overlayHarness() {
  const runtime = hooks(),
    overlays = [],
    events = {},
    observers = [],
    pans = [];
  const point = { x: 700, y: 280 };
  class Element {
    constructor() {
      this.style = {};
      this.children = [];
      this.hidden = false;
      this.isConnected = true;
    }
    setAttribute() {}
    append(...children) {
      children.forEach((child) => this.appendChild(child));
    }
    appendChild(child) {
      this.children.push(child);
      child.parent = this;
    }
    remove() {
      if (this.parent)
        this.parent.children = this.parent.children.filter(
          (child) => child !== this,
        );
      this.isConnected = false;
    }
    contains(node) {
      return (
        node === this || node === this.card || this.children.includes(node)
      );
    }
    querySelector(query) {
      return query === "[data-farm-info-card]" ? this.card : null;
    }
    closest() {
      return this.editable ? this : null;
    }
    focus() {
      document.activeElement = this;
      this.focused = true;
    }
  }
  const pane = new Element(),
    priorFocus = new Element();
  const document = {
    documentElement: { dir: "ltr" },
    activeElement: priorFocus,
    modal: false,
    createElement: () => new Element(),
    querySelector: () => (document.modal ? {} : null),
  };
  const window = {
    addEventListener: (name, fn) => {
      (events[name] ??= new Set()).add(fn);
    },
    removeEventListener: (name, fn) => events[name]?.delete(fn),
  };
  class Overlay {
    constructor() {
      overlays.push(this);
    }
    getPanes() {
      return { floatPane: pane };
    }
    getProjection() {
      return {
        fromLatLngToContainerPixel: () => ({ ...point }),
        fromLatLngToDivPixel: () => ({ x: point.x + 1000, y: point.y + 1000 }),
      };
    }
    setMap(map) {
      if (map === this.map) return;
      if (this.map) this.onRemove();
      this.map = map;
      if (map) {
        this.onAdd();
        this.draw();
      }
    }
    static preventMapHitsAndGesturesFrom(element) {
      element.protected = true;
    }
  }
  let cleared = 0;
  const sdk = {
    OverlayView: Overlay,
    event: { clearInstanceListeners: () => cleared++ },
  };
  const map = {
    panBy(x, y) {
      pans.push({ x, y });
      point.x -= x;
      point.y -= y;
      overlays.at(-1).draw();
    },
  };
  const props = {
    sdk,
    map,
    farm,
    anchor: { lat: 26, lng: 77 },
    open: true,
    blocked: false,
    request: 0,
    viewport: { width: 1366, height: 900, sidebarWidth: 0 },
    panelHeight: 350,
    onClose: () => {
      props.open = false;
    },
  };
  const Component = load(
    maps + "FarmInfoOverlay.tsx",
    {
      react: runtime.react,
      "react-dom": {
        createPortal(node, host) {
          host.card ??= new Element();
          host.card.querySelector = (query) =>
            query.includes("header")
              ? { offsetHeight: 76 }
              : { scrollHeight: 256 };
          return { type: "portal", props: { children: node, host } };
        },
      },
      "./FarmInfoWindow": "Card",
      [viewAlias]: viewport,
    },
    {
      document,
      window,
      ResizeObserver: class {
        constructor(callback) {
          this.callback = callback;
          observers.push(this);
        }
        observe(target) {
          this.target = target;
          this.active = true;
        }
        disconnect() {
          this.active = false;
        }
      },
    },
  ).default;
  const render = () => {
    runtime.render(Component, props);
    return runtime.render(Component, props);
  };
  return {
    render,
    props,
    pane,
    overlays,
    point,
    events,
    observers,
    pans,
    document,
    priorFocus,
    runtime,
    get cleared() {
      return cleared;
    },
  };
}

test("one overlay updates selected content and projection during navigation without extra instances or automatic pan loops", () => {
  const h = overlayHarness();
  let tree = h.render();
  assert.equal(h.overlays.length, 1);
  assert.equal(h.pane.children.length, 1);
  const host = tree.props.host;
  assert.equal(host.protected, true);
  assert.match(host.className, /pointer-events-auto/);
  assert.equal(host.style.left, "1700px");
  h.point.x = 650;
  h.point.y = 250;
  h.overlays[0].draw();
  assert.equal(host.style.left, "1650px");
  h.props.farm = { ...farm, id: 9, name: "Next Farm" };
  h.props.anchor = { lat: 27, lng: 78 };
  tree = h.render();
  assert.equal(tree.props.children.props.farm.name, "Next Farm");
  assert.equal(h.overlays.length, 1);
  assert.equal(h.pans.length, 0);
  h.runtime.cleanup();
  assert.equal(h.pane.children.length, 0);
  assert.equal(
    h.observers.some((observer) => observer.active),
    false,
  );
  assert.equal(h.events.keydown.size, 0);
  assert.equal(h.cleared, 1);
});

test("Close detaches the popup, restores its previous focus, and reopening reuses the same overlay", () => {
  const h = overlayHarness();
  const tree = h.render();
  h.document.activeElement = tree.props.host.card;
  tree.props.children.props.onClose();
  h.render();
  assert.equal(h.pane.children.length, 0);
  assert.equal(h.priorFocus.focused, true);
  h.props.open = true;
  h.props.request++;
  h.render();
  assert.equal(h.overlays.length, 1);
  assert.equal(h.pane.children.length, 1);
  h.props.blocked = true;
  h.render();
  assert.equal(
    h.pane.children.length,
    0,
    "draft/fullscreen editor owns the viewport",
  );
  h.props.blocked = false;
  h.render();
  assert.equal(h.pane.children.length, 1);
  h.runtime.cleanup();
});

test("limited map space hides and restores the popup; explicit selection allows only a minimal reveal pan", () => {
  const h = overlayHarness();
  h.props.viewport = { width: 375, height: 800, sidebarWidth: 0 };
  h.point.x = 180;
  h.point.y = 200;
  h.props.request = 1;
  let tree = h.render();
  assert.equal(h.pans.length, 1);
  h.render();
  h.render();
  h.observers
    .filter((observer) => observer.active)
    .forEach((observer) => observer.callback());
  assert.equal(h.pans.length, 1);
  h.props.panelHeight = 750;
  tree = h.render();
  assert.equal(tree.props.host.hidden, true);
  h.props.panelHeight = 350;
  tree = h.render();
  assert.equal(tree.props.host.hidden, false);
  h.runtime.cleanup();
});

test("Escape closes only an available nonmodal popup and leaves modal/editor and editable-input keyboard behavior intact", () => {
  const h = overlayHarness();
  h.render();
  const escape = () =>
    [...h.events.keydown].forEach((fn) =>
      fn({
        key: "Escape",
        target: h.document.activeElement,
        preventDefault() {},
      }),
    );
  h.document.modal = true;
  escape();
  assert.equal(h.props.open, true);
  h.document.modal = false;
  h.document.activeElement = { closest: () => ({}) };
  escape();
  assert.equal(h.props.open, true);
  h.document.activeElement = h.priorFocus;
  escape();
  assert.equal(h.props.open, false);
  h.render();
  assert.equal(h.events.keydown.size, 0);
  h.runtime.cleanup();
});

test("Strict Mode and account/map teardown leave one active overlay host and clean up every observer/listener", () => {
  const h = overlayHarness();
  h.render();
  h.runtime.replay();
  h.render();
  assert.equal(h.pane.children.length, 1);
  assert.equal(h.overlays.filter((overlay) => overlay.map).length, 1);
  assert.equal(h.events.keydown.size, 1);
  h.props.farm = null;
  h.props.anchor = null;
  h.props.open = false;
  h.render();
  assert.equal(h.pane.children.length, 0);
  assert.equal(h.events.keydown.size, 0);
  h.runtime.cleanup();
});
