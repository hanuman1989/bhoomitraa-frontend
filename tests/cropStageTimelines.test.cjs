const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsxRuntime = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/";
const clone = (value) => JSON.parse(JSON.stringify(value));

function load(file, dependencies) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: compiledModule,
    exports: compiledModule.exports,
    URLSearchParams,
    require: (name) => {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return compiledModule.exports;
}
class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
const payload = {
  crop_stage_id: 4,
  crop_variety_id: null,
  season_id: null,
  source_id: 9,
  days_after_sowing_min: 0,
  days_after_sowing_max: 10,
  region_scope: "specific",
  region_ids: [101, 102],
};
const timeline = {
  id: 42,
  ...payload,
  crop_id: 3,
  crop_name: "Wheat",
  crop_stage_name: "Tillering",
  crop_variety_name: null,
  season_name: null,
  source_title: "ICAR",
  is_active: false,
};

function harness(responses = [], admin = true) {
  const requests = [],
    invalidations = [];
  async function request(url, options = {}) {
    requests.push({ url, options: clone(options) });
    assert.ok(responses.length, `Unexpected backend request ${url}`);
    const result = responses.shift();
    if (result instanceof Error) throw result;
    return result;
  }
  function client(endpoint) {
    return {
      list: (params) => request(`/admin/${endpoint}`, { params }),
      show: (id) => request(`/admin/${endpoint}/${id}`),
    };
  }
  const service = load("src/lib/apis/admin/cropStageTimelines.ts", {
    "server-only": {},
    "next-intl/server": { getLocale: async () => "en" },
    "@/lib/api/request": { apiRequest: request },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/apis/admin/crops": { cropsAPI: client("crops") },
    "@/lib/apis/admin/seeds": { seedsAPI: client("seeds") },
    "@/lib/apis/admin/cropStages": { cropStagesAPI: client("crop-stages") },
    "@/lib/apis/admin/cropVarieties": {
      cropVarietiesAPI: client("crop-varieties"),
    },
    "@/lib/apis/admin/seasons": { seasonsAPI: client("seasons") },
    "@/lib/apis/admin/knowledgeSources": {
      knowledgeSourcesAPI: client("knowledge-sources"),
    },
    "@/lib/apis/admin/regions": { regionsAPI: client("regions") },
    "@/lib/apis/admin/activityCategories": { activityCategoriesAPI: client("activity-categories") },
  });
  const actions = load("src/actions/admin/cropStageTimelines.ts", {
    "next/cache": { revalidatePath: (route) => invalidations.push(route) },
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new Error("Unauthenticated");
      },
    },
    "@/lib/apis/admin/cropStageTimelines": service,
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { success: false, message: error.message, errors: error.errors };
      },
    },
  });
  return { ...service, actions, requests, invalidations };
}

test("timeline service uses all six verified routes and does not send a DELETE body", async () => {
  const h = harness(Array(6).fill({ status: true, data: timeline }));
  await h.stageTimelinesAPI.list({
    keyword: "wheat",
    crop_id: 3,
    crop_stage_id: 4,
    crop_variety_id: 5,
    season_id: 6,
    status: "0",
    page: 2,
  });
  await h.stageTimelinesAPI.show(42);
  await h.stageTimelinesAPI.create(payload);
  await h.stageTimelinesAPI.update(42, payload);
  await h.stageTimelinesAPI.updateStatus(42, true);
  await h.stageTimelinesAPI.delete(42);
  assert.deepEqual(
    h.requests.map((request) => [request.url, request.options.method ?? "GET"]),
    [
      ["/admin/crop-stage-timelines", "GET"],
      ["/admin/crop-stage-timelines/42", "GET"],
      ["/admin/crop-stage-timelines", "POST"],
      ["/admin/crop-stage-timelines/42", "PATCH"],
      ["/admin/crop-stage-timelines/42/status", "PATCH"],
      ["/admin/crop-stage-timelines/42", "DELETE"],
    ],
  );
  assert.equal(h.requests[0].options.params.status, "0");
  assert.equal("data" in h.requests[5].options, false);
});
test("timeline saves allowlist schema fields, preserve zero and null IDs and create without an activation request", async () => {
  const h = harness([{ status: true, data: timeline }]);
  const result = await h.actions.saveStageTimeline(null, {
    ...payload,
    crop_id: 3,
    is_active: true,
    description: "Unsupported",
    remarks: "Unsupported",
  });
  assert.equal(result.success, true);
  assert.deepEqual(h.requests[0].options.data, payload);
  assert.equal(h.requests.length, 1);
  assert.ok(h.invalidations.includes("/[locale]/admin/crop-stage-timelines"));
  const all = harness([{ status: true, data: timeline }]);
  await all.actions.saveStageTimeline(42, { ...payload, region_scope: "all" });
  assert.deepEqual(all.requests[0].options.data.region_ids, []);
});
test("timeline failures preserve indexed district errors, publication/deletion conflicts and Next control flow", async () => {
  const error = new ApiError("Invalid district", 422, {
    "region_ids.0": ["Inactive"],
    crop_variety_id: ["Wrong crop"],
  });
  const h = harness([error]);
  assert.equal(
    (await h.actions.saveStageTimeline(42, payload)).errors["region_ids.0"][0],
    "Inactive",
  );
  assert.equal(h.invalidations.length, 0);
  const conflict = harness([
    new ApiError("Overlapping active rule", 409),
    new ApiError("Referenced; deactivate instead", 409),
  ]);
  assert.equal(
    (await conflict.actions.updateStageTimelineStatus(42, true)).success,
    false,
  );
  assert.equal((await conflict.actions.deleteStageTimeline(42)).success, false);
  assert.equal(conflict.invalidations.length, 0);
  const controlFlow = Object.assign(new Error("NEXT_REDIRECT"), {
    controlFlow: true,
  });
  await assert.rejects(
    harness([controlFlow]).actions.saveStageTimeline(null, payload),
    /NEXT_REDIRECT/,
  );
});
test("every timeline mutation and lookup authenticates and constrains unsafe arguments before contacting Laravel", async () => {
  const h = harness();
  for (const id of [0, -1, 1.5, NaN, "42", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      (await h.actions.saveStageTimeline(id, payload)).success,
      false,
    );
    assert.equal(
      (await h.actions.updateStageTimelineStatus(id, true)).success,
      false,
    );
    assert.equal((await h.actions.deleteStageTimeline(id)).success, false);
  }
  for (const invalid of [
    null,
    { ...payload, region_ids: [101, 101] },
    { ...payload, days_after_sowing_min: -1 },
    { ...payload, days_after_sowing_min: 0.5 },
    { ...payload, days_after_sowing_max: 4294967296 },
    { ...payload, region_scope: "state" },
  ])
    assert.equal(
      (await h.actions.saveStageTimeline(null, invalid)).success,
      false,
    );
  assert.equal(
    (await h.actions.searchTimelineOptions("unknown", null, true, "", 1))
      .success,
    false,
  );
  assert.equal(h.requests.length, 0);
  const anonymous = harness([], false);
  await anonymous.actions.saveStageTimeline(null, payload);
  await anonymous.actions.updateStageTimelineStatus(42, true);
  await anonymous.actions.deleteStageTimeline(42);
  await anonymous.actions.searchTimelineOptions("stage", 3, true, "", 1);
  assert.equal(anonymous.requests.length, 0);
});

function findAll(element, predicate) {
  if (!element || typeof element !== "object") return [];
  return [
    ...(predicate(element) ? [element] : []),
    ...[element.props?.children ?? []]
      .flat(Infinity)
      .flatMap((child) => findAll(child, predicate)),
  ];
}
function hooks() {
  const values = [];
  let cursor = 0;
  return {
    reset() {
      cursor = 0;
    },
    react: {
      useState(initial) {
        const index = cursor++;
        values[index] ??= { value: initial };
        return [
          values[index].value,
          (next) => {
            values[index].value =
              typeof next === "function" ? next(values[index].value) : next;
          },
        ];
      },
    },
  };
}
const ui = {
  "next-intl": { useTranslations: () => (key) => key },
  "@/components/admin/form/input/InputField": {
    __esModule: true,
    default: "input",
  },
  "@/components/admin/form/Label": { __esModule: true, default: "label" },
  "@/icons": { ChevronDownIcon: () => null },
};
const states = [
  {
    id: 1,
    name: "Rajasthan",
    is_active: true,
    districts: [
      { id: 101, name: "Jaipur", is_active: true },
      { id: 102, name: "Bhilwara", is_active: true },
      { id: 103, name: "Ajmer", is_active: true },
      { id: 104, name: "Legacy", is_active: false },
    ],
  },
  {
    id: 2,
    name: "Uttar Pradesh",
    is_active: true,
    districts: [{ id: 201, name: "Lucknow", is_active: true }],
  },
];
function treeHarness(selectedIds = [], disabled = false) {
  const state = hooks();
  const Tree = load("src/components/admin/common/DistrictCheckboxTree.tsx", {
    ...ui,
    react: state.react,
  }).default;
  const changes = [];
  const props = {
    states,
    selectedIds,
    disabled,
    onChange: (ids) => {
      props.selectedIds = [...ids];
      changes.push([...ids]);
    },
  };
  return {
    props,
    changes,
    render() {
      state.reset();
      return Tree(props);
    },
  };
}
function stateCheck(tree, id) {
  return findAll(
    tree,
    (element) => element.props.id === `timeline-state-check-${id}`,
  )[0];
}
function districtCheck(tree, name) {
  const label = findAll(
    tree,
    (element) =>
      element.type === "label" &&
      findAll(
        element,
        (child) => child.type === "span" && child.props.children === name,
      ).length > 0,
  )[0];
  return findAll(label, (element) => element.type === "input")[0];
}

test("district tree derives checked, mixed and unchecked parents and sets the native indeterminate property", () => {
  const h = treeHarness([101]);
  let tree = h.render();
  const parent = stateCheck(tree, 1);
  assert.equal(parent.props["aria-checked"], "mixed");
  const native = {};
  parent.props.ref(native);
  assert.equal(native.indeterminate, true);
  parent.props.onChange();
  tree = h.render();
  assert.equal(stateCheck(tree, 1).props.checked, true);
  assert.deepEqual(h.props.selectedIds, [101, 102, 103]);
  stateCheck(tree, 1).props.onChange();
  tree = h.render();
  assert.equal(stateCheck(tree, 1).props.checked, false);
  assert.deepEqual(h.props.selectedIds, []);
});
test("search preserves hidden selections and state check selects every eligible child, not only visible matches", () => {
  const h = treeHarness([201]);
  let tree = h.render();
  findAll(
    tree,
    (element) => element.props.id === "timeline-region-search",
  )[0].props.onChange({ target: { value: "Jaipur" } });
  tree = h.render();
  assert.equal(districtCheck(tree, "Bhilwara"), undefined);
  stateCheck(tree, 1).props.onChange();
  tree = h.render();
  assert.deepEqual(h.props.selectedIds, [201, 101, 102, 103]);
  assert.equal(stateCheck(tree, 1).props.checked, true);
  assert.equal(new Set(h.props.selectedIds).size, h.props.selectedIds.length);
  findAll(
    tree,
    (element) => element.props.id === "timeline-region-search",
  )[0].props.onChange({ target: { value: "" } });
  tree = h.render();
  assert.ok(districtCheck(tree, "Bhilwara"));
  assert.ok(h.props.selectedIds.includes(201));
});
test("district toggle recomputes mixed parent; expansion/collapse and search never mutate selections", () => {
  const h = treeHarness([101, 102, 103]);
  let tree = h.render();
  districtCheck(tree, "Bhilwara").props.onChange({
    target: { checked: false },
  });
  tree = h.render();
  assert.equal(stateCheck(tree, 1).props["aria-checked"], "mixed");
  const changes = h.changes.length;
  const button = findAll(
    tree,
    (element) => element.props["aria-controls"] === "timeline-state-1",
  )[0];
  button.props.onClick();
  tree = h.render();
  assert.equal(
    findAll(tree, (element) => element.props.id === "timeline-state-1")[0].props
      .hidden,
    false,
  );
  findAll(
    tree,
    (element) => element.props["aria-controls"] === "timeline-state-1",
  )[0].props.onClick();
  assert.equal(h.changes.length, changes);
});
test("inactive legacy districts remain visible and removable, cannot be reselected, and disabled tree ignores updates", () => {
  const h = treeHarness([104]);
  let tree = h.render();
  assert.equal(districtCheck(tree, "Legacy").props.checked, true);
  assert.equal(districtCheck(tree, "Legacy").props.disabled, false);
  districtCheck(tree, "Legacy").props.onChange({ target: { checked: false } });
  tree = h.render();
  assert.equal(districtCheck(tree, "Legacy").props.disabled, true);
  districtCheck(tree, "Legacy").props.onChange({ target: { checked: true } });
  assert.deepEqual(h.props.selectedIds, []);
  const locked = treeHarness([], true);
  stateCheck(locked.render(), 1).props.onChange();
  assert.equal(locked.changes.length, 0);
});

test("region loader requests only state/district pages and knows every district before allowing Select All", async () => {
  const state = {
    id: 1,
    parent_id: 99,
    name: "State",
    region_type: "state",
    is_active: true,
  };
  const district = (id) => ({
    id,
    parent_id: 1,
    name: `District ${id}`,
    region_type: "district",
    is_active: true,
  });
  const h = harness([
    { status: true, data: [state], pagination: { last_page: 1 } },
    { status: true, data: [district(101)], pagination: { last_page: 2 } },
    { status: true, data: [district(102)], pagination: { last_page: 2 } },
  ]);
  const result = await h.getTimelineRegions();
  assert.deepEqual(
    clone(result[0].districts.map((district) => district.id)),
    [101, 102],
  );
  assert.deepEqual(
    h.requests.map((request) => request.options.params.region_type),
    ["state", "district", "district"],
  );
  assert.equal(h.requests[2].options.params.page, 2);
});
test("region loader restores saved inactive districts and inactive parents without fetching other region levels", async () => {
  const h = harness([
    { status: true, data: [], pagination: { last_page: 1 } },
    { status: true, data: [], pagination: { last_page: 1 } },
    {
      status: true,
      data: {
        id: 104,
        parent_id: 1,
        name: "Legacy",
        region_type: "district",
        is_active: false,
      },
    },
    {
      status: true,
      data: { id: 1, name: "State", region_type: "state", is_active: false },
    },
  ]);
  const result = await h.getTimelineRegions([
    { id: 104, parent_id: 1, name: "Legacy", region_type: "district" },
  ]);
  assert.equal(result[0].is_active, false);
  assert.equal(result[0].districts[0].id, 104);
  assert.equal(result[0].districts[0].is_active, false);
});

test("dependent option lookups apply crop and status filters and never serialize source attachments", async () => {
  const h = harness([
    {
      status: true,
      data: [
        {
          id: 4,
          name: "Tillering",
          crop_id: 3,
          code: "tillering",
          is_active: true,
        },
      ],
      pagination: { last_page: 1 },
    },
    {
      status: true,
      data: [
        {
          id: 5,
          slug: "variety",
          name: "किस्म",
          crop_id: 3,
          is_active: true,
          translations: { en: { name: "Variety" } },
        },
      ],
      pagination: { last_page: 1 },
    },
    {
      status: true,
      data: [
        {
          id: 9,
          title: "ICAR",
          is_active: false,
          verification_status: "pending",
          attachments: [{ private_url: "private" }],
        },
      ],
      pagination: { last_page: 1 },
    },
  ]);
  await h.getTimelineOptions("stage", 3, true);
  const variety = await h.getTimelineOptions("variety", 3, true);
  const source = await h.getTimelineOptions("source", null, false);
  assert.equal(h.requests[0].options.params.crop_id, 3);
  assert.equal(h.requests[0].options.params.status, 1);
  assert.equal(h.requests[1].options.params.crop_id, 3);
  assert.equal(variety.options[0].label, "किस्म");
  assert.equal("attachments" in source.options[0], false);
  assert.equal("private_url" in source.options[0], false);
  assert.equal(source.options[0].verified, false);
});
test("English and Hindi timeline keys and interpolation parameters match", () => {
  const en = require("../src/messages/en.json").stageTimelines,
    hi = require("../src/messages/hi.json").stageTimelines;
  function compare(first, second) {
    assert.deepEqual(Object.keys(first).sort(), Object.keys(second).sort());
    for (const key of Object.keys(first)) {
      if (typeof first[key] === "object") compare(first[key], second[key]);
      else {
        const params = (text) =>
          [...text.matchAll(/\{(\w+)(?:[,}])/g)]
            .map((match) => match[1])
            .sort();
        assert.deepEqual(params(first[key]), params(second[key]), key);
      }
    }
  }
  compare(en, hi);
});

test("changing crop clears only dependent stage/variety fields; timing validates zero, integers and range", () => {
  const values = {
    crop_id: "3",
    crop_stage_id: "4",
    crop_variety_id: "5",
    season_id: "6",
    source_id: "9",
    days_after_sowing_min: "0",
    days_after_sowing_max: "10",
  };
  const rules = {};
  const Fields = load(`${root}_components/StageTimelineFields.tsx`, {
    ...ui,
    "react-hook-form": {
      Controller: "controller",
      useWatch: () => values.crop_id,
    },
    "@/components/admin/common/ComponentCard": {
      __esModule: true,
      default: "card",
    },
    "./TimelineRelationSelect": { __esModule: true, default: "relation" },
  }).default;
  const form = {
    control: {},
    register: (name, options) => {
      rules[name] = options;
      return { name };
    },
    setValue: (name, value) => {
      values[name] = value;
    },
    getValues: (name) => values[name],
    clearErrors() {},
    trigger() {},
    formState: { errors: {} },
  };
  const tree = Fields({
    form,
    choices: {},
    selections: {},
    initialCrop: "3",
    busy: false,
  });
  const controllers = findAll(tree, (element) => element.type === "controller");
  const crop = controllers.find((element) => element.props.name === "crop_id");
  crop.props
    .render({
      field: {
        value: values.crop_id,
        onChange: (value) => {
          values.crop_id = value;
        },
      },
    })
    .props.onChange("8");
  assert.equal(values.crop_stage_id, "");
  assert.equal(values.crop_variety_id, "");
  assert.equal(values.source_id, "9");
  assert.equal(values.season_id, "6");
  assert.equal(values.days_after_sowing_max, "10");
  assert.equal(
    controllers.find((element) => element.props.name === "crop_variety_id")
      .props.rules.required,
    undefined,
  );
  assert.equal(
    controllers.find((element) => element.props.name === "season_id").props
      .rules.required,
    undefined,
  );
  assert.equal(rules.days_after_sowing_min.validate("0"), true);
  assert.equal(rules.days_after_sowing_min.validate("1.5"), "validation.days");
  assert.equal(
    rules.days_after_sowing_max.validate.integer("-1"),
    "validation.days",
  );
  values.days_after_sowing_min = "20";
  assert.equal(
    rules.days_after_sowing_max.validate.range("10"),
    "validation.range",
  );
});

test("All Regions hides the tree, Specific requires districts, and saved inactive selections remain valid drafts", () => {
  let scope = "all";
  const shared = load("src/components/admin/common/RegionScopeSelector.tsx", {
    ...ui,
    "@/components/admin/common/ComponentCard": { __esModule: true, default: "card" },
    "./DistrictCheckboxTree": { __esModule: true, default: "tree" },
  });
  const Regions = load(`${root}_components/StageTimelineRegions.tsx`, {
    ...ui,
    "react-hook-form": { Controller: "controller", useWatch: () => scope },
    "@/components/admin/common/ComponentCard": {
      __esModule: true,
      default: "card",
    },
    "./DistrictCheckboxTree": { __esModule: true, default: "tree" },
    "@/components/admin/common/RegionScopeSelector": shared,
  }).default;
  const form = {
    control: {},
    register: () => ({}),
    getValues: () => scope,
    formState: { errors: {} },
  };
  const render = () => Regions({ form, states, savedIds: [104], busy: false });
  const renderSelector = (controller) => {
    const element = controller.props.render({ field: { value: [104] } });
    return shared.default(element.props);
  };
  let controller = findAll(
    render(),
    (element) => element.type === "controller",
  )[0];
  assert.equal(
    findAll(
      renderSelector(controller),
      (element) => element.type === "tree",
    ).length,
    0,
  );
  assert.equal(controller.props.rules.validate([]), true);
  scope = "specific";
  controller = findAll(render(), (element) => element.type === "controller")[0];
  assert.equal(controller.props.rules.validate([]), "validation.districts");
  assert.equal(
    controller.props.rules.validate([101, 101]),
    "validation.districts",
  );
  assert.equal(controller.props.rules.validate([104]), true);
  assert.equal(controller.props.rules.validate([999]), "validation.districts");
  assert.equal(
    findAll(
      renderSelector(controller),
      (element) => element.type === "tree",
    ).length,
    1,
  );
});

test("timeline listing has seven columns, shows variety under crop and formats equal days", () => {
  const List = load(`${root}_components/StageTimelineList.tsx`, {
    ...ui,
    "@/i18n/navigation": { Link: "link" },
    "@/icons": {
      CalenderIcon: () => null,
      PlusIcon: () => null,
    },
    "@/components/admin/ui/badge/Badge": { __esModule: true, default: "badge" },
    "@/components/admin/ui/table": {
      Table: "table",
      TableHeader: "thead",
      TableBody: "tbody",
      TableRow: "tr",
      TableCell: "td",
    },
    "@/components/admin/common/UrlPagination": {
      __esModule: true,
      default: "pagination",
    },
    "./StageTimelineRowActions": { __esModule: true, default: "actions" },
  }).default;
  const tree = List({
    result: {
      data: [
        {
          ...timeline,
          crop_variety_name: "HD-2967",
          days_after_sowing_max: 0,
          added_at: "5 Nov 2026 10:30 AM",
        },
      ],
      pagination: { total: 1, current_page: 1, last_page: 1, from: 1, to: 1 },
    },
    filtered: false,
  });
  assert.deepEqual(
    findAll(tree, (element) => element.props.isHeader).map(
      (element) => element.props.children,
    ),
    [
      "fields.crop",
      "fields.stage",
      "fields.season",
      "fields.days",
      "fields.status",
      "fields.addedAt",
      "fields.actions",
    ],
  );
  const cropCell = findAll(
    tree,
    (element) => element.type === "td" && !element.props.isHeader,
  )[0];
  assert.equal(
    findAll(cropCell, (element) => element.props.children === "Wheat").length,
    1,
  );
  assert.equal(
    findAll(
      cropCell,
      (element) => element.type === "p" && element.props.children === "HD-2967",
    ).length,
    1,
  );
  assert.equal(
    findAll(
      tree,
      (element) =>
        element.type === "td" && element.props.children === "daysSingle",
    ).length,
    1,
  );
  assert.equal(
    findAll(
      tree,
      (element) =>
        element.type === "td" &&
        element.props.children === "5 Nov 2026 10:30 AM",
    ).length,
    1,
  );
});
