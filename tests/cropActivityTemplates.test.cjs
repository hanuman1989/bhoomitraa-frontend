const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript"),
  jsx = require("react/jsx-runtime");
const root =
  "src/app/[locale]/(admin)/admin/(pages)/crop-activity-templates/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
const languages = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "hi", name: "Hindi", dir: "ltr" },
  { id: "ar", name: "Arabic", dir: "rtl" },
];
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
const domain = load("src/types/admin/cropActivityTemplate.ts");
const pagination = { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 };
const payload = {
  crop_id: 3,
  crop_variety_id: null,
  category_id: 2,
  crop_stage_id: null,
  season_id: 6,
  source_id: 9,
  schedule_type: "after_sowing",
  start_offset_days: 0,
  end_offset_days: 10,
  region_scope: "specific",
  region_ids: [101, 104],
  priority: "medium",
  translations: {
    en: { title: "Field monitoring", description: null, instructions: null },
    hi: { title: "खेत की निगरानी", description: null, instructions: null },
  },
};
const template = {
  ...payload,
  id: 42,
  crop_name: "Wheat",
  crop_variety_name: null,
  category_name: "Monitoring",
  crop_stage_name: null,
  season_name: "Rabi",
  source_title: "ICAR",
  source: null,
  title: "Field monitoring",
  is_active: false,
  regions: [
    { id: 101, parent_id: 1, name: "Jaipur", region_type: "district" },
    { id: 104, parent_id: 1, name: "Legacy", region_type: "district" },
  ],
  added_at: "6 Nov 2026 10:30 AM",
};
const states = [
  {
    id: 1,
    name: "State",
    is_active: true,
    districts: [
      { id: 101, name: "Jaipur", is_active: true },
      { id: 102, name: "Kota", is_active: true },
      { id: 104, name: "Legacy", is_active: false },
    ],
  },
];
function harness(responses = [], admin = { is_super_user: true }) {
  const requests = [],
    invalidations = [];
  async function request(url, options = {}) {
    requests.push({ url, options: clone(options) });
    assert.ok(responses.length, `Unexpected request ${url}`);
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response;
  }
  const client = (endpoint) => ({
    list: (params) => request(`/admin/${endpoint}`, { params }),
    show: (id) => request(`/admin/${endpoint}/${id}`),
  });
  const master = load("src/lib/apis/admin/cropStageTimelines.ts", {
    "server-only": {},
    "@/lib/api/request": { apiRequest: request },
    "@/lib/api/ApiError": { ApiError: Error },
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
    "@/lib/apis/admin/activityCategories": {
      activityCategoriesAPI: client("activity-categories"),
    },
  });
  const service = load("src/lib/apis/admin/cropActivityTemplates.ts", {
    "server-only": {},
    "@/lib/api/request": { apiRequest: request },
    "@/lib/apis/admin/cropStageTimelines": master,
  });
  const actions = load("src/actions/admin/cropActivityTemplates.ts", {
    "next/cache": { revalidatePath: (route) => invalidations.push(route) },
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new Error("Unauthenticated");
        return admin;
      },
    },
    "@/i18n/languages": { languages },
    "@/types/admin/cropActivityTemplate": domain,
    "@/lib/apis/admin/cropActivityTemplates": service,
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { success: false, message: error.message, errors: error.errors };
      },
    },
  });
  return { ...service, master, actions, requests, invalidations };
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
const icons = new Proxy({}, { get: () => () => null });
const ui = {
  "next-intl": { useTranslations: () => (key) => key },
  "@/i18n/navigation": { Link: "link" },
  "@/i18n/languages": {
    languages,
    getLanguage: (id) => languages.find((language) => language.id === id),
  },
  "@/icons": icons,
  "@/types/admin/cropActivityTemplate": domain,
  "@/components/admin/common/ComponentCard": {
    __esModule: true,
    default: "card",
  },
  "@/components/admin/form/input/InputField": {
    __esModule: true,
    default: "input",
  },
  "@/components/admin/form/Label": { __esModule: true, default: "label" },
  "@/components/admin/common/FilterSelect": {
    __esModule: true,
    default: "select",
  },
  "@/components/admin/ui/badge/Badge": { __esModule: true, default: "badge" },
};
const regionModule = load(
  "src/components/admin/common/RegionScopeSelector.tsx",
  { ...ui, "./DistrictCheckboxTree": { __esModule: true, default: "tree" } },
);
function hooks() {
  const values = [];
  let cursor = 0,
    job;
  const react = {
    useRef(initial) {
      const i = cursor++;
      values[i] ??= { current: initial };
      return values[i];
    },
    useState(initial) {
      const i = cursor++;
      values[i] ??= { value: initial };
      return [
        values[i].value,
        (next) => {
          values[i].value =
            typeof next === "function" ? next(values[i].value) : next;
        },
      ];
    },
    useTransition() {
      const i = cursor++;
      values[i] ??= { value: false };
      return [
        values[i].value,
        (callback) => {
          values[i].value = true;
          job = Promise.resolve()
            .then(callback)
            .finally(() => {
              values[i].value = false;
            });
        },
      ];
    },
  };
  return {
    react,
    reset: () => {
      cursor = 0;
    },
    settle: async () => {
      await job;
    },
  };
}

test("template service uses the six verified endpoints with backend filters and body-free deletion", async () => {
  const h = harness(Array(6).fill({ status: true, data: template }));
  await h.cropActivityTemplatesAPI.list({
    keyword: "field",
    crop_id: 3,
    category_id: 2,
    priority: "medium",
    status: "0",
    page: 2,
  });
  await h.cropActivityTemplatesAPI.show(42);
  await h.cropActivityTemplatesAPI.create(payload);
  await h.cropActivityTemplatesAPI.update(42, payload);
  await h.cropActivityTemplatesAPI.updateStatus(42, true);
  await h.cropActivityTemplatesAPI.delete(42);
  assert.deepEqual(
    h.requests.map(({ url, options }) => [url, options.method ?? "GET"]),
    [
      ["/admin/crop-activity-templates", "GET"],
      ["/admin/crop-activity-templates/42", "GET"],
      ["/admin/crop-activity-templates", "POST"],
      ["/admin/crop-activity-templates/42", "PATCH"],
      ["/admin/crop-activity-templates/42/status", "PATCH"],
      ["/admin/crop-activity-templates/42", "DELETE"],
    ],
  );
  assert.equal(h.requests[0].options.params.status, "0");
  assert.equal("data" in h.requests[5].options, false);
});
test("creates stay inactive, preserve zero/null and allowlist all writable translations; edits omit immutable crop and status", async () => {
  const h = harness([
    { status: true, data: template },
    { status: true, data: template },
  ]);
  const values = {
    ...payload,
    is_active: true,
    source: { attachments: ["private"] },
    translations: {
      ...payload.translations,
      ar: { title: "مراقبة", description: "", instructions: "", id: 3 },
      legacy: { title: "Keep in Laravel" },
    },
  };
  assert.equal(
    (await h.actions.saveCropActivityTemplate(null, values)).data.is_active,
    false,
  );
  const sent = h.requests[0].options.data;
  assert.equal(sent.start_offset_days, 0);
  assert.equal(sent.crop_variety_id, null);
  assert.equal(sent.crop_stage_id, null);
  assert.equal("is_active" in sent, false);
  assert.equal("source" in sent, false);
  assert.deepEqual(sent.translations.ar, {
    title: "مراقبة",
    description: "",
    instructions: "",
  });
  assert.equal("legacy" in sent.translations, false);
  assert.equal(h.requests.length, 1);
  await h.actions.saveCropActivityTemplate(42, {
    ...payload,
    region_scope: "all",
  });
  assert.equal("crop_id" in h.requests[1].options.data, false);
  assert.deepEqual(h.requests[1].options.data.region_ids, []);
  assert.equal(h.invalidations.length, 6);
});
test("mutations authenticate and guard unsafe IDs, schedules, integer bounds, duplicate districts and unsupported priorities", async () => {
  const h = harness();
  for (const id of [0, -1, 1.2, NaN, Infinity, "42"]) {
    assert.equal(
      (await h.actions.saveCropActivityTemplate(id, payload)).success,
      false,
    );
    assert.equal(
      (await h.actions.deleteCropActivityTemplate(id)).success,
      false,
    );
    assert.equal(
      (await h.actions.updateCropActivityTemplateStatus(id, true)).success,
      false,
    );
  }
  for (const values of [
    null,
    { ...payload, schedule_type: "after_transplanting" },
    { ...payload, start_offset_days: -1 },
    { ...payload, end_offset_days: 2147483648 },
    { ...payload, end_offset_days: 1.5 },
    { ...payload, start_offset_days: 15 },
    { ...payload, region_ids: [101, 101] },
    { ...payload, region_ids: [] },
    { ...payload, priority: "urgent" },
    { ...payload, translations: [] },
  ])
    assert.equal(
      (await h.actions.saveCropActivityTemplate(null, values)).success,
      false,
    );
  assert.equal(h.requests.length, 0);
  const denied = harness([], null);
  await denied.actions.saveCropActivityTemplate(null, payload);
  await denied.actions.deleteCropActivityTemplate(42);
  await denied.actions.updateCropActivityTemplateStatus(42, true);
  assert.equal(denied.requests.length, 0);
});
test("only reviewers activate; ordinary admins can deactivate and conflicts/field failures remain recoverable", async () => {
  const h = harness([{ status: true, data: template }], {
    is_super_user: false,
  });
  assert.equal(
    (await h.actions.updateCropActivityTemplateStatus(42, true)).message,
    "reviewRequired",
  );
  assert.equal(h.requests.length, 0);
  assert.equal(
    (await h.actions.updateCropActivityTemplateStatus(42, false)).success,
    true,
  );
  assert.deepEqual(h.requests[0].options.data, { is_active: false });
  const errors = {
    "region_ids.1": ["Inactive"],
    "translations.ar.instructions": ["Instructions required"],
  };
  const failed = harness([
    Object.assign(new Error("Invalid"), { errors }),
    Object.assign(new Error("Referenced; deactivate instead"), { status: 409 }),
    { status: false },
  ]);
  assert.deepEqual(
    (await failed.actions.saveCropActivityTemplate(42, payload)).errors,
    errors,
  );
  assert.match(
    (await failed.actions.deleteCropActivityTemplate(42)).message,
    /Referenced/,
  );
  assert.equal(
    (await failed.actions.updateCropActivityTemplateStatus(42, true)).success,
    false,
  );
  assert.equal(failed.invalidations.length, 0);
  const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
    controlFlow: true,
  });
  await assert.rejects(
    harness([redirect]).actions.saveCropActivityTemplate(null, payload),
    /NEXT_REDIRECT/,
  );
});
test("successful status actions retain publication warnings and invalidate list, edit and detail views", async () => {
  const warnings = [
    {
      code: "potential_overlap",
      template_ids: [8],
      message: "Review overlapping templates",
    },
  ];
  const h = harness([
    {
      status: true,
      data: { ...template, is_active: true, publication_warnings: warnings },
    },
  ]);
  assert.deepEqual(
    (await h.actions.updateCropActivityTemplateStatus(42, true)).data
      .publication_warnings,
    warnings,
  );
  assert.equal(h.invalidations.length, 3);
});
test("master-data choices filter category eligibility, depend on crop, page results and exclude source attachments", async () => {
  const response = {
    status: true,
    data: [
      {
        id: 1,
        name: "Name",
        slug: "item",
        code: "code",
        title: "Source",
        crop_id: 3,
        is_active: true,
        verification_status: "verified",
        attachments: ["private"],
      },
    ],
    pagination,
  };
  const h = harness(Array(6).fill(response));
  const choices = await h.getTemplateChoices(3, true);
  assert.equal(choices.category.options[0].label, "Name");
  assert.equal(h.requests[1].url, "/admin/activity-categories");
  assert.equal(h.requests[1].options.params.status, 1);
  assert.equal(h.requests[2].options.params.crop_id, 3);
  assert.equal(h.requests[3].options.params.crop_id, 3);
  assert.equal("attachments" in choices.source.options[0], false);
  assert.equal("data" in choices.source.options[0], false);
  assert.equal(choices.source.options[0].verified, true);
});
test("translation cards require title for populated optional locales, keep text optional and preserve RTL/legacy values", () => {
  const rules = {};
  let content = "";
  const Component = load(
    root + "CropActivityTemplateTranslations.tsx",
    ui,
  ).default;
  const tree = Component({
    locales: ["en", "hi", "ar", "old"],
    savedLocales: ["old"],
    form: {
      register: (name, rule) => {
        rules[name] = rule;
        return { name };
      },
      getValues: () => content,
      trigger() {},
      formState: {
        errors: {
          translations: { ar: { instructions: { message: "Too long" } } },
        },
      },
    },
  });
  assert.equal(findAll(tree, (e) => e.type === "input").length, 4);
  assert.equal(findAll(tree, (e) => e.type === "textarea").length, 8);
  assert.equal(findAll(tree, (e) => e.type === "button").length, 0);
  assert.equal(
    rules["translations.en.title"].required,
    "validation.titleRequired",
  );
  assert.equal(rules["translations.hi.title"].maxLength.value, 200);
  assert.equal(rules["translations.ar.instructions"].required, undefined);
  assert.equal(rules["translations.ar.description"].maxLength.value, 65535);
  assert.equal(rules["translations.ar.title"].validate(""), true);
  content = "Instructions";
  assert.equal(
    rules["translations.ar.title"].validate(""),
    "validation.titleRequired",
  );
  assert.equal(
    findAll(tree, (e) => e.props.name === "translations.ar.instructions")[0]
      .props.dir,
    "rtl",
  );
  assert.equal(
    findAll(tree, (e) => e.props.name === "translations.ar.instructions")[0]
      .props["aria-invalid"],
    true,
  );
  assert.equal(
    findAll(tree, (e) => e.props.name === "translations.old.title")[0].props
      .readOnly,
    true,
  );
});
test("changing the crop resets only dependent fields; crop is immutable on edit, optional relations and offset limits stay correct", () => {
  const rules = {},
    values = {
      crop_id: "3",
      crop_variety_id: "4",
      crop_stage_id: "5",
      source_id: "9",
      season_id: "6",
      start_offset_days: "0",
      region_ids: [104],
    };
  const Component = load(root + "CropActivityTemplateFields.tsx", {
    ...ui,
    "react-hook-form": {
      Controller: "controller",
      useWatch: () => values.crop_id,
    },
    "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
      { __esModule: true, default: "relation" },
  }).default;
  const props = {
    form: {
      control: {},
      register: (name, rule) => {
        rules[name] = rule;
        return { name };
      },
      setValue: (name, value) => (values[name] = value),
      getValues: (name) => values[name],
      clearErrors() {},
      trigger() {},
      formState: { errors: {} },
    },
    choices: {},
    selections: {},
    initialCrop: "3",
    editing: false,
    busy: false,
  };
  const controllers = findAll(Component(props), (e) => e.type === "controller");
  const crop = controllers.find((e) => e.props.name === "crop_id");
  const field = {
    value: values.crop_id,
    onChange: (value) => (values.crop_id = value),
  };
  crop.props.render({ field }).props.onChange("7");
  assert.equal(values.crop_stage_id, "");
  assert.equal(values.crop_variety_id, "");
  assert.equal(values.source_id, "9");
  assert.deepEqual(values.region_ids, [104]);
  assert.equal(
    controllers.find((e) => e.props.name === "season_id").props.rules.required,
    "validation.selection",
  );
  assert.equal(
    controllers.find((e) => e.props.name === "source_id").props.rules.required,
    "validation.selection",
  );
  assert.equal(
    controllers.find((e) => e.props.name === "crop_stage_id").props.rules
      .required,
    undefined,
  );
  assert.equal(rules.start_offset_days.validate("0"), true);
  assert.equal(rules.start_offset_days.validate(""), "validation.days");
  assert.equal(rules.start_offset_days.validate("1.5"), "validation.days");
  assert.equal(
    rules.end_offset_days.validate.integer("2147483648"),
    "validation.days",
  );
  values.start_offset_days = "20";
  assert.equal(rules.end_offset_days.validate.range("10"), "validation.range");
  props.editing = true;
  const editCrop = findAll(
    Component(props),
    (e) => e.props.name === "crop_id",
  )[0].props.render({ field });
  assert.equal(editCrop.props.disabled, true);
  editCrop.props.onChange("9");
  assert.equal(values.crop_id, "7");
});
function formHarness(record, responses, canReview = true) {
  const state = hooks(),
    calls = [],
    fieldErrors = [],
    navigations = [],
    successes = [];
  let values;
  const form = {
    control: {},
    register: (name) => ({ name }),
    getValues: (name) =>
      name.split(".").reduce((data, key) => data[key], values),
    formState: { errors: {}, isSubmitting: false },
    setError: (field, error) => fieldErrors.push({ field, ...error }),
    clearErrors() {},
    reset: (next) => {
      values = clone(next);
    },
    handleSubmit: (submit) => () => submit(clone(values)),
  };
  const Component = load(root + "CropActivityTemplateForm.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
      useWatch: ({ name }) => values[name],
      useForm: (options) => {
        values ??= clone(options.defaultValues);
        return form;
      },
    },
    "react-hot-toast": {
      success: (message) => successes.push(message),
      error() {},
    },
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
    "@/i18n/navigation": {
      useRouter: () => ({ push: (route) => navigations.push(route) }),
    },
    "@/actions/admin/cropActivityTemplates": {
      saveCropActivityTemplate: async (id, data) => {
        calls.push({ id, data: clone(data) });
        return responses.shift();
      },
    },
    "@/components/admin/common/RegionScopeSelector": regionModule,
    "./CropActivityTemplateFields": { __esModule: true, default: "fields" },
    "./CropActivityTemplateTranslations": {
      __esModule: true,
      default: "translations",
    },
    "./CropActivityTemplateConfirmDialog": {
      __esModule: true,
      default: "confirm",
    },
  }).default;
  const render = () => {
    state.reset();
    return Component({
      template: record,
      choices: {},
      selections: {},
      states,
      canReview,
    });
  };
  render();
  return {
    render,
    calls,
    fieldErrors,
    navigations,
    successes,
    values: () => clone(values),
    fill: (next) => {
      values = clone(next);
    },
    submit: async () => {
      findAll(render(), (e) => e.type === "form")[0].props.onSubmit({
        preventDefault() {},
      });
      await state.settle();
    },
  };
}
test("create defaults and catalog resets include every language, preserve zero and optional null IDs and clear All Regions payload IDs", async () => {
  const h = formHarness(null, Array(2).fill({ success: true, data: template }));
  assert.equal(h.values().priority, "medium");
  assert.equal(h.values().schedule_type, "after_sowing");
  assert.deepEqual(h.values().translations.ar, {
    title: "",
    description: "",
    instructions: "",
  });
  h.fill({
    ...h.values(),
    crop_id: "3",
    category_id: "2",
    season_id: "6",
    source_id: "9",
    start_offset_days: "0",
    end_offset_days: "10",
    region_ids: [104],
    translations: {
      en: { title: "Monitoring", description: "", instructions: "" },
      hi: { title: "निगरानी", description: "", instructions: "" },
      ar: { title: "", description: "", instructions: "" },
    },
  });
  await h.submit();
  assert.deepEqual(h.calls[0].data.region_ids, []);
  assert.equal(h.calls[0].data.start_offset_days, 0);
  assert.equal(h.calls[0].data.crop_variety_id, null);
  assert.equal(h.calls[0].data.crop_stage_id, null);
  assert.equal("ar" in h.calls[0].data.translations, false);
  assert.equal("is_active" in h.calls[0].data, false);
  assert.equal(h.values().crop_id, "");
  assert.deepEqual(h.values().translations.ar, {
    title: "",
    description: "",
    instructions: "",
  });
  h.fill({
    ...h.values(),
    crop_id: "3",
    category_id: "2",
    season_id: "6",
    source_id: "9",
    start_offset_days: "0",
    end_offset_days: "1",
    translations: {
      en: { title: "Task", description: "", instructions: "" },
      hi: { title: "कार्य", description: "", instructions: "" },
      ar: { title: "عمل", description: "", instructions: "تفاصيل" },
    },
  });
  await h.submit();
  assert.equal(h.calls[1].id, null);
  assert.equal(h.calls[1].data.translations.ar.instructions, "تفاصيل");
});
test("edit preserves inactive districts and stored extra translations through field failures and retries the same record", async () => {
  const record = {
    ...template,
    translations: {
      ...template.translations,
      ar: { title: "عمل", description: "ماء", instructions: "تفاصيل" },
      legacy: { title: "Retained", description: null, instructions: "Stored" },
    },
  };
  const h = formHarness(record, [
    {
      success: false,
      message: "Invalid",
      errors: {
        "region_ids.1": ["District error"],
        "translations.ar.instructions": ["Too long"],
      },
    },
    { success: true, data: record },
  ]);
  const draft = { ...h.values(), start_offset_days: "1" };
  h.fill(draft);
  await h.submit();
  assert.deepEqual(h.values(), draft);
  assert.ok(h.fieldErrors.some((error) => error.field === "region_ids"));
  assert.ok(
    h.fieldErrors.some(
      (error) => error.field === "translations.ar.instructions",
    ),
  );
  assert.equal(h.navigations.length, 0);
  await h.submit();
  assert.deepEqual(
    h.calls.map((call) => call.id),
    [42, 42],
  );
  assert.deepEqual(h.calls[1].data.region_ids, [101, 104]);
  assert.equal(h.calls[1].data.translations.ar.title, "عمل");
  assert.equal("legacy" in h.calls[1].data.translations, false);
  assert.equal(h.values().translations.legacy.instructions, "Stored");
});
test("template region bindings use the exact shared selector, require Specific districts and retain saved inactive IDs", () => {
  const h = formHarness(template, []);
  const controller = findAll(
    h.render(),
    (e) => e.type === "controller" && e.props.name === "region_ids",
  )[0];
  assert.equal(controller.props.rules.validate([]), "validation.districts");
  assert.equal(controller.props.rules.validate([104]), true);
  assert.equal(controller.props.rules.validate([999]), "validation.districts");
  const binding = controller.props.render({
    field: { value: [104], onChange() {} },
  });
  assert.equal(binding.type, regionModule.default);
  assert.equal(binding.props.scope, "specific");
  assert.equal(
    findAll(regionModule.default(binding.props), (e) => e.type === "tree")
      .length,
    1,
  );
  h.fill({ ...h.values(), region_scope: "all" });
  const all = findAll(
    h.render(),
    (e) => e.type === "controller" && e.props.name === "region_ids",
  )[0];
  assert.equal(all.props.rules.validate([]), true);
  const allBinding = all.props.render({
    field: { value: [104], onChange() {} },
  });
  assert.equal(
    findAll(regionModule.default(allBinding.props), (e) => e.type === "tree")
      .length,
    0,
  );
});
test("active templates are read-only to ordinary admins while deactivation remains available", () => {
  const h = formHarness({ ...template, is_active: true }, [], false);
  const tree = h.render();
  assert.equal(
    findAll(tree, (e) => e.type === "fieldset")[0].props.disabled,
    true,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "button" && e.props.type === "submit")
      .length,
    0,
  );
  assert.equal(
    findAll(
      tree,
      (e) => e.type === "button" && e.props.children === "actions.deactivate",
    ).length,
    1,
  );
});
test("template listing has exactly nine columns, combined crop/variety and backend titles without dates/source columns", () => {
  const List = load(root + "CropActivityTemplateList.tsx", {
    ...ui,
    "@/components/admin/ui/table": {
      Table: "table",
      TableBody: "tbody",
      TableCell: "td",
      TableHeader: "thead",
      TableRow: "tr",
    },
    "@/components/admin/common/UrlPagination": {
      __esModule: true,
      default: "pagination",
    },
    "./CropActivityTemplateRowActions": {
      __esModule: true,
      default: "actions",
    },
  }).default;
  const tree = List({
    result: { data: [template], pagination },
    filtered: false,
    canReview: false,
  });
  assert.deepEqual(
    findAll(tree, (e) => e.props.isHeader).map((e) => e.props.children),
    [
      "fields.title",
      "fields.cropVariety",
      "fields.category",
      "fields.stage",
      "fields.season",
      "fields.schedule",
      "fields.priority",
      "fields.status",
      "fields.actions",
    ],
  );
  const cells = findAll(tree, (e) => e.type === "td" && !e.props.isHeader);
  assert.equal(cells.length, 9);
  assert.equal(
    findAll(cells[1], (e) => e.props.children === "Wheat").length,
    1,
  );
  assert.equal(
    findAll(cells[1], (e) => e.props.children === "allVarieties").length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.props.children === template.added_at).length,
    0,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "actions")[0].props.template.source_id,
    9,
  );
});
test("server filters preserve zero, normalize IDs/priority/page and retain applied filters when redirecting excessive pages", async () => {
  const calls = [];
  const Content = load(root + "CropActivityTemplatesContent.tsx", {
    "next-intl/server": {
      getTranslations: async () => (key) => key,
      getLocale: async () => "hi",
    },
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
    "@/types/admin/cropActivityTemplate": domain,
    "@/lib/apis/admin/cropActivityTemplates": {
      getTemplateChoices: async () => ({}),
      cropActivityTemplatesAPI: {
        list: async (params) => {
          calls.push(clone(params));
          return {
            status: true,
            data: [template],
            pagination: { ...pagination, current_page: params.page },
          };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineSelections: async () => ({}),
    },
    "@/lib/api/ApiError": { ApiError: Error },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        throw error;
      },
    },
    "@/i18n/navigation": {
      redirect: (destination) => {
        throw Object.assign(new Error("Redirect"), { destination });
      },
    },
    "./CropActivityTemplateFilters": { __esModule: true, default: "filters" },
    "./CropActivityTemplateList": { __esModule: true, default: "list" },
  }).default;
  const tree = await Content({
    searchParams: Promise.resolve({
      keyword: ["  field  ", "ignore"],
      crop_id: "3",
      category_id: "-1",
      priority: "bad",
      status: "0",
      page: "bad",
    }),
  });
  assert.equal(calls[0].status, "0");
  assert.equal(calls[0].crop_id, "3");
  assert.equal(calls[0].category_id, "");
  assert.equal(calls[0].priority, "");
  assert.equal(calls[0].keyword, "field");
  assert.equal(calls[0].page, 1);
  assert.equal(
    findAll(tree, (e) => e.type === "list")[0].props.canReview,
    true,
  );
  await assert.rejects(
    Content({
      searchParams: Promise.resolve({
        crop_id: "3",
        priority: "high",
        status: "0",
        page: "9",
      }),
    }),
    (error) => {
      assert.equal(error.destination.href.query.page, 1);
      assert.equal(error.destination.href.query.priority, "high");
      assert.equal(error.destination.href.query.status, "0");
      return true;
    },
  );
});
test("filter crop changes clear dependencies only and URL apply/reset preserve unrelated parameters", async () => {
  const state = hooks(),
    urls = [];
  const Filters = load(root + "CropActivityTemplateFilters.tsx", {
    ...ui,
    react: state.react,
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("page=4&keep=yes"),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (url) => urls.push(url) }),
    },
    "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
      { __esModule: true, default: "relation" },
  }).default;
  const initialFilters = {
    keyword: "field",
    crop_id: "3",
    category_id: "2",
    crop_variety_id: "4",
    crop_stage_id: "5",
    season_id: "6",
    priority: "high",
    status: "0",
  };
  const render = () => {
    state.reset();
    return Filters({ initialFilters, choices: {}, selections: {} });
  };
  let tree = render();
  findAll(tree, (e) => e.props.kind === "crop")[0].props.onChange("8");
  tree = render();
  assert.equal(
    findAll(tree, (e) => e.props.kind === "variety")[0].props.value,
    "",
  );
  assert.equal(
    findAll(tree, (e) => e.props.kind === "stage")[0].props.value,
    "",
  );
  assert.equal(
    findAll(tree, (e) => e.props.kind === "season")[0].props.value,
    "6",
  );
  tree.props.onSubmit({ preventDefault() {} });
  await state.settle();
  let query = new URL(urls[0], "http://localhost").searchParams;
  assert.equal(query.get("status"), "0");
  assert.equal(query.get("priority"), "high");
  assert.equal(query.get("page"), null);
  assert.equal(query.get("keep"), "yes");
  findAll(
    render(),
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  await state.settle();
  query = new URL(urls[1], "http://localhost").searchParams;
  assert.equal(query.size, 1);
  assert.equal(query.get("keep"), "yes");
});
test("row menus retain source/details navigation, enforce reviewer UI and confirm deletion before any mutation", () => {
  const state = hooks();
  const Row = load(root + "CropActivityTemplateRowActions.tsx", {
    ...ui,
    react: state.react,
    "@headlessui/react": {
      Menu: "menu",
      MenuButton: "button",
      MenuItem: "item",
      MenuItems: "items",
    },
    "@/hooks/useModal": {
      useModal: () => ({ isOpen: false, openModal() {}, closeModal() {} }),
    },
    "./CropActivityTemplateConfirmDialog": {
      __esModule: true,
      default: "confirm",
    },
  }).default;
  const render = (record, canReview) => {
    state.reset();
    return Row({ template: record, canReview });
  };
  const active = render({ ...template, is_active: true }, false);
  assert.equal(
    findAll(active, (e) => e.props.href === "/admin/knowledge-sources/9")
      .length,
    1,
  );
  assert.equal(
    findAll(active, (e) => e.props.href === "/admin/crop-activity-templates/42")
      .length,
    1,
  );
  assert.equal(
    findAll(active, (e) => e.props.href?.endsWith("/edit")).length,
    0,
  );
  assert.equal(
    findAll(active, (e) => e.props.children === "actions.activate").length,
    0,
  );
  assert.equal(
    findAll(active, (e) => e.props.children === "actions.deactivate").length,
    1,
  );
  const inactive = render(template, true);
  assert.equal(
    findAll(
      inactive,
      (e) => e.type === "button" && e.props.children === "actions.activate",
    ).length,
    1,
  );
  assert.equal(findAll(inactive, (e) => e.type === "confirm").length, 0);
});
test("confirmation blocks duplicate requests/dismissal, keeps 422 errors open and reports publication warnings on success", async () => {
  const state = hooks(),
    successes = [];
  let calls = 0,
    closed = 0;
  const Confirm = load(root + "CropActivityTemplateConfirmDialog.tsx", {
    ...ui,
    react: state.react,
    "next-intl": {
      useTranslations: () => (key, args) =>
        args?.warnings ? `${key}: ${args.warnings}` : key,
    },
    "@headlessui/react": Object.fromEntries(
      [
        "Dialog",
        "DialogBackdrop",
        "DialogPanel",
        "DialogTitle",
        "Description",
      ].map((id) => [id, id]),
    ),
    "react-hot-toast": {
      success: (message) => successes.push(message),
      error() {},
    },
    "@/actions/admin/cropActivityTemplates": {
      deleteCropActivityTemplate: async () => {
        throw new Error("Unexpected deletion");
      },
      updateCropActivityTemplateStatus: async () =>
        ++calls === 1
          ? {
              success: false,
              message: "Invalid",
              errors: {
                "translations.hi.instructions": ["Instructions required"],
              },
            }
          : {
              success: true,
              message: "Activated",
              data: {
                ...template,
                publication_warnings: [{ message: "Review overlap" }],
              },
            },
    },
  }).default;
  const render = () => {
    state.reset();
    return Confirm({
      template,
      name: "Monitoring",
      operation: "activate",
      onClose: () => closed++,
    });
  };
  let tree = render();
  const button = findAll(
    tree,
    (e) => e.type === "button" && e.props.children === "actions.activate",
  )[0];
  assert.equal(calls, 0);
  button.props.onClick();
  button.props.onClick();
  tree.props.onClose();
  assert.equal(closed, 0);
  await state.settle();
  assert.equal(calls, 1);
  assert.equal(successes.length, 0);
  tree = render();
  assert.match(
    findAll(tree, (e) => e.props.role === "alert")[0].props.children,
    /Instructions required/,
  );
  findAll(
    tree,
    (e) => e.type === "button" && e.props.children === "actions.activate",
  )[0].props.onClick();
  await state.settle();
  assert.equal(closed, 1);
  assert.match(successes[0], /Review overlap/);
});
test("editor and preview load authenticated details, saved regions and source selection, and preserve not-found control flow", async () => {
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  const requests = [],
    regionLoads = [],
    selections = [];
  let response = {
    status: true,
    data: {
      ...template,
      translations: {
        ...template.translations,
        ar: {
          title: "RTL title",
          description: null,
          instructions: "Stored instructions",
        },
      },
    },
  };
  const dependencies = {
    ...ui,
    "next-intl/server": { getTranslations: async () => (key) => key },
    "next/navigation": {
      notFound() {
        throw Object.assign(new Error("NEXT_NOT_FOUND"), { controlFlow: true });
      },
    },
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: false }) },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { success: false, message: "Safe failure" };
      },
    },
    "@/lib/apis/admin/cropActivityTemplates": {
      cropActivityTemplatesAPI: {
        show: async (id) => {
          requests.push(id);
          if (response instanceof Error) throw response;
          return response;
        },
      },
      getTemplateChoices: async () => ({}),
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineRegions: async (regions) => {
        regionLoads.push(regions);
        return states;
      },
      getTimelineSelections: async (choices, ids) => {
        selections.push(clone(ids));
        return { source: { id: 9, label: "ICAR" } };
      },
    },
    "./CropActivityTemplateForm": { __esModule: true, default: "form" },
    "./CropActivityTemplateRowActions": {
      __esModule: true,
      default: "actions",
    },
  };
  const Editor = load(
    root + "CropActivityTemplateEditor.tsx",
    dependencies,
  ).default;
  const Preview = load(
    root + "CropActivityTemplateDetails.tsx",
    dependencies,
  ).default;
  const editor = await Editor({ id: "42" });
  assert.equal(editor.props.canReview, false);
  assert.deepEqual(editor.props.template.region_ids, [101, 104]);
  assert.equal(regionLoads[0], response.data.regions);
  assert.equal(selections[0].source, 9);
  assert.equal(editor.props.selections.source.label, "ICAR");
  const preview = await Preview({ id: "42" });
  assert.equal(
    findAll(preview, (e) => e.props.href === "/admin/knowledge-sources/9")
      .length,
    1,
  );
  assert.equal(
    findAll(preview, (e) => e.props.lang === "ar")[0].props.dir,
    "rtl",
  );
  assert.equal(
    findAll(preview, (e) => e.props.children === "Stored instructions").length,
    1,
  );
  assert.equal(
    findAll(preview, (e) => e.type === "input" || e.type === "textarea").length,
    0,
  );
  assert.equal(
    findAll(preview, (e) => e.type === "actions")[0].props.canReview,
    false,
  );
  for (const Component of [Editor, Preview]) {
    const before = requests.length;
    await assert.rejects(Component({ id: "bad" }), /NEXT_NOT_FOUND/);
    assert.equal(requests.length, before);
    response = new ApiError("Missing", 404);
    await assert.rejects(Component({ id: "42" }), /NEXT_NOT_FOUND/);
    response = new ApiError("Private details must not render", 500);
    assert.equal(
      (await Component({ id: "42" })).props.children,
      "Safe failure",
    );
  }
});

test("English/Hindi template messages have matching keys and interpolation with valid Unicode", () => {
  const en = require("../src/messages/en.json").cropActivityTemplates,
    hi = require("../src/messages/hi.json").cropActivityTemplates;
  function compare(a, b) {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const key of Object.keys(a)) {
      if (typeof a[key] === "object") compare(a[key], b[key]);
      else {
        const args = (value) =>
          [...value.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]).sort();
        assert.deepEqual(args(a[key]), args(b[key]));
        assert.equal(/\?{2,}|\uFFFD/.test(b[key]), false);
      }
    }
  }
  compare(en, hi);
  assert.match(hi.title, /[\u0900-\u097f]/);
});
