const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root =
  "src/app/[locale]/(admin)/admin/(pages)/farmer-smart-timeline/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(file, dependencies = {}) {
  const loadedModule = { exports: {} };
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
    module: loadedModule,
    exports: loadedModule.exports,
    URLSearchParams,
    require(name) {
      if (name === "react/jsx-runtime") return jsx;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return loadedModule.exports;
}
function findAll(element, predicate) {
  if (!element || typeof element !== "object") return [];
  return [
    ...(predicate(element) ? [element] : []),
    ...[element.props?.children ?? []]
      .flat(Infinity)
      .flatMap((child) => findAll(child, predicate)),
  ];
}
const source = {
  id: 9,
  title: "Reference",
  publisher: "Publisher",
  source_type: "website",
  source_url: "https://example.com/reference",
  reference_identifier: null,
};
const input = {
  crop_id: 3,
  crop_variety_id: null,
  season_id: 4,
  sowing_date: "2026-11-01",
  district_id: 101,
};
const stage = {
  crop_stage_id: 5,
  stage_timeline_id: 6,
  stage_timeline_ids: [6],
  name: "Dynamic stage",
  sequence: 1,
  start_day: 10,
  end_day: 20,
  start_date: "2026-11-11",
  end_date: "2026-11-21",
  is_estimated: true,
  source_id: 9,
  source_ids: [9],
  source,
};
const activity = {
  template_id: 8,
  title: "Inspect",
  description: null,
  instructions: "Read-only instructions",
  category_id: 2,
  category_name: "Monitoring",
  crop_stage_id: 999,
  crop_stage_name: "Stage without timeline",
  schedule_type: "after_sowing",
  start_day: 0,
  end_day: 5,
  start_date: "2026-11-01",
  end_date: "2026-11-06",
  priority: "medium",
  source_id: 9,
  source,
  status: "planned",
};
const preview = {
  preview_only: true,
  input,
  selection: {
    crop_name: "Mustard",
    crop_variety_name: null,
    season_name: "Rabi",
    district_name: "Jaipur",
  },
  summary: {
    total_growth_stages: 1,
    total_activities: 1,
    first_date: "2026-11-01",
    last_date: "2026-11-21",
  },
  growth_stages: [stage],
  activities: [activity],
  warnings: [
    {
      code: "STAGE_TIMELINE_NOT_FOUND",
      message: "Missing configured stage",
      context: { crop_stage_id: 999 },
    },
  ],
};
const display = load(root + "timelineDisplay.ts");
const ui = {
  "next-intl": {
    useTranslations: () =>
      Object.assign(
        (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
        { has: () => true },
      ),
    useFormatter: () => ({
      dateTime: (date, options) => {
        assert.equal(options.timeZone, "UTC");
        return date.toISOString().slice(0, 10);
      },
    }),
  },
  "@/components/admin/common/ComponentCard": {
    __esModule: true,
    default: "card",
  },
  "@/components/admin/ui/badge/Badge": { __esModule: true, default: "badge" },
  "@/components/admin/form/Label": { __esModule: true, default: "label" },
  "@/components/admin/form/date-picker": {
    __esModule: true,
    default: "datepicker",
  },
  "@/i18n/navigation": { Link: "link" },
  "@/icons": new Proxy({}, { get: () => () => null }),
};
function hooks() {
  const slots = [];
  let cursor = 0,
    job;
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: initial };
      return [
        slots[i].value,
        (next) => {
          slots[i].value =
            typeof next === "function" ? next(slots[i].value) : next;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      slots[i] ??= { current: initial };
      return slots[i];
    },
    useCallback: (fn) => fn,
    useTransition() {
      const i = cursor++;
      slots[i] ??= { value: false };
      return [
        slots[i].value,
        (callback) => {
          slots[i].value = true;
          job = Promise.resolve()
            .then(callback)
            .finally(() => {
              slots[i].value = false;
            });
        },
      ];
    },
  };
  return {
    react,
    reset() {
      cursor = 0;
    },
    async settle() {
      await job;
    },
  };
}
function serviceHarness(responses = [], authenticated = true) {
  const calls = [];
  const client = load("src/lib/apis/admin/farmerSmartTimeline.ts", {
    "server-only": {},
    "@/lib/api/request": {
      apiRequest: async (url, options) => {
        calls.push({ url, options: clone(options) });
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    },
  });
  const action = load("src/actions/admin/farmerSmartTimeline.ts", {
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!authenticated) throw new Error("Sign in");
        return {};
      },
    },
    "@/lib/apis/admin/farmerSmartTimeline": client,
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { success: false, message: error.message, errors: error.errors };
      },
    },
  });
  return { calls, generate: action.generateFarmerSmartTimelinePreviewAction };
}
test("read-only preview authenticates, calls only the verified POST endpoint, and allowlists five fields with null variety", async () => {
  const h = serviceHarness([{ status: true, data: preview }]);
  const response = await h.generate({
    ...input,
    farmer_id: 1,
    persist: true,
    locale: "hi",
  });
  assert.equal(response.success, true);
  assert.deepEqual(h.calls, [
    {
      url: "/admin/farmer-smart-timeline/preview",
      options: { method: "POST", data: input },
    },
  ]);
  assert.equal(response.data, preview);
  const denied = serviceHarness([], false);
  assert.equal((await denied.generate(input)).success, false);
  assert.equal(denied.calls.length, 0);
});
test("boundary checks reject unsafe IDs and date formats; Laravel field errors, failures and redirects stay intact", async () => {
  const h = serviceHarness();
  for (const value of [
    null,
    { ...input, crop_id: 0 },
    { ...input, district_id: 1.5 },
    { ...input, crop_variety_id: -1 },
    { ...input, season_id: "4" },
    { ...input, sowing_date: "0000-01-01" },
    { ...input, sowing_date: "2026-1-1" },
    { ...input, sowing_date: "2026-01-01T00:00:00Z" },
  ])
    assert.equal((await h.generate(value)).success, false);
  assert.equal(h.calls.length, 0);
  const errors = {
    sowing_date: ["Invalid date"],
    district_id: ["Select an active district"],
    crop_variety_id: ["Wrong crop"],
  };
  const failed = serviceHarness([
    Object.assign(new Error("Invalid"), { errors }),
    new Error("Unavailable"),
    { status: false, data: preview },
    { status: true, data: { ...preview, preview_only: false } },
  ]);
  assert.deepEqual((await failed.generate(input)).errors, errors);
  for (let i = 0; i < 3; i++)
    assert.equal((await failed.generate(input)).success, false);
  await assert.rejects(
    serviceHarness([
      Object.assign(new Error("NEXT_REDIRECT"), { controlFlow: true }),
    ]).generate(input),
    /NEXT_REDIRECT/,
  );
});
test("an empty successful preview and all structured diagnostics are preserved without cache invalidation", async () => {
  const empty = {
    ...preview,
    growth_stages: [],
    activities: [],
    summary: {
      total_growth_stages: 0,
      total_activities: 0,
      first_date: null,
      last_date: null,
    },
  };
  const result = await serviceHarness([{ status: true, data: empty }]).generate(
    input,
  );
  assert.equal(result.success, true);
  assert.equal(result.data, empty);
  assert.deepEqual(result.data.warnings, preview.warnings);
  // The loader rejects unexpected imports, including next/cache and navigation refresh helpers.
});
test("district options are active-only, district-only, searchable and paginated using existing Region APIs", async () => {
  const calls = [];
  const masterClient = load("src/lib/apis/admin/cropStageTimelines.ts", {
    "server-only": {},
    "@/lib/api/request": {},
    "@/lib/api/ApiError": { ApiError: Error },
    ...Object.fromEntries(
      [
        "crops",
        "seeds",
        "cropStages",
        "cropVarieties",
        "seasons",
        "knowledgeSources",
        "activityCategories",
      ].map((name) => [`@/lib/apis/admin/${name}`, {}]),
    ),
    "@/lib/apis/admin/regions": {
      regionsAPI: {
        list: async (params) => {
          calls.push(clone(params));
          return {
            status: true,
            data: [
              {
                id: 101,
                name: "Jaipur",
                region_type: "district",
                is_active: true,
              },
            ],
            pagination: { current_page: 2, last_page: 3 },
          };
        },
      },
    },
  });
  const page = await masterClient.getTimelineOptions(
    "district",
    null,
    true,
    "Jaipur",
    2,
  );
  assert.deepEqual(calls, [
    {
      keyword: "Jaipur",
      page: 2,
      per_page: 20,
      region_type: "district",
      is_active: 1,
    },
  ]);
  assert.equal(page.options[0].label, "Jaipur");
  assert.equal(page.pagination.last_page, 3);
});
test("events sort by backend calendar dates without mutations, metadata grouping, duplication or loss of unmatched activities", () => {
  const stages = [
    stage,
    { ...stage, crop_stage_id: 2, start_date: "2026-11-01", sequence: 2 },
  ];
  const activities = [
    activity,
    {
      ...activity,
      template_id: 9,
      crop_stage_id: null,
      start_date: "2027-01-01",
    },
    { ...activity, template_id: 10, start_date: "2026-10-31" },
  ];
  const original = clone({ stages, activities });
  const events = display.buildTimelineDisplayEvents(stages, activities);
  assert.deepEqual(
    clone(
      events.map((event) =>
        event.type === "stage"
          ? `s${event.stage.crop_stage_id}`
          : `a${event.activity.template_id}`,
      ),
    ),
    ["a10", "s2", "a8", "s5", "a9"],
  );
  assert.deepEqual({ stages, activities }, original);
  assert.equal(events[3].stage.start_date, stage.start_date);
  assert.equal(display.buildTimelineDisplayEvents([], activities).length, 3);
  assert.equal(display.buildTimelineDisplayEvents(stages, []).length, 2);
});
function formHarness(responses = []) {
  const state = hooks(),
    calls = [],
    errors = [],
    rules = {};
  let values;
  const form = {
    control: {},
    formState: { errors: {}, isSubmitting: false },
    setValue: (key, value) => {
      values[key] = value;
    },
    clearErrors() {},
    setError: (key, error) => errors.push({ key, ...error }),
    handleSubmit: (submit) => () => submit(clone(values)),
  };
  const Form = load(root + "TimelineGeneratorForm.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
      useWatch: () => values,
      useForm: (options) => {
        values ??= clone(options.defaultValues);
        return form;
      },
      useController: ({ name, rules: fieldRules }) => {
        rules[name] = fieldRules;
        return {
          field: {
            name,
            value: values[name],
            onChange: (value) => {
              values[name] = value;
            },
            onBlur() {},
            ref() {},
          },
        };
      },
    },
    "react-hot-toast": { error() {} },
    "@/actions/admin/farmerSmartTimeline": {
      generateFarmerSmartTimelinePreviewAction: async (data) => {
        calls.push(clone(data));
        const next = responses.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    },
    "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
      { __esModule: true, default: "relation" },
    "./TimelinePreview": { __esModule: true, default: "preview" },
  }).default;
  const render = () => {
    state.reset();
    return Form({ choices: {}, initialFailure: "" });
  };
  render();
  return {
    render,
    rules,
    errors,
    calls,
    fill: (next) => {
      values = { ...values, ...next };
    },
    values: () => clone(values),
    settle: state.settle,
    submit: () =>
      findAll(render(), (e) => e.type === "form")[0].props.onSubmit({
        preventDefault() {},
      }),
  };
}
test("required form fields, optional dependent variety and valid historical/future/leap calendar dates use existing controls", () => {
  const h = formHarness();
  const controllers = findAll(h.render(), (e) => e.type === "controller");
  for (const name of ["crop_id", "season_id", "district_id"])
    assert.equal(
      controllers.find((e) => e.props.name === name).props.rules.required,
      "validation.selection",
    );
  const renderField = (name) =>
    findAll(
      h.render(),
      (e) => e.type === "controller" && e.props.name === name,
    )[0].props.render({
      field: {
        value: h.values()[name],
        onChange: (value) => h.fill({ [name]: value }),
      },
    });
  assert.equal(renderField("crop_variety_id").props.disabled, true);
  h.fill({
    crop_id: "3",
    crop_variety_id: "5",
    season_id: "4",
    district_id: "101",
  });
  assert.equal(renderField("crop_variety_id").props.cropId, 3);
  renderField("crop_id").props.onChange("6");
  assert.equal(h.values().crop_variety_id, "");
  assert.equal(h.values().district_id, "101");
  const district = renderField("district_id");
  assert.equal(district.props.kind, "district");
  assert.equal(district.props.clearable, true);
  assert.equal(district.props.required, true);
  for (const date of ["2024-02-29", "1900-01-01", "2099-12-31", "0099-01-01"])
    assert.equal(h.rules.sowing_date.validate(date), true);
  for (const date of [
    "2025-02-29",
    "2026-11-31",
    "0000-01-01",
    "2026-1-1",
    "",
    "2026-13-01",
  ])
    assert.equal(h.rules.sowing_date.validate(date), "validation.date");
});
test("generation prevents duplicates, keeps failed field values for retry, maps 422 fields and preserves date/null variety payloads", async () => {
  const h = formHarness([
    {
      success: false,
      message: "Invalid",
      errors: {
        district_id: ["Inactive"],
        crop_variety_id: ["Wrong crop"],
        sowing_date: ["Invalid"],
      },
    },
    { success: true, data: preview },
  ]);
  h.fill({
    crop_id: "3",
    season_id: "4",
    district_id: "101",
    sowing_date: "2026-11-01",
  });
  const draft = h.values();
  h.submit();
  h.submit();
  assert.equal(
    findAll(h.render(), (e) => e.type === "fieldset")[0].props.disabled,
    true,
  );
  await h.settle();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0], input);
  assert.deepEqual(h.values(), draft);
  assert.deepEqual(h.errors.map((e) => e.key).sort(), [
    "crop_variety_id",
    "district_id",
    "sowing_date",
  ]);
  h.submit();
  await h.settle();
  assert.equal(h.calls.length, 2);
  assert.equal(
    findAll(h.render(), (e) => e.type === "preview")[0].props.data,
    preview,
  );
});
test("changing any of the five inputs hides a stale preview and does not automatically generate", async () => {
  const h = formHarness([{ success: true, data: preview }]);
  h.fill({
    crop_id: "3",
    season_id: "4",
    district_id: "101",
    sowing_date: "2026-11-01",
  });
  h.submit();
  await h.settle();
  const saved = h.values();
  for (const key of Object.keys(saved)) {
    h.fill({ ...saved, [key]: `${saved[key]}1` });
    const element = findAll(h.render(), (e) => e.type === "preview")[0];
    assert.equal(element.props.data, null);
    assert.equal(element.props.stale, true);
    assert.equal(h.calls.length, 1);
  }
});
function previewHarness() {
  const state = hooks();
  const Component = load(root + "TimelinePreview.tsx", {
    ...ui,
    react: state.react,
    "@/hooks/useModal": {
      useModal: () => {
        const [isOpen, setOpen] = state.react.useState(false);
        return {
          isOpen,
          openModal: () => setOpen(true),
          closeModal: () => setOpen(false),
        };
      },
    },
    "./timelineDisplay": display,
    "./TimelineSummary": { __esModule: true, default: "summary" },
    "./TimelineActivityDetails": { __esModule: true, default: "details" },
  }).default;
  return {
    render(data = preview, extra = {}) {
      state.reset();
      return Component({ data, loading: false, stale: false, ...extra });
    },
  };
}
test("timeline renders dynamic stages, returned dates, planned cards and preview badge, and activity details cannot survive a different result", () => {
  const h = previewHarness();
  let tree = h.render();
  const list = findAll(tree, (e) => e.type === "ol")[0];
  assert.equal(list.props.children.length, 2);
  assert.equal(list.props.children[0].key, "activity-8");
  assert.equal(list.props.children[1].key, "stage-5");
  assert.equal(
    findAll(tree, (e) => e.props.children === "statuses.planned").length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.props.children === "previewOnly").length,
    1,
  );
  assert.equal(
    findAll(
      tree,
      (e) =>
        typeof e.props.children === "string" &&
        e.props.children.includes("2026-11-11"),
    ).length > 0,
    true,
  );
  findAll(tree, (e) => e.type === "button")[0].props.onClick();
  tree = h.render();
  assert.equal(
    findAll(tree, (e) => e.type === "details")[0].props.activity,
    activity,
  );
  assert.equal(
    findAll(h.render({ ...preview }), (e) => e.type === "details").length,
    0,
  );
  assert.equal(
    findAll(
      h.render(null, { loading: true }),
      (e) => e.props.role === "status",
    )[0].props.children.includes("generating"),
    true,
  );
});
test("empty, stage-only, activity-only and stale views retain their separate messages and diagnostics data", () => {
  const h = previewHarness();
  for (const [data, message] of [
    [{ ...preview, growth_stages: [] }, "preview.noStages"],
    [{ ...preview, activities: [] }, "preview.noActivities"],
    [{ ...preview, growth_stages: [], activities: [] }, "preview.emptyTitle"],
  ]) {
    const tree = h.render(data);
    assert.equal(findAll(tree, (e) => e.props.children === message).length, 1);
    assert.equal(
      findAll(tree, (e) => e.type === "summary")[0].props.data,
      data,
    );
  }
  assert.equal(
    findAll(
      h.render(null, { stale: true }),
      (e) => e.props.children === "preview.stale",
    ).length,
    1,
  );
});
test("summary uses backend counts and range, all warning contexts display, and details expose only read-only content/source navigation", () => {
  const Summary = load(root + "TimelineSummary.tsx", ui).default;
  const tree = Summary({ data: preview, formatDate: (date) => date });
  assert.equal(
    findAll(tree, (e) => e.props.children === "STAGE_TIMELINE_NOT_FOUND")
      .length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.props.children === "Missing configured stage")
      .length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "dd" && e.props.children === "999").length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "dd" && e.props.children === 1).length,
    2,
  );
  const Details = load(root + "TimelineActivityDetails.tsx", {
    ...ui,
    "@headlessui/react": Object.fromEntries(
      [
        "Dialog",
        "DialogBackdrop",
        "DialogPanel",
        "DialogTitle",
        "Description",
      ].map((name) => [name, name]),
    ),
  }).default;
  const details = Details({
    activity,
    formatDate: (date) => date,
    onClose() {},
  });
  assert.equal(
    findAll(details, (e) => e.props.href === "/admin/knowledge-sources/9")
      .length,
    1,
  );
  assert.equal(
    findAll(details, (e) => e.props.children === "Read-only instructions")
      .length,
    1,
  );
  assert.equal(findAll(details, (e) => e.type === "button").length, 1);
  assert.equal(
    findAll(
      details,
      (e) => e.type === "input" || e.props.dangerouslySetInnerHTML,
    ).length,
    0,
  );
});
test("initial master choices load independently and retryable errors do not block the form; auth control flow is preserved", async () => {
  const calls = [];
  const Content = load(root + "TimelineGeneratorContent.tsx", {
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/auth/dal": { requireAdmin: async () => ({}) },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async (kind) => {
        calls.push(kind);
        if (kind === "district") throw new Error("Unavailable");
        return { options: [] };
      },
    },
    "@/lib/api/handleActionError": {
      handleActionError: async () => ({ message: "Safe retry" }),
    },
    "./TimelineGeneratorForm": { __esModule: true, default: "form" },
  }).default;
  const tree = await Content();
  assert.deepEqual(calls, ["crop", "season", "district"]);
  assert.equal(tree.type, "form");
  assert.equal(tree.props.initialFailure, "Safe retry");
  assert.ok(tree.props.choices.crop);
  assert.equal(tree.props.choices.district, undefined);
});
test("English/Hindi keys and interpolation match, messages compile, and Hindi remains Unicode", () => {
  const { createTranslator } = require("use-intl");
  const messages = ["en", "hi"].map((locale) =>
    require(`../src/messages/${locale}.json`),
  );
  function compare(a, b) {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const key of Object.keys(a)) {
      if (typeof a[key] === "object") compare(a[key], b[key]);
      else {
        const params = (value) =>
          [...value.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]).sort();
        assert.deepEqual(params(a[key]), params(b[key]));
        assert.equal(/\?{2,}|\uFFFD/.test(b[key]), false);
      }
    }
  }
  compare(messages[0].farmerSmartTimeline, messages[1].farmerSmartTimeline);
  assert.match(messages[1].farmerSmartTimeline.title, /[\u0900-\u097f]/);
  for (let i = 0; i < 2; i++) {
    const errors = [];
    const translate = createTranslator({
      locale: i ? "hi" : "en",
      messages: messages[i],
      namespace: "farmerSmartTimeline",
      onError: (error) => errors.push(error.message),
    });
    function visit(object, prefix = "") {
      for (const [key, value] of Object.entries(object)) {
        const full = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object") visit(value, full);
        else
          translate(full, {
            id: 1,
            count: 3,
            start: "01 Nov 2026",
            end: "10 Nov 2026",
            min: 0,
            max: 9,
            crop: "Crop",
            variety: "Variety",
            season: "Season",
            district: "District",
            date: "01 Nov 2026",
            category: "Category",
            schedule: "Schedule",
            title: "Title",
          });
      }
    }
    visit(messages[i].farmerSmartTimeline);
    assert.deepEqual(errors, []);
  }
});
