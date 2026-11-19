const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { createTranslator } = require("next-intl");
const base = "src/app/[locale]/(account)/account/(protected)/";
const feature = base + "crops/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setImmediate(resolve));
function load(path, deps = {}, globals = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
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
    FormData,
    structuredClone,
    crypto: require("node:crypto").webcrypto,
    setTimeout,
    clearTimeout,
    ...globals,
    require: (name) =>
      name === "react/jsx-runtime"
        ? jsx
        : Object.hasOwn(deps, name)
          ? deps[name]
          : (() => {
              throw Error(`Unexpected dependency ${name} in ${path}`);
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
    startTransition: (fn) => fn(),
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
    useRef(initial) {
      return (slots[cursor++] ??= { current: initial });
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps))
        queue.push(() => {
          slots[i]?.cleanup?.();
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
  };
  return {
    react,
    render(fn, props) {
      cursor = 0;
      const tree = fn(props);
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
  return !tree || typeof tree !== "object"
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];
}
const geometry = load(base + "_components/farmGeometry.ts");

function formHarness() {
  let values;
  const rules = {};
  const errors = {};
  const setValue = (name, value) => {
    values[name] = value;
  };
  const form = {
    useForm({ defaultValues }) {
      values ??= structuredClone(defaultValues);
      return {
        control: { values },
        register(name, rule = {}) {
          rules[name] = rule;
          return { name };
        },
        setValue,
        setError(name, error) {
          errors[name] = error;
        },
        handleSubmit: (callback) => () => callback(values),
        formState: { errors, isDirty: false },
      };
    },
    useWatch: ({ control, name }) =>
      name ? control.values[name] : control.values,
    Controller: "Controller",
  };
  return {
    form,
    rules,
    errors,
    get values() {
      return values;
    },
  };
}
function formDeps(runtime, form) {
  return {
    react: runtime.react,
    "react-hook-form": form.form,
    "next-intl": {
      useTranslations: () => (key, params) =>
        params ? `${key}:${JSON.stringify(params)}` : key,
      useLocale: () => "en",
    },
    "@/components/admin/form/input/InputField": "Input",
    "@/components/common/SeasonIcon": "SeasonIcon",
    "@/lib/seasons/presentation": {
      formatSeasonPeriod: (start, end) =>
        start === 10 && end === 3
          ? "Oct – Mar"
          : start === 6 && end === 10
            ? "Jun – Oct"
            : start === 3 && end === 6
              ? "Mar – Jun"
              : null,
    },
    "@/icons": new Proxy({}, { get: (_, name) => name }),
    "./CropUi": {
      ...Object.fromEntries(
        [
          "CropChoice",
          "CropField",
          "CropImage",
          "CropMoney",
          "CropNotice",
          "CropSection",
          "CropSummaryStrip",
        ].map((name) => [name, name]),
      ),
      cropControl: "control",
      cropFieldErrors: (result, setError) => {
        for (const [name, messages] of Object.entries(result.errors ?? {}))
          setError(name, { message: messages.join(" ") });
      },
    },
    "./ProductSelectionDialog": "Products",
    "./SeasonSelectionDialog": "Seasons",
    "@/components/common/maps/BoundaryConfirmDialog": "Confirm",
  };
}

test("crop catalogue dialog keeps search and category filters with a fixed 12-item page", () => {
  const runtime = hooks();
  const requests = [];
  const Component = load(
    feature + "ProductSelectionDialog.tsx",
    {
      react: runtime.react,
      "@headlessui/react": {
        Dialog: "Dialog",
        DialogBackdrop: "DialogBackdrop",
        DialogPanel: "DialogPanel",
        DialogTitle: "DialogTitle",
        Description: "Description",
      },
      "next-intl": {
        useTranslations: () => (key, params) =>
          params ? `${key}:${JSON.stringify(params)}` : key,
      },
      "@/actions/account/farm-crops": {
        getCropOptions: async () => ({ success: true, data: [] }),
        getCropCatalog: async (kind, params) => {
          requests.push({ kind, params });
          return {
            success: true,
            data: {
              data: [],
              pagination: { current_page: 1, last_page: 1, total: 0 },
            },
          };
        },
      },
      "@/icons": { CloseLineIcon: "CloseLineIcon", SearchIcon: "SearchIcon" },
      "./CropUi": {
        CropChoice: "CropChoice",
        CropImage: "CropImage",
        CropNotice: "CropNotice",
        cropButton: "button",
        cropControl: "control",
        cropPrimary: "primary",
      },
    },
    { setTimeout: (callback) => (callback(), 1), clearTimeout: () => {} },
  ).default;
  const tree = runtime.render(Component, {
    kind: "crops",
    initial: [],
    onClose: () => {},
    onConfirm: () => {},
  });
  assert.deepEqual(clone(requests), [
    {
      kind: "crops",
      params: { search: "", page: 1, per_page: 12 },
    },
  ]);
  assert.equal(nodes(tree).filter((node) => node.type === "select").length, 0);
  assert.equal(
    nodes(tree).some(
      (node) =>
        node.type === "input" && node.props["aria-label"] === "catalogSearch",
    ),
    true,
  );
  assert.equal(
    nodes(tree).some((node) => node.type === "aside"),
    true,
  );
  runtime.cleanup();
});

test("selection renders backend season presentation and hides Other when only three seasons exist", async () => {
  const runtime = hooks(),
    form = formHarness(),
    requests = [];
  const Component = load(feature + "CropSelectionStep.tsx", {
    ...formDeps(runtime, form),
    "../../_components/AccountFarmContext": {
      useAccountFarms: () => ({
        farms: [
          {
            id: 8,
            name: "My farm",
            is_active: true,
            area: "2.0",
            area_unit: "acre",
          },
        ],
      }),
    },
    "@/hooks/useAreaUnits": () => ({ label: (unit) => unit }),
    "@/lib/areaUnits": { formatArea: (value) => value },
    "@/actions/account/farm-crops": {
      getCropOptions: async (kind) => ({
        success: true,
        data:
          kind === "seasons"
            ? [
                {
                  id: 1,
                  slug: "rabi",
                  name: "Rabi",
                  icon: "sprout",
                  start_month: 10,
                  end_month: 3,
                },
                {
                  id: 2,
                  slug: "kharif",
                  name: "Kharif",
                  icon: "sun",
                  start_month: 6,
                  end_month: 10,
                },
                {
                  id: 3,
                  slug: "zaid",
                  name: "Zaid",
                  icon: "leaf",
                  start_month: 3,
                  end_month: 6,
                },
              ]
            : [],
      }),
      getCropCatalog: async (kind, params) => {
        requests.push({ kind, params });
        return {
          success: true,
          data: {
            data: [
              {
                id: 7,
                name: "Wheat",
                image: "https://example.com/wheat.jpg",
              },
            ],
          },
        };
      },
    },
  }).default;
  const props = {
    crop: null,
    farmId: 8,
    onDirty() {},
    onSave: async () => ({ success: true }),
  };
  runtime.render(Component, props);
  await tick();
  const tree = runtime.render(Component, props);
  assert.equal(form.values.farm_id, 8);
  assert.equal(form.values.crop_variety_id, null);
  assert.equal(form.rules.crop_variety_id.validate(null), true);
  assert.deepEqual(clone(requests[0]), {
    kind: "crops",
    params: { is_recommendate: true, per_page: 5 },
  });
  const cropPreview = (currentTree) =>
    nodes(currentTree).find(
      (node) =>
        node.type === "CropImage" &&
        node.props.className === "h-full w-full object-cover",
    );
  assert.equal(cropPreview(tree).props.src, "/images/farm/default-crop.png");
  const cropSelector = nodes(tree).find(
    (node) => node.type === "Controller" && node.props.name === "crop_id",
  );
  nodes(cropSelector.props.render())
    .find((node) => node.type === "CropChoice")
    .props.onClick();
  const selectedTree = runtime.render(Component, props);
  assert.equal(
    cropPreview(selectedTree).props.src,
    "https://example.com/wheat.jpg",
  );
  const selector = nodes(tree).find(
    (node) => node.type === "Controller" && node.props.name === "season_id",
  );
  const seasonCards = nodes(
    selector.props.render({ field: { value: 1, onChange() {} } }),
  ).filter((node) => node.type === "CropChoice");
  assert.equal(seasonCards.length, 3);
  assert.deepEqual(
    seasonCards
      .slice(0, 3)
      .map(
        (card) =>
          nodes(card).find((node) => node.type === "SeasonIcon").props.icon,
      ),
    ["sprout", "sun", "leaf"],
  );
  assert.match(JSON.stringify(seasonCards[0]), /Oct – Mar/);
  assert.match(JSON.stringify(seasonCards[1]), /Jun – Oct/);
  assert.match(JSON.stringify(seasonCards[2]), /Mar – Jun/);
  assert.ok(
    !seasonCards.some((card) =>
      nodes(card).some((node) => node.type === "HorizontaLDots"),
    ),
  );
  const methodSelector = nodes(tree).find(
    (node) => node.type === "Controller" && node.props.name === "sowing_method",
  );
  const methodCards = nodes(
    methodSelector.props.render({
      field: { value: "broadcasting", onChange() {} },
    }),
  ).filter((node) => node.type === "CropChoice");
  assert.deepEqual(
    methodCards.map(
      (card) =>
        nodes(card).find((node) =>
          [
            "BroadcastIcon",
            "LineSowingIcon",
            "TransplantingIcon",
            "DrillingIcon",
            "DibblingIcon",
          ].includes(node.type),
        ).type,
    ),
    [
      "BroadcastIcon",
      "LineSowingIcon",
      "TransplantingIcon",
      "DrillingIcon",
      "DibblingIcon",
    ],
  );
  assert.equal(methodCards[0].props.selected, true);
  assert.match(methodCards[0].props.className, /items-center/);
  runtime.cleanup();
});
test("seed cards disable incompatible varieties and default the date from the local calendar without UTC conversion", async () => {
  const runtime = hooks(),
    form = formHarness();
  const deps = formDeps(runtime, form);
  class LocalDate {
    getFullYear() {
      return 2026;
    }
    getMonth() {
      return 10;
    }
    getDate() {
      return 16;
    }
    toISOString() {
      throw Error("UTC conversion must not be used");
    }
  }
  const products = [
    { id: 1, crop_variety_id: null, name: "General" },
    { id: 2, crop_variety_id: 9, name: "Different variety" },
  ];
  const Component = load(
    feature + "SeedSowingStep.tsx",
    {
      ...deps,
      "@/actions/account/farm-crops": {
        getCropCatalog: async () => ({
          success: true,
          data: { data: products },
        }),
        getCropOptions: async () => ({ success: true, data: [] }),
        getCropSeedRecommendation: async () => ({ success: true, data: null }),
      },
    },
    { Date: LocalDate },
  ).default;
  const props = {
    crop: {
      id: 4,
      crop: { id: 3 },
      farm: { id: 8 },
      crop_variety: null,
      seed_sowing_details: {
        seed: null,
        seed_source: null,
        seed_quantity: null,
        seed_quantity_unit: null,
      },
      sowing_date: null,
    },
    onDirty() {},
    onSave: async () => ({ success: true }),
  };
  runtime.render(Component, props);
  await tick();
  let tree = runtime.render(Component, props);
  assert.equal(form.values.sowing_date, "2026-11-16");
  const chooser = nodes(tree).find(
    (n) => n.type === "Controller" && n.props.name === "seed_id",
  );
  const cards = nodes(chooser.props.render()).filter(
    (n) => n.type === "CropChoice",
  );
  assert.equal(cards[0].props.disabled, false);
  assert.equal(cards[1].props.disabled, true);
  nodes(chooser.props.render())
    .find((n) => n.type === "button")
    .props.onClick();
  tree = runtime.render(Component, props);
  assert.equal(
    nodes(tree).find((n) => n.type === "Products").props.compatibleVarietyId,
    null,
  );
  runtime.cleanup();
});
test("soil report validation rejects empty, oversized and mismatched files while preserving a saved private report", () => {
  const runtime = hooks(),
    form = formHarness();
  const Component = load(
    feature + "SoilAssessmentStep.tsx",
    formDeps(runtime, form),
  ).default;
  runtime.render(Component, {
    crop: {
      soil_assessment: {
        assessment_mode: "soil_test",
        soil_test: { report_available: true, test_date: "2026-11-16" },
        estimated_soil_test_cost: null,
      },
    },
    onDirty() {},
    onSave: async () => ({ success: true }),
  });
  const validate = form.rules.report.validate;
  assert.equal(
    validate([{ name: "soil.pdf", type: "application/pdf", size: 1024 }]),
    true,
  );
  for (const file of [
    { name: "soil.pdf", type: "application/pdf", size: 0 },
    { name: "soil.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 },
    { name: "soil.exe", type: "application/pdf", size: 10 },
    { name: "soil.png", type: "application/octet-stream", size: 10 },
  ])
    assert.notEqual(validate([file]), true);
  assert.equal(form.values.remove_report, false);
  assert.equal(form.values.estimated_cost, "");
  assert.equal(form.rules.test_date.required, "required");
  runtime.cleanup();
});

test("editing a different parcel or interior ring preserves every other crop ring and the parent farm", async () => {
  const runtime = hooks(),
    form = formHarness();
  const shape = box(1, 1, 3, 3);
  shape.coordinates[0].push(
    [...box(1.5, 1.5, 2, 2).coordinates[0][0]].reverse(),
  );
  shape.coordinates.push(box(5, 5, 6, 6).coordinates[0]);
  const original = JSON.stringify(shape);
  const session = {
    boundary: box(1, 1, 3, 3),
    points: geometry.boundaryPoints(box(1, 1, 3, 3)),
    source: "manual",
    mode: "manual",
    phase: "confirmed",
    active: false,
    accuracy: null,
    area: 1,
    loadBoundary(draft) {
      this.boundary = geometry.pointsToBoundary(
        geometry.boundaryPoints(draft.boundary),
      );
      this.points = geometry.boundaryPoints(draft.boundary);
    },
  };
  const farmBoundary = box(0, 0, 10, 10);
  const beforeFarm = JSON.stringify(farmBoundary);
  const farm = { id: 8, name: "Farm", area_unit: "acre" };
  const stats = { value: "10", unit: "acre", square_metres: "1000000" };
  const occupancy = {
    farm,
    farm_boundary: farmBoundary,
    existing_active_crops: [],
    recorded_farm_area: stats,
    measured_farm_area: stats,
    existing_crop_area: { ...stats, value: "0", square_metres: "0" },
    remaining_area: stats,
    can_use_full_farm_boundary: true,
  };
  const Component = load(feature + "CropBoundaryStep.tsx", {
    ...formDeps(runtime, form),
    "@/hooks/useFarmBoundary": () => session,
    "@/hooks/useAreaUnits": () => ({ config: {}, label: (unit) => unit }),
    "@/lib/areaUnits": {
      fromSquareMeters: (value) => (value === null ? null : Number(value)),
      formatArea: (value) => value,
      isSupportedAreaUnit: () => true,
    },
    "@/actions/account/farm-crops": {
      getCropOccupancy: async () => ({ success: true, data: occupancy }),
    },
    "@/components/common/maps/FarmBoundaryEditor": "Editor",
    "@/components/common/AreaUnitSelect": "AreaUnit",
    "@/components/common/maps/farmMapStyle": { farmMapColor: () => "green" },
    "../../_components/farmGeometry": geometry,
  }).default;
  const saves = [];
  const props = {
    crop: {
      id: 4,
      farm,
      boundary_source: "manual",
      cultivated_area: "1",
      area_unit: "acre",
      boundary_details: { boundary: shape, gps_accuracy_m: null },
      calculated_area_sqm: "100",
    },
    onDirty() {},
    onValidity() {},
    onSave: async (step, values) => {
      saves.push({ step, values });
      return { success: true };
    },
  };
  runtime.render(Component, props);
  await tick();
  let tree = runtime.render(Component, props);
  nodes(tree)
    .find((n) => n.type === "select" && n.props.id === "crop-boundary-part")
    .props.onChange({ target: { value: "1:0" } });
  session.boundary = box(5, 5, 7, 7);
  session.points = geometry.boundaryPoints(session.boundary);
  tree = runtime.render(Component, props);
  await tree.props.onSubmit();
  assert.equal(saves[0].step, 2);
  assert.deepEqual(
    clone(saves[0].values.boundary.coordinates[0]),
    shape.coordinates[0],
  );
  assert.deepEqual(
    clone(saves[0].values.boundary.coordinates[1]),
    box(5, 5, 7, 7).coordinates[0],
  );
  nodes(tree)
    .find((n) => n.type === "select" && n.props.id === "crop-boundary-part")
    .props.onChange({ target: { value: "0:1" } });
  session.boundary = box(1.6, 1.6, 2.1, 2.1);
  session.points = geometry.boundaryPoints(session.boundary);
  tree = runtime.render(Component, props);
  await tree.props.onSubmit();
  assert.deepEqual(
    clone(saves[1].values.boundary.coordinates[0][0]),
    shape.coordinates[0][0],
  );
  assert.deepEqual(
    clone(saves[1].values.boundary.coordinates[0][1]),
    [...box(1.6, 1.6, 2.1, 2.1).coordinates[0][0]].reverse(),
  );
  assert.equal(JSON.stringify(shape), original);
  assert.equal(JSON.stringify(farmBoundary), beforeFarm);
  runtime.cleanup();
});
const box = (x1, y1, x2, y2) => ({
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1],
      ],
    ],
  ],
});

function boundaryStepHarness({ crop = {}, overview = {}, response } = {}) {
  const runtime = hooks(),
    form = formHarness();
  const area = require("./helpers/areaUnits.cjs");
  const farmBoundary = box(75, 26, 75.001, 26.001);
  const farm = { id: 8, name: "Farm", area_unit: "acre" };
  const sqm = geometry.boundaryArea(geometry.boundaryPoints(farmBoundary));
  const stats = { value: "2.7", unit: "acre", square_metres: String(sqm) };
  const occupancy = {
    farm,
    farm_boundary: farmBoundary,
    existing_active_crops: [],
    measured_farm_area: stats,
    recorded_farm_area: { ...stats, value: "9" },
    remaining_area: stats,
    existing_crop_area: { ...stats, square_metres: "0" },
    can_use_full_farm_boundary: true,
    ...overview,
  };
  const requests = [],
    saves = [],
    validities = [],
    watches = [],
    cleared = [];
  let saveResult = { success: true },
    occupancyResponse = response;
  const useBoundary = load(
    "src/hooks/useFarmBoundary.ts",
    {
      react: runtime.react,
      "@/lib/areaUnits": area.utils,
      ["@/" + base.slice(4) + "_components/farmGeometry"]: geometry,
    },
    {
      document: { addEventListener() {}, removeEventListener() {} },
      window: { isSecureContext: true },
      navigator: {
        geolocation: {
          watchPosition(success, error) {
            watches.push({ success, error });
            return watches.length;
          },
          clearWatch(id) {
            cleared.push(id);
          },
        },
      },
      setInterval() {
        return 1;
      },
      clearInterval() {},
    },
  ).default;
  const Component = load(feature + "CropBoundaryStep.tsx", {
    ...formDeps(runtime, form),
    ...area.dependencies,
    "@/hooks/useFarmBoundary": useBoundary,
    "@/actions/account/farm-crops": {
      getCropOccupancy: async (...args) => {
        requests.push(args);
        return occupancyResponse ?? { success: true, data: occupancy };
      },
    },
    "@/components/common/maps/FarmBoundaryEditor": "Editor",
    "@/components/common/maps/farmMapStyle": { farmMapColor: () => "green" },
    "../../_components/farmGeometry": geometry,
  });
  const props = {
    crop: {
      id: 4,
      farm,
      boundary_source: null,
      area_unit: "acre",
      cultivated_area: null,
      calculated_area_sqm: null,
      boundary_details: { boundary: null, gps_accuracy_m: null },
      ...crop,
    },
    busy: false,
    onDirty() {},
    onValidity: (valid) => validities.push(valid),
    onSave: async (step, values) => {
      saves.push({ step, values: clone(values) });
      return saveResult;
    },
  };
  let tree;
  const render = () => (tree = runtime.render(Component.default, props));
  return {
    runtime,
    props,
    form,
    occupancy,
    requests,
    saves,
    watches,
    cleared,
    render,
    get valid() {
      return validities.at(-1);
    },
    get editor() {
      return nodes(render()).find((n) => n.type === "Editor").props;
    },
    get confirm() {
      return nodes(render()).find((n) => n.type === "Confirm").props;
    },
    button(label) {
      return nodes(render()).find(
        (n) => n.type === "button" && n.props.children === label,
      ).props;
    },
    submit: () => render().props.onSubmit(),
    setSaveResult(result) {
      saveResult = result;
    },
    setOccupancyResponse(result) {
      occupancyResponse = result;
    },
    async mount() {
      render();
      await tick();
      return render();
    },
  };
}

test("available farm initializes one independent full-farm crop, measured area and a ready form without confirmation", async () => {
  const h = boundaryStepHarness();
  await h.mount();
  const editor = h.editor;
  assert.deepEqual(clone(editor.displayGeometry), h.occupancy.farm_boundary);
  assert.notEqual(editor.displayGeometry, h.occupancy.farm_boundary);
  assert.notEqual(
    editor.displayGeometry.coordinates[0][0][0],
    h.occupancy.farm_boundary.coordinates[0][0][0],
  );
  assert.equal(editor.session.phase, "confirmed");
  assert.equal(editor.session.points.length, 4);
  assert.equal(
    editor.session.area,
    Number(h.occupancy.measured_farm_area.square_metres),
  );
  assert.equal(editor.boundaryStatus, "usingCompleteFarmBoundary");
  assert.equal(h.valid, true);
  assert.deepEqual(clone(h.form.values.boundary), h.occupancy.farm_boundary);
  for (let i = 0; i < 4; i++)
    assert.equal(h.editor.displayGeometry, editor.displayGeometry);
  assert.deepEqual(h.requests, [[8, 4]]);
  await h.submit();
  assert.equal(h.saves[0].step, 2);
  assert.equal(h.saves[0].values.boundary_source, "farm_boundary");
  assert.deepEqual(h.saves[0].values.boundary, h.occupancy.farm_boundary);
  h.runtime.cleanup();
});

test("default MultiPolygon editing retains other parcels and holes without changing any farm coordinates", async () => {
  const boundary = box(75, 26, 75.001, 26.001);
  boundary.coordinates[0].push(
    [...box(75.0002, 26.0002, 75.0003, 26.0003).coordinates[0][0]].reverse(),
  );
  boundary.coordinates.push(box(75.002, 26, 75.003, 26.001).coordinates[0]);
  const before = clone(boundary);
  const h = boundaryStepHarness({ overview: { farm_boundary: boundary } });
  await h.mount();
  assert.deepEqual(clone(h.editor.displayGeometry), before);
  h.editor.session.edit();
  nodes(h.render())
    .find((n) => n.props.id === "crop-boundary-part" && n.type === "select")
    .props.onChange({ target: { value: "1:0" } });
  h.editor.session.edit();
  const changed = box(75.0021, 26.0001, 75.0028, 26.0008);
  h.editor.session.update(geometry.boundaryPoints(changed));
  h.editor.session.confirm();
  await h.submit();
  assert.deepEqual(
    h.saves[0].values.boundary.coordinates[0],
    before.coordinates[0],
  );
  assert.deepEqual(
    h.saves[0].values.boundary.coordinates[1],
    changed.coordinates[0],
  );
  assert.deepEqual(boundary, before);
  h.runtime.cleanup();
});

test("editing the copied boundary updates only the crop, recalculates its area and requires custom confirmation", async () => {
  const h = boundaryStepHarness();
  await h.mount();
  const before = clone(h.occupancy.farm_boundary),
    oldArea = h.editor.session.area;
  h.editor.session.edit();
  assert.equal(h.form.values.boundary_source, "manual");
  assert.equal(h.editor.session.phase, "editing");
  const smaller = box(75.0001, 26.0001, 75.0008, 26.0008);
  h.editor.session.update(geometry.boundaryPoints(smaller));
  assert.equal(h.valid, false);
  assert.ok(h.editor.session.area < oldArea);
  assert.deepEqual(clone(h.editor.displayGeometry), smaller);
  await h.submit();
  assert.equal(h.saves.length, 0);
  assert.equal(h.form.errors.boundary.message, "confirmBoundary");
  assert.equal(h.editor.session.confirm(), true);
  assert.equal(h.editor.session.phase, "confirmed");
  await h.submit();
  assert.equal(h.saves[0].values.boundary_source, "manual");
  assert.deepEqual(h.saves[0].values.boundary, smaller);
  assert.deepEqual(h.occupancy.farm_boundary, before);
  h.runtime.cleanup();
});

test("clear and redraw never recreate the default or remove reference layers; Use Farm Boundary restores an independent ready selection", async () => {
  const h = boundaryStepHarness();
  await h.mount();
  const refs = h.editor.referenceLayers;
  h.editor.session.clear();
  assert.equal(h.editor.displayGeometry, null);
  assert.equal(h.editor.referenceLayers, refs);
  assert.equal(h.form.values.boundary_source, "manual");
  assert.equal(h.valid, false);
  assert.equal(h.editor.displayGeometry, null);
  h.editor.session.draw();
  for (const point of geometry.boundaryPoints(
    box(75.0001, 26.0001, 75.0008, 26.0008),
  ))
    h.editor.session.add(point);
  assert.equal(h.editor.session.phase, "drawing");
  assert.ok(h.editor.session.area > 0);
  assert.equal(h.valid, false);
  h.button("useFarmBoundary").onClick();
  h.confirm.onClose();
  assert.equal(h.form.values.boundary_source, "manual");
  h.button("useFarmBoundary").onClick();
  h.confirm.onConfirm();
  assert.equal(h.editor.session.phase, "confirmed");
  assert.equal(h.form.values.boundary_source, "farm_boundary");
  assert.equal(h.valid, true);
  assert.notEqual(h.editor.displayGeometry, h.occupancy.farm_boundary);
  h.runtime.cleanup();
});

test("occupied farms keep read-only layers, disable full-farm selection and reject overlapping or outside custom geometry", async () => {
  const occupied = box(75, 26, 75.0005, 26.001);
  const h = boundaryStepHarness({
    overview: {
      can_use_full_farm_boundary: false,
      existing_active_crops: [
        {
          id: 99,
          boundary: occupied,
          crop_name: "Wheat",
          crop_color: "gold",
          cultivated_area: "1",
          area_unit: "acre",
        },
      ],
    },
  });
  await h.mount();
  assert.equal(h.form.values.boundary_source, "manual");
  assert.equal(h.editor.displayGeometry, null);
  assert.equal(h.button("useFarmBoundary").disabled, true);
  assert.deepEqual(
    clone(h.editor.referenceLayers.map((r) => [r.id, r.zIndex])),
    [
      ["farm", 1],
      ["crop-99", 2],
    ],
  );
  for (const [shape, error] of [
    [occupied, "overlap"],
    [box(75.002, 26, 75.003, 26.001), "outsideFarm"],
  ]) {
    h.editor.session.draw();
    for (const point of geometry.boundaryPoints(shape))
      h.editor.session.add(point);
    h.editor.session.confirm();
    await h.submit();
    assert.equal(h.saves.length, 0);
    assert.equal(h.form.errors.boundary.message, error);
  }
  h.editor.session.draw();
  for (const point of geometry.boundaryPoints(box(75.0005, 26, 75.001, 26.001)))
    h.editor.session.add(point);
  h.editor.session.confirm();
  await h.submit();
  assert.equal(h.saves.length, 1, "shared occupied edge remains allowed");
  h.editor.session.clear();
  assert.equal(h.editor.referenceLayers.length, 2);
  h.runtime.cleanup();
});

test("saved farm, manual and GPS boundaries survive resume and occupancy reload without being replaced", async () => {
  for (const source of ["farm_boundary", "manual", "gps"]) {
    const boundary = box(75.0001, 26.0001, 75.0008, 26.0008);
    const h = boundaryStepHarness({
      crop: {
        boundary_source: source,
        boundary_details: { boundary, gps_accuracy_m: "8" },
        calculated_area_sqm: "5000",
      },
    });
    await h.mount();
    assert.deepEqual(clone(h.editor.displayGeometry), boundary);
    assert.equal(h.editor.boundaryStatus, undefined);
    assert.equal(h.requests.length, 1);
    h.setSaveResult({
      success: false,
      conflict: true,
      errors: { boundary: ["Check allocation"] },
    });
    await h.submit();
    await tick();
    assert.deepEqual(clone(h.editor.displayGeometry), boundary);
    assert.equal(h.form.errors.boundary.message, "Check allocation");
    assert.equal(h.requests.length, 2);
    h.runtime.cleanup();
  }
});

test("occupancy failures block default selection and saving until retry, and unmapped farms retain manual-area fallback", async () => {
  const h = boundaryStepHarness({
    response: { success: false, message: "Unavailable" },
  });
  await h.mount();
  assert.equal(h.form.values.boundary, null);
  assert.equal(h.valid, false);
  await h.submit();
  assert.equal(h.saves.length, 0);
  h.setOccupancyResponse(undefined);
  h.button("retry").onClick();
  h.render();
  await tick();
  assert.equal(h.editor.session.phase, "confirmed");
  h.runtime.cleanup();
  const unmapped = boundaryStepHarness({
    overview: { farm_boundary: null, can_use_full_farm_boundary: false },
  });
  await unmapped.mount();
  assert.equal(unmapped.form.values.boundary_source, "manual_area");
  assert.equal(unmapped.form.values.boundary, null);
  assert.equal(
    nodes(unmapped.render()).some((n) => n.type === "Editor"),
    false,
  );
  unmapped.runtime.cleanup();
});

test("GPS retains the crop until a new route is reviewed and reuses the shared watcher cleanup", async () => {
  const h = boundaryStepHarness();
  await h.mount();
  const original = clone(h.editor.displayGeometry);
  h.editor.session.changeMode("gps");
  assert.deepEqual(clone(h.editor.displayGeometry), original);
  h.editor.session.start();
  assert.equal(h.watches.length, 1);
  assert.equal(h.valid, false);
  const route = geometry.boundaryPoints(
    box(75.0001, 26.0001, 75.0003, 26.0003),
  );
  for (let i = 0; i < route.length; i++) {
    h.watches[0].success({
      coords: { latitude: route[i].lat, longitude: route[i].lng, accuracy: 5 },
      timestamp: Date.now() - (route.length - i) * 3000,
    });
    h.render();
  }
  assert.deepEqual(clone(h.editor.displayGeometry), original);
  assert.equal(h.editor.session.confirm(), true);
  assert.deepEqual(
    clone(h.editor.displayGeometry),
    clone(geometry.pointsToBoundary(route)),
  );
  await h.submit();
  assert.equal(h.saves[0].values.boundary_source, "gps");
  assert.equal(h.saves[0].values.gps_accuracy_m, 5);
  h.editor.session.edit();
  h.editor.session.update(
    geometry.boundaryPoints(box(75.0001, 26.0001, 75.0002, 26.0002)),
  );
  assert.equal(h.form.values.boundary_source, "gps");
  assert.equal(h.valid, false);
  h.editor.session.confirm();
  await h.submit();
  assert.equal(h.saves[1].values.boundary_source, "gps");
  assert.notDeepEqual(h.saves[1].values.boundary, h.saves[0].values.boundary);
  assert.deepEqual(h.occupancy.farm_boundary, original);
  assert.ok(h.cleared.length > 0);
  h.runtime.cleanup();
});

test("crop allocation accepts shared edges and full-farm coverage, but rejects crossing, nesting and identical occupied areas", () => {
  const farm = box(0, 0, 10, 10);
  const before = JSON.stringify(farm);
  assert.equal(geometry.cropAllocationError(farm, farm, []), null);
  assert.equal(
    geometry.cropAllocationError(box(5, 0, 10, 10), farm, [box(0, 0, 5, 10)]),
    null,
  );
  for (const crop of [box(4, 0, 9, 10), box(1, 1, 2, 2), box(0, 0, 5, 10)])
    assert.equal(
      geometry.cropAllocationError(crop, farm, [box(0, 0, 5, 10)]),
      "overlap",
    );
  assert.equal(
    geometry.cropAllocationError(box(0, 0, 10, 10), farm, [box(4, 4, 5, 5)]),
    "overlap",
  );
  assert.equal(
    geometry.cropAllocationError(box(-1, 0, 3, 3), farm, []),
    "outsideFarm",
  );
  assert.equal(JSON.stringify(farm), before);
});
test("containment checks holes, concave edges and all components instead of comparing numeric areas", () => {
  const holed = box(0, 0, 10, 10);
  holed.coordinates[0].push(box(4, 4, 6, 6).coordinates[0][0]);
  assert.equal(
    geometry.cropAllocationError(box(3, 3, 7, 7), holed, []),
    "outsideFarm",
  );
  assert.equal(
    geometry.cropAllocationError(box(4.1, 4.1, 5.9, 5.9), holed, []),
    "outsideFarm",
  );
  const matchingHole = clone(holed);
  assert.equal(geometry.cropAllocationError(matchingHole, holed, []), null);
  const multi = {
    type: "MultiPolygon",
    coordinates: [
      ...box(1, 1, 2, 2).coordinates,
      ...box(7, 7, 8, 8).coordinates,
    ],
  };
  assert.equal(
    geometry.cropAllocationError(multi, box(0, 0, 10, 10), []),
    null,
  );
  assert.equal(
    geometry.cropAllocationError(multi, box(0, 0, 10, 10), [
      box(7.5, 7.5, 9, 9),
    ]),
    "overlap",
  );
  const concave = {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [7, 10],
          [7, 3],
          [3, 3],
          [3, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    ],
  };
  const bridge = {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [1, 8],
          [9, 8],
          [1, 9],
          [1, 8],
        ],
      ],
    ],
  };
  assert.equal(
    geometry.cropAllocationError(bridge, concave, []),
    "outsideFarm",
  );
});
test("crop URL filters preserve backend pagination, draft state and the two supported historical statuses", () => {
  const { cropFilters } = load(feature + "cropFilters.ts");
  assert.deepEqual(
    clone(
      cropFilters({
        tab: "drafts",
        farm_id: "17",
        season_id: "2",
        page: "3",
        search: "अ".repeat(200),
      }),
    ),
    {
      status: "draft",
      farm_id: 17,
      season_id: 2,
      page: 3,
      per_page: 15,
      search: "अ".repeat(150),
    },
  );
  assert.equal(cropFilters({ tab: "history" }).status, "completed");
  assert.equal(
    cropFilters({ tab: "history", history_status: "cancelled" }).status,
    "cancelled",
  );
  const filters = cropFilters({
    page: "-2",
    farm_id: "NaN",
    season_id: "9007199254740999",
  });
  assert.equal(filters.page, 1);
  assert.equal(filters.farm_id, undefined);
  assert.equal(filters.season_id, undefined);
});
test("verified crop clients use web apiRequest, one draft ID, revisions, multipart POST and query-only edit discard", async () => {
  const calls = [];
  const { accountFarmCropsAPI: api, accountCropCatalogAPI: catalog } = load(
    "src/lib/apis/account/farm-crops.ts",
    {
      "server-only": {},
      "@/lib/api/request": {
        apiRequest: async (...args) => {
          calls.push(args);
          return { status: true, data: { id: 41 } };
        },
      },
    },
  );
  const selection = {
    farm_id: 3,
    crop_id: 7,
    crop_variety_id: null,
    season_id: 2,
    sowing_method: "broadcasting",
  };
  const key = "00000000-0000-4000-8000-000000000001";
  await api.create(selection, key);
  await api.selection(41, 2, selection);
  await api.boundary(41, 3, {
    boundary_source: "farm_boundary",
    area_unit: "acre",
  });
  await api.seed(41, 4, {
    seed_source: "local",
    sowing_date: "2026-11-16",
    quantity_mode: "unknown",
  });
  const form = new FormData();
  form.set("assessment_mode", "skipped");
  await api.soil(41, 5, form);
  await api.fertilizer(41, 6, { skipped: true, fertilizers: [] });
  await api.discardEdit(41, 7);
  await api.finalize(41, 8);
  await api.map();
  await catalog.list("crops", { is_recommendate: true, per_page: 5 });
  assert.ok(calls.every(([, options]) => options.audience === "web"));
  assert.equal(calls[0][1].idempotencyKey, key);
  assert.equal(calls[1][0], "/account/farm-crops/41/step-1");
  assert.equal(calls[1][1].data.revision, 2);
  assert.equal(calls[4][1].method, "POST");
  assert.equal(calls[4][1].data.get("revision"), "5");
  assert.equal(calls[4][1].data.get("assessment_mode"), "skipped");
  assert.equal(calls[6][1].method, "DELETE");
  assert.equal(calls[6][1].data, undefined);
  assert.equal(calls[6][1].params.revision, 7);
  assert.equal(calls[7][0], "/account/farm-crops/41/finalize");
  assert.deepEqual(clone(calls[8][1].params), { status: "active" });
  assert.equal(calls[9][1].params.is_recommendate, true);
  assert.throws(() => catalog.list("arbitrary"), /Invalid catalogue/);
});
test("crop actions authenticate each call, retain 422 errors, flag revision conflicts and revalidate only successful activation", async () => {
  class ApiError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.status = status;
      this.errors = errors;
    }
  }
  let auth = 0,
    mode = "ok";
  const paths = [];
  const errorMap = { seed_quantity: ["Correct the seed quantity."] };
  const api = {
    seed: async () => {
      if (mode === "invalid") throw new ApiError("invalid", 422, errorMap);
      if (mode === "conflict") throw new ApiError("changed", 409);
      return { status: true, data: { id: 8, revision: 4 } };
    },
    finalize: async () =>
      mode === "ok"
        ? { status: true, data: { id: 8, status: "active" } }
        : { status: false, data: null },
  };
  const actions = load("src/actions/account/farm-crops.ts", {
    "next-intl/server": { getTranslations: async () => (key) => key },
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "@/lib/userAuth/dal": {
      requireUser: async () => {
        auth++;
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => ({
        success: false,
        message: error.message,
        errors: error.errors,
      }),
    },
    "@/lib/apis/account/farm-crops": {
      accountFarmCropsAPI: api,
      accountCropCatalogAPI: {},
    },
  });
  assert.equal((await actions.saveCropSeed(8, 3, {})).data.revision, 4);
  mode = "invalid";
  assert.deepEqual((await actions.saveCropSeed(8, 3, {})).errors, errorMap);
  mode = "conflict";
  assert.equal((await actions.saveCropSeed(8, 3, {})).conflict, true);
  await actions.finalizeFarmerCrop(8, 3);
  assert.equal(paths.length, 0);
  mode = "ok";
  await actions.finalizeFarmerCrop(8, 3);
  assert.deepEqual(paths, ["/account/crops"]);
  assert.equal(auth, 5);
});

const steps = [
  "crop_selection",
  "boundary",
  "seed_sowing",
  "soil_assessment",
  "fertilizer_planning",
  "review",
];
function detail(next = 2, revision = 1, status = "draft") {
  return {
    id: 41,
    farm: { id: 8 },
    revision,
    status,
    next_step: next,
    completed_step: next - 1,
    can_finalize: next === 6,
    has_pending_edit: status === "active",
    wizard_progress: Object.fromEntries(
      steps
        .slice(0, 5)
        .map((s, i) => [s, i + 1 < next ? "completed" : "pending"]),
    ),
  };
}
function wizardHarness({
  id,
  startStep,
  server = detail(),
  responses = {},
} = {}) {
  const runtime = hooks();
  const calls = [];
  const notices = [];
  let changed = 0,
    closed = 0,
    finalized = null;
  const actions = {
    getFarmerCrop: async (cropId) => {
      calls.push(["load", cropId]);
      return { success: true, data: server };
    },
    getCropReview: async (cropId) => {
      calls.push(["review", cropId]);
      return { success: true, data: server };
    },
    ...Object.fromEntries(
      [
        "createFarmerCrop",
        "saveCropSelection",
        "saveCropBoundary",
        "saveCropSeed",
        "saveCropSoil",
        "saveCropFertilizers",
        "finalizeFarmerCrop",
        "deleteFarmerCrop",
        "discardCropEdit",
      ].map((name) => [
        name,
        async (...args) => {
          calls.push([name, ...args]);
          return responses[name]
            ? responses[name](...args)
            : { success: true, data: detail(3, 2), message: "saved" };
        },
      ]),
    ),
  };
  const deps = {
    react: runtime.react,
    "next-intl": { useTranslations: () => (key) => key },
    "react-hot-toast": {
      success: (message) => notices.push(message),
      error: (message) => notices.push(message),
    },
    "@headlessui/react": Object.fromEntries(
      [
        "Dialog",
        "DialogBackdrop",
        "DialogPanel",
        "DialogTitle",
        "Description",
      ].map((name) => [name, name]),
    ),
    "@/actions/account/farm-crops": actions,
    "@/icons": new Proxy({}, { get: (_, name) => name }),
    "./CropUi": {
      CropNotice: "Notice",
      cropButton: "button",
      cropPrimary: "primary",
    },
    "./CropWizardStepper": { default: "Stepper", cropSteps: steps },
  };
  for (const name of [
    "CropSelectionStep",
    "CropBoundaryStep",
    "SeedSowingStep",
    "SoilAssessmentStep",
    "FertilizerPlanningStep",
    "CropReviewStep",
    "CropConfirmDialog",
  ])
    deps[`./${name}`] = name;
  const Component = load(feature + "CropWizardDialog.tsx", deps).default;
  const props = {
    id,
    startStep,
    onClose: () => closed++,
    onChanged: () => changed++,
    onSaved: (crop) => {
      finalized = crop;
    },
  };
  return {
    calls,
    notices,
    runtime,
    props,
    render: () => runtime.render(Component, props),
    get changed() {
      return changed;
    },
    get closed() {
      return closed;
    },
    get finalized() {
      return finalized;
    },
  };
}
test("new crop creation blocks duplicate submits, reuses its idempotency key after failure and advances only on success", async () => {
  let resolve;
  let count = 0;
  const h = wizardHarness({
    responses: {
      createFarmerCrop: () =>
        ++count === 1
          ? new Promise((r) => {
              resolve = r;
            })
          : { success: true, data: detail(2, 1) },
    },
  });
  const selection = nodes(h.render()).find(
    (n) => n.type === "CropSelectionStep",
  );
  const input = {
    farm_id: 1,
    crop_id: 2,
    season_id: 3,
    sowing_method: null,
    crop_variety_id: null,
  };
  const pending = selection.props.onSave(1, input);
  const duplicate = await selection.props.onSave(1, input);
  assert.equal(duplicate.success, false);
  assert.equal(h.calls.length, 1);
  assert.ok(nodes(h.render()).some((n) => n.type === "CropSelectionStep"));
  resolve({ success: false, message: "retry" });
  await pending;
  await nodes(h.render())
    .find((n) => n.type === "CropSelectionStep")
    .props.onSave(1, input);
  assert.equal(h.calls[0][2], h.calls[1][2]);
  const boundary = nodes(h.render()).find((n) => n.type === "CropBoundaryStep");
  assert.equal(boundary.props.crop.id, 41);
  assert.equal(h.changed, 1);
  h.runtime.cleanup();
});

test("Step 2 waits for the boundary API and advances with authoritative geometry, area and revision after one success toast", async () => {
  let resolve;
  const authoritative = {
    ...detail(3, 8),
    boundary_details: { boundary: box(75, 26, 75.001, 26.001) },
    calculated_area_sqm: "10000",
  };
  const h = wizardHarness({
    id: 41,
    server: detail(2, 7),
    responses: {
      saveCropBoundary: () =>
        new Promise((r) => {
          resolve = r;
        }),
    },
  });
  h.render();
  await tick();
  const step = nodes(h.render()).find((n) => n.type === "CropBoundaryStep");
  const values = {
    boundary_source: "farm_boundary",
    area_unit: "acre",
    boundary: authoritative.boundary_details.boundary,
  };
  const pending = step.props.onSave(2, values);
  assert.ok(nodes(h.render()).some((n) => n.type === "CropBoundaryStep"));
  assert.equal(h.notices.length, 0);
  assert.deepEqual(
    clone(h.calls.find((call) => call[0] === "saveCropBoundary")),
    ["saveCropBoundary", 41, 7, values],
  );
  resolve({ success: true, data: authoritative, message: "Boundary saved" });
  await pending;
  const next = nodes(h.render()).find((n) => n.type === "SeedSowingStep");
  assert.equal(next.props.crop, authoritative);
  assert.deepEqual(h.notices, ["Boundary saved"]);
  h.runtime.cleanup();
});

test("closing before draft creation never offers to keep a draft that has not been saved", () => {
  const h = wizardHarness();
  const step = nodes(h.render()).find(
    (node) => node.type === "CropSelectionStep",
  );
  step.props.onDirty(true);
  const tree = h.render();
  tree.props.onClose();
  const confirm = nodes(h.render()).find(
    (node) => node.type === "CropConfirmDialog",
  );
  assert.equal(confirm.props.onAlternative, undefined);
  assert.equal(confirm.props.alternativeLabel, undefined);
  h.runtime.cleanup();
});

test("review keeps explicit zero, not applicable and skipped expenses distinct", () => {
  const runtime = hooks(),
    form = formHarness();
  const Component = load(feature + "CropReviewStep.tsx", {
    ...formDeps(runtime, form),
    "react-hot-toast": { error() {} },
    "@/actions/account/farm-crops": { downloadCropSoilReport() {} },
    "@/hooks/useAreaUnits": () => ({ label: (unit) => unit }),
    "@/lib/areaUnits": { formatArea: (value) => value },
    "@/components/common/maps/FarmBoundaryMap": "BoundaryMap",
  }).default;
  const crop = {
    id: 4,
    revision: 2,
    status: "draft",
    crop: { name: "Crop" },
    farm: { name: "Farm" },
    season: { name: "Season" },
    crop_variety: null,
    sowing_method: null,
    boundary_details: { farm_boundary: null, boundary: null },
    seed_sowing_details: { seed: null, purchase: null },
    soil_assessment: { assessment_mode: "basic", basic_assessment: null },
    fertilizer_plan: { skipped: true, selected_fertilizers: [] },
    expenses: {
      estimated_seed_cost: "0",
      estimated_soil_test_cost: "0",
      estimated_fertilizer_cost: null,
      component_states: {
        estimated_seed_cost: "explicit_zero",
        estimated_soil_test_cost: "not_applicable",
        estimated_fertilizer_cost: "skipped",
      },
      is_complete: false,
      known_subtotal: "0",
      currency_code: "INR",
    },
    expected_yield: null,
    validation_issues: {},
  };
  const tree = runtime.render(Component, { crop });
  const text = nodes(tree)
    .flatMap((node) => [node.props?.children])
    .flat(Infinity)
    .filter((v) => typeof v === "string")
    .join(" ");
  assert.match(text, /expenseStates.explicit_zero/);
  assert.match(text, /expenseStates.not_applicable/);
  assert.match(text, /expenseStates.skipped/);
  runtime.cleanup();
});
test("resume restores backend next_step/revision; a failed save keeps the current step and original draft", async () => {
  const h = wizardHarness({
    id: 41,
    server: detail(3, 8),
    responses: {
      saveCropSeed: () => ({
        success: false,
        message: "invalid",
        errors: { sowing_date: ["date"] },
      }),
    },
  });
  h.render();
  await tick();
  let tree = h.render();
  const seed = nodes(tree).find((n) => n.type === "SeedSowingStep");
  assert.equal(seed.props.crop.revision, 8);
  await seed.props.onSave(3, { seed_source: "local" });
  tree = h.render();
  assert.ok(nodes(tree).some((n) => n.type === "SeedSowingStep"));
  assert.equal(
    h.calls.filter((call) => call[0] === "createFarmerCrop").length,
    0,
  );
  assert.equal(h.calls.at(-1)[2], 8);
  h.runtime.cleanup();
});
test("optional steps save real skip payloads and active edit discard never cancels the live crop", async () => {
  const h = wizardHarness({
    id: 41,
    server: detail(4, 10, "active"),
    responses: {
      saveCropSoil: () => ({ success: true, data: detail(5, 11, "active") }),
    },
  });
  h.render();
  await tick();
  let tree = h.render();
  await nodes(tree)
    .find((n) => n.type === "SoilAssessmentStep")
    .props.onSave(
      4,
      (() => {
        const data = new FormData();
        data.set("assessment_mode", "skipped");
        return data;
      })(),
    );
  assert.equal(
    h.calls
      .find((call) => call[0] === "saveCropSoil")[3]
      .get("assessment_mode"),
    "skipped",
  );
  tree = h.render();
  assert.ok(nodes(tree).some((n) => n.type === "FertilizerPlanningStep"));
  tree.props.onClose();
  tree = h.render();
  const confirm = nodes(tree).find((n) => n.type === "CropConfirmDialog");
  assert.equal(confirm.props.confirmLabel, "discardEdits");
  await confirm.props.onConfirm();
  assert.ok(
    h.calls.some((call) => call[0] === "discardCropEdit" && call[2] === 11),
  );
  assert.ok(!h.calls.some((call) => call[0] === "deleteFarmerCrop"));
  assert.equal(h.closed, 1);
  h.runtime.cleanup();
});
test("review is refreshed from the server and final save calls activation once without generating a timeline", async () => {
  let resolve;
  const server = detail(6, 12);
  const h = wizardHarness({
    id: 41,
    server,
    responses: {
      finalizeFarmerCrop: () =>
        new Promise((r) => {
          resolve = r;
        }),
    },
  });
  h.render();
  await tick();
  h.render();
  await tick();
  const review = nodes(h.render()).find((n) => n.type === "CropReviewStep");
  assert.ok(h.calls.some((c) => c[0] === "review"));
  const saving = review.props.onFinalize(12);
  assert.equal((await review.props.onFinalize(12)).success, false);
  assert.equal(h.calls.filter((c) => c[0] === "finalizeFarmerCrop").length, 1);
  resolve({ success: true, data: { ...server, status: "active" } });
  await saving;
  assert.equal(h.finalized.status, "active");
  assert.ok(!h.calls.some((c) => /timeline/i.test(c[0])));
  h.runtime.cleanup();
});
test("English/Hindi crop messages match, interpolation is preserved and every literal feature key resolves", () => {
  const messages = Object.fromEntries(
    ["en", "hi"].map((locale) => [
      locale,
      JSON.parse(fs.readFileSync(`src/messages/${locale}.json`, "utf8")),
    ]),
  );
  const flatten = (o, p = "") =>
    Object.fromEntries(
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object"
          ? Object.entries(flatten(v, `${p}${k}.`))
          : [[p + k, v]],
      ),
    );
  const en = flatten(messages.en.farmerCrops),
    hi = flatten(messages.hi.farmerCrops);
  assert.deepEqual(Object.keys(en), Object.keys(hi));
  for (const key of Object.keys(en))
    assert.deepEqual(en[key].match(/\{\w+\}/g), hi[key].match(/\{\w+\}/g), key);
  const files = fs
    .readdirSync(feature)
    .filter((f) => f.endsWith("tsx"))
    .map((f) => feature + f)
    .concat([
      "src/components/common/maps/CropInfoWindow.tsx",
      "src/actions/account/farm-crops.ts",
    ]);
  const missing = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g))
      if (typeof en[match[1]] !== "string")
        missing.push(`${file}: ${match[1]}`);
  }
  assert.deepEqual(missing, []);
  for (const locale of ["en", "hi"]) {
    const t = createTranslator({
      locale,
      messages: messages[locale],
      namespace: "farmerCrops",
    });
    assert.match(t("tabs.drafts", { count: 3 }), /3/);
    assert.ok(t("timelineUnavailable"));
  }
});
