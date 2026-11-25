const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsxRuntime = require("react/jsx-runtime");

const route =
  "src/app/[locale]/(admin)/admin/(pages)/crop-activity-timeline-builders/";
const clone = (value) => JSON.parse(JSON.stringify(value));
// Unknown UI dependencies resolve to inert stubs; tests target pure logic.
const stub = new Proxy(
  {},
  { get: (_, key) => (key === "__esModule" ? true : () => null) },
);

function load(file, dependencies = {}) {
  const compiled = { exports: {} };
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
    module: compiled,
    exports: compiled.exports,
    structuredClone,
    require: (name) => {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      return stub;
    },
  });
  return compiled.exports;
}

const templateTypes = load("src/types/admin/cropActivityTemplate.ts");
const languages = {
  languages: [
    { id: "en", name: "English", dir: "ltr" },
    { id: "hi", name: "Hindi", dir: "ltr" },
    { id: "mr", name: "Marathi", dir: "ltr" },
  ],
  getLanguage: (id) => ({ id, name: id, dir: "ltr" }),
};
const shared = {
  "@/types/admin/cropActivityTemplate": templateTypes,
  "@/i18n/languages": languages,
};

test("fixed offsets follow the template form: stored as entered with end >= start", () => {
  const schedule = load(`${route}_components/ScheduleFields.tsx`, shared);
  const before = {
    mode: "fixed",
    schedule_type: "before_sowing",
    start: "30",
    end: "60",
  };
  assert.equal(schedule.scheduleError(before, null), null);
  assert.deepEqual(clone(schedule.schedulePayload(before)), {
    schedule_type: "before_sowing",
    schedule_basis: "fixed_offsets",
    start_offset_days: 30,
    end_offset_days: 60,
  });
  assert.deepEqual(
    clone(
      schedule.scheduleValues({
        schedule_type: "before_sowing",
        schedule_basis: "fixed_offsets",
        start_offset_days: 30,
        end_offset_days: 60,
      }),
    ),
    before,
  );
  assert.equal(
    schedule.scheduleError({ ...before, start: "60", end: "30" }, null),
    "order",
  );
  const after = {
    ...before,
    schedule_type: "after_sowing",
    start: "4",
    end: "6",
  };
  assert.equal(schedule.scheduleError(after, null), null);
  assert.equal(schedule.schedulePayload(after).start_offset_days, 4);
  assert.equal(
    schedule.scheduleError({ ...after, start: "35", end: "25" }, null),
    "order",
  );
  for (const bad of ["", "-1", "1.5", "abc"])
    assert.equal(
      schedule.scheduleError({ ...after, start: bad }, null),
      "days",
    );
  assert.equal(
    schedule.scheduleError({ ...after, start: "0", end: "0" }, null),
    null,
  );
});

test("growth stage scheduling needs a stage and sends no offsets", () => {
  const schedule = load(`${route}_components/ScheduleFields.tsx`, shared);
  const stage = {
    mode: "stage",
    schedule_type: "after_sowing",
    start: "",
    end: "",
  };
  assert.equal(schedule.scheduleError(stage, null), "stage");
  assert.equal(schedule.scheduleError(stage, 4), null);
  assert.deepEqual(clone(schedule.schedulePayload(stage)), {
    schedule_type: "after_sowing",
    schedule_basis: "growth_stage",
    start_offset_days: null,
    end_offset_days: null,
  });
  assert.equal(
    schedule.scheduleValues({
      schedule_type: "after_sowing",
      schedule_basis: "growth_stage",
      start_offset_days: null,
      end_offset_days: null,
    }).mode,
    "stage",
  );
});

test("dynamic translations follow the language catalog and required locales, never fixed fields", () => {
  const fields = load(`${route}_components/TranslationFields.tsx`, shared);
  assert.deepEqual(clone(fields.visibleLocales([])), ["en", "hi"]);
  assert.deepEqual(clone(fields.visibleLocales(["mr"])), ["en", "hi", "mr"]);
  assert.deepEqual(Object.keys(fields.emptyTranslations()), ["en", "hi", "mr"]);
  const values = fields.savedTranslations({
    en: { title: "Sow", description: null, instructions: "Line sowing" },
    hi: { title: "बुवाई", description: null, instructions: null },
    fr: { title: "Legacy", description: null, instructions: null },
  });
  assert.equal(values.en.instructions, "Line sowing");
  assert.equal("fr" in values, false, "unconfigured locales are not edited");
  // Optional Marathi stays out of the payload until it has content.
  assert.deepEqual(Object.keys(fields.translationPayload(values)), [
    "en",
    "hi",
  ]);
  values.mr.description = " Notes ";
  const payload = fields.translationPayload(values);
  assert.deepEqual(clone(payload.mr), {
    title: "",
    description: "Notes",
    instructions: null,
  });
  assert.equal(payload.en.description, null);
  const source = fs.readFileSync(
    path.join(__dirname, "..", route, "_components/TranslationFields.tsx"),
    "utf8",
  );
  assert.doesNotMatch(source, /title_en|title_hi|descEn|descHi/);
});

test("Laravel 422 keys route to grouped applicability, schedule and dynamic translation fields", () => {
  const dialog = load(`${route}_components/BuilderDialog.tsx`, shared);
  for (const key of [
    "variety_scope",
    "crop_variety_ids.0",
    "season_ids",
    "region_ids.3",
    "knowledge_source_ids.1",
  ])
    assert.equal(dialog.errorTarget(key), "app");
  for (const key of ["schedule_type", "start_offset_days", "end_offset_days"])
    assert.equal(dialog.errorTarget(key), "schedule");
  assert.equal(dialog.errorTarget("smart_actions.2"), "smart_actions");
  assert.equal(
    dialog.errorTarget("translations.mr.title"),
    "translations.mr.title",
  );
  assert.equal(dialog.errorTarget("crop_variety_idsX"), "crop_variety_idsX");
  const shown = [];
  const message = dialog.applyServerErrors(
    {
      message: "Invalid",
      errors: {
        "season_ids.0": ["Inactive season"],
        priority: ["Bad priority"],
      },
    },
    (target, text) => target === "app" && shown.push(text) > 0,
    "Fallback",
  );
  assert.deepEqual(shown, ["Inactive season"]);
  assert.equal(message, "Bad priority");
  assert.equal(
    dialog.applyServerErrors({ message: "" }, () => false, "Fallback"),
    "Fallback",
  );
});

test("specific applicability requires a selection while All scopes carry none", () => {
  const fields = load(`${route}_components/ApplicabilityFields.tsx`, shared);
  const all = {
    variety_scope: "all",
    crop_variety_ids: [],
    season_scope: "all",
    season_ids: [],
    region_scope: "all",
    region_ids: [],
    knowledge_source_ids: [],
  };
  assert.equal(fields.applicabilityComplete(all), true);
  assert.equal(
    fields.applicabilityComplete({ ...all, variety_scope: "specific" }),
    false,
  );
  assert.equal(
    fields.applicabilityComplete({
      ...all,
      season_scope: "specific",
      season_ids: [2],
    }),
    true,
  );
  assert.equal(
    fields.applicabilityComplete({ ...all, region_scope: "specific" }),
    false,
  );
});

test("section saves resend the saved record with only that section replaced", () => {
  const client = load(`${route}_components/TimelineBuilderClient.tsx`, shared);
  const record = {
    id: 7,
    crop_id: 3,
    category_id: 5,
    crop_stage_id: 4,
    variety_scope: "specific",
    crop_variety_ids: [11, 12],
    season_scope: "all",
    season_ids: [],
    knowledge_source_ids: [9],
    schedule_type: "after_sowing",
    schedule_basis: "fixed_offsets",
    start_offset_days: 4,
    end_offset_days: 6,
    activity_type: "task",
    allow_status_update: true,
    allow_expenses: false,
    allow_labour: false,
    allow_notes: true,
    allow_attachments: false,
    allow_rescheduling: false,
    smart_actions: ["crop_observation"],
    region_scope: "specific",
    region_ids: [101],
    priority: "medium",
    is_active: false,
    translations: {
      en: {
        locale: "en",
        title: "Observe",
        description: null,
        instructions: null,
      },
      hi: {
        locale: "hi",
        title: "निरीक्षण",
        description: null,
        instructions: null,
      },
    },
  };
  const payload = client.recordPayload(record, { priority: "high" });
  assert.equal(payload.priority, "high");
  assert.deepEqual(clone(payload.crop_variety_ids), [11, 12]);
  assert.deepEqual(clone(payload.region_ids), [101]);
  assert.deepEqual(clone(payload.smart_actions), ["crop_observation"]);
  assert.deepEqual(clone(payload.translations.hi), {
    title: "निरीक्षण",
    description: null,
    instructions: null,
  });
  assert.equal("is_active" in payload, false, "status uses the status action");
  assert.equal("id" in payload, false);
  payload.crop_variety_ids.push(99);
  assert.deepEqual(record.crop_variety_ids, [11, 12], "record is not mutated");
});

test("the seven Smart Action groups cover all 39 supported keys exactly once", () => {
  const types = load(`${route}_components/types.ts`, shared);
  const grouped = types.smartActionGroups.flatMap(({ actions }) => actions);
  const group = (name) =>
    clone(types.smartActionGroups.find((entry) => entry.name === name).actions);
  assert.equal(types.smartActionGroups.length, 7);
  assert.equal(grouped.length, 39);
  assert.equal(new Set(grouped).size, 39);
  assert.deepEqual(group("crop"), [
    "crop_details",
    "crop_planning",
    "crop_completion",
    "field_layout_spacing",
    "sowing_planting_method",
  ]);
  assert.deepEqual(group("inputs"), [
    "soil_assessment",
    "soil_test",
    "seed_calculator",
    "seed_record",
    "sowing_record",
    "choose_seed",
  ]);
  for (const legacy of ["choose_crop_variety_seed", "planting_method"])
    assert.equal(templateTypes.templateSmartActions.includes(legacy), false);
  assert.deepEqual(
    [...grouped].sort(),
    [...templateTypes.templateSmartActions].sort(),
  );
  assert.deepEqual(clone(types.featureFlags.map(([flag]) => flag)), [
    "allow_status_update",
    "allow_expenses",
    "allow_labour",
    "allow_notes",
    "allow_attachments",
    "allow_rescheduling",
  ]);
});

function workspaceHarness(admin = true) {
  const requests = [];
  const page = (data, current = 1, last = 1) => ({
    status: true,
    data,
    pagination: { current_page: current, last_page: last },
  });
  const client = (name, pages) => ({
    list: async (params) => {
      requests.push([name, clone(params)]);
      return pages[params.page - 1];
    },
  });
  const actions = load("src/actions/admin/cropActivityTimelineBuilder.ts", {
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new Error("Unauthenticated");
      },
    },
    "@/lib/api/ApiError": { ApiError: Error },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => ({
        success: false,
        message: error.message,
      }),
    },
    "@/lib/apis/admin/crops": {
      cropsAPI: {
        show: async (id) => ({
          status: true,
          data: { id, name: "Mustard", image_url: null, slug: "mustard" },
        }),
      },
    },
    "@/lib/apis/admin/cropStages": {
      cropStagesAPI: client("stages", [
        page([
          { id: 1, name: "Germination", code: "g", sequence: 2, extra: 1 },
        ]),
      ]),
    },
    "@/lib/apis/admin/cropStageTimelines": {
      stageTimelinesAPI: client("timelines", [page([])]),
      getTimelineOption: async (kind, id) => ({
        id,
        label: `Source ${id}`,
        is_active: true,
      }),
    },
    "@/lib/apis/admin/cropActivityTemplates": {
      cropActivityTemplatesAPI: {
        ...client("templates", [
          page([{ id: 1 }], 1, 2),
          page([{ id: 2 }], 2, 2),
        ]),
        show: async (id) => ({ status: true, data: { id } }),
      },
    },
    "@/lib/apis/admin/activityCategories": {
      activityCategoriesAPI: client("categories", [
        page([{ id: 3, name: "Sowing", icon: "sprout", slug: "sowing" }]),
      ]),
    },
    "@/lib/apis/admin/cropVarieties": {
      cropVarietiesAPI: client("varieties", [
        page([{ id: 5, name: null, slug: "pusa-bold", is_active: false }]),
      ]),
    },
    "@/lib/apis/admin/seasons": {
      seasonsAPI: client("seasons", [
        page([{ id: 6, name: "Rabi", slug: "rabi", is_active: true }]),
      ]),
    },
  });
  return { actions, requests };
}

test("the workspace loads every page of crop records through existing endpoints", async () => {
  const h = workspaceHarness();
  const result = await h.actions.loadTimelineWorkspace(3);
  assert.equal(result.success, true);
  assert.deepEqual(
    clone(result.data.templates.map(({ id }) => id)),
    [1, 2],
    "all template pages are read",
  );
  assert.deepEqual(clone(result.data.stages), [
    { id: 1, name: "Germination", code: "g", sequence: 2 },
  ]);
  assert.deepEqual(clone(result.data.varieties), [
    { id: 5, name: "pusa-bold", is_active: false },
  ]);
  const templateRequests = h.requests.filter(([name]) => name === "templates");
  assert.deepEqual(
    templateRequests.map(([, params]) => params),
    [
      { crop_id: 3, page: 1, per_page: 100 },
      { crop_id: 3, page: 2, per_page: 100 },
    ],
  );
  assert.ok(
    h.requests.some(
      ([name, params]) =>
        name === "timelines" && params.status === 1 && params.crop_id === 3,
    ),
  );
});

test("builder lookups authenticate and reject unsafe arguments before contacting Laravel", async () => {
  const h = workspaceHarness();
  for (const id of [0, -1, 1.5, Number.NaN])
    assert.equal((await h.actions.loadTimelineWorkspace(id)).success, false);
  assert.equal((await h.actions.loadTimelineTemplate(0)).success, false);
  assert.equal((await h.actions.loadSourceLabels([1, 0])).success, false);
  assert.equal(h.requests.length, 0);
  const labels = await h.actions.loadSourceLabels([4]);
  assert.deepEqual(clone(labels.data), [
    { id: 4, label: "Source 4", is_active: true },
  ]);
  const anonymous = workspaceHarness(false);
  assert.equal(
    (await anonymous.actions.loadTimelineWorkspace(3)).success,
    false,
  );
  assert.equal(anonymous.requests.length, 0);
});

test("English and Hindi builder messages match, including interpolation parameters", () => {
  const en = require("../src/messages/en.json");
  const hi = require("../src/messages/hi.json");
  function compare(first, second, prefix = "") {
    assert.deepEqual(
      Object.keys(first).sort(),
      Object.keys(second).sort(),
      prefix,
    );
    for (const key of Object.keys(first)) {
      if (typeof first[key] === "object")
        compare(first[key], second[key], `${prefix}${key}.`);
      else {
        const params = (text) =>
          [...text.matchAll(/\{(\w+)(?:[,}])/g)]
            .map((match) => match[1])
            .sort();
        assert.deepEqual(params(first[key]), params(second[key]), prefix + key);
      }
    }
  }
  compare(en.timelineBuilder, hi.timelineBuilder);
  assert.ok(en.sidebar.items.cropActivityTimelineBuilder);
  assert.ok(hi.sidebar.items.cropActivityTimelineBuilder);
});

test("the sidebar links the plural builder route beside Crop Activity Templates", () => {
  const sidebar = fs.readFileSync(
    path.join(__dirname, "..", "src/layout/AppSidebar.tsx"),
    "utf8",
  );
  assert.match(
    sidebar,
    /cropActivityTemplates[\s\S]{0,140}cropActivityTimelineBuilder",\s*path: "\/admin\/crop-activity-timeline-builders"/,
  );
});
