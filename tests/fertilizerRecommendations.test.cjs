const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root =
  "src/app/[locale]/(admin)/admin/(pages)/fertilizer-recommendations/";
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(file, dependencies = {}, globals = {}) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: loadedModule,
    exports: loadedModule.exports,
    URLSearchParams,
    Intl,
    ...globals,
    require(name) {
      if (name === "react/jsx-runtime") return jsx;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  return loadedModule.exports;
}
const ApiError = load("src/lib/api/ApiError.ts").ApiError;

const domain = load("src/types/admin/fertilizerRecommendation.ts");
const payload = {
  crop_id: 3,
  crop_variety_id: null,
  season_id: null,
  recommendation_type: "general",
  irrigation_condition: null,
  soil_condition: null,
  application_method: null,
  reference_code: "FR-01",
  basal_dose_notes: null,
  top_dressing_notes: null,
  general_advisory: null,
  notes: null,
  source_id: 9,
  reference_year: null,
  is_active: false,
  region_scope: "specific",
  region_ids: [12],
  nutrients: [
    {
      nutrient_code: "N",
      recommended_quantity: "80.1250",
      unit_code: "kg",
      area_unit_code: "ha",
    },
  ],
};
const regions = [
  {
    id: 12,
    parent_id: 1,
    name: "Saved inactive",
    region_type: "district",
    is_active: false,
  },
];
const recommendation = {
  ...payload,
  id: 4,
  crop_name: "सरसों",
  crop_variety_name: null,
  season_name: null,
  crop: { id: 3, name: "सरसों" },
  crop_variety: null,
  season: null,
  source_title: "ICAR",
  knowledge_source: { id: 9, title: "ICAR" },
  nutrients: payload.nutrients.map((row, i) => ({
    ...row,
    id: 31 + i,
    created_at: null,
    updated_at: null,
  })),
  regions,
  created_at: null,
  updated_at: null,
  added_at: null,
};
const options = {
  recommendation_types: [{ value: "general", label: "Backend General" }],
  irrigation_conditions: [
    { value: "irrigated", label: "Backend Irrigated" },
    { value: "rainfed", label: "Backend Rainfed" },
  ],
  soil_conditions: [
    { value: "sandy", label: "Backend Sandy" },
    { value: "loamy", label: "Backend Loamy" },
    { value: "clayey", label: "Backend Clayey" },
  ],
  application_methods: [
    { value: "soil_application", label: "Backend Soil application" },
  ],
  nutrient_codes: [
    { value: "N", label: "Backend Nitrogen" },
    { value: "S", label: "Backend Sulphur" },
  ],
  unit_codes: [{ value: "kg", label: "Backend kg" }],
  area_unit_codes: [{ value: "ha", label: "Backend ha" }],
  region_scopes: [
    { value: "all", label: "Backend All" },
    { value: "specific", label: "Backend Specific" },
  ],
  soil_condition_definition: "Backend soil texture definition",
};
const pagination = {
  current_page: 2,
  per_page: 10,
  last_page: 3,
  total: 21,
  from: 11,
  to: 12,
};
const translations = {
  getTranslations: async () => (key, args) =>
    args ? `${key}:${JSON.stringify(args)}` : key,
  getLocale: async () => "hi",
};
const errorHandler = load("src/lib/api/handleActionError.ts", {
  "server-only": {},
  "next/navigation": {
    unstable_rethrow(error) {
      if (error.controlFlow) throw error;
    },
  },
  "next-intl/server": translations,
  "@/lib/api/ApiError": { ApiError },
});
function serviceHarness(responses = [], admin = { is_super_user: true }) {
  const calls = [],
    invalidations = [];
  const service = load("src/lib/apis/admin/fertilizerRecommendations.ts", {
    "server-only": {},
    "@/lib/api/request": {
      apiRequest: async (url, options = {}) => {
        calls.push({ url, options });
        const next = responses.shift();
        if (next instanceof Error || next instanceof ApiError) throw next;
        return next;
      },
    },
  });
  const actions = load("src/actions/admin/fertilizerRecommendations.ts", {
    "next/cache": { revalidatePath: (value) => invalidations.push(value) },
    "next-intl/server": translations,
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new ApiError("Sign in", 401);
        return admin;
      },
    },
    "@/lib/apis/admin/fertilizerRecommendations": service,
    "@/lib/api/handleActionError": errorHandler,
  });
  return {
    service: service.fertilizerRecommendationsAPI,
    actions,
    calls,
    invalidations,
  };
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
function hooks() {
  const slots = [];
  let cursor = 0,
    pending = Promise.resolve();
  return {
    reset() {
      cursor = 0;
    },
    done: () => pending,
    react: {
      useRef(initial) {
        const i = cursor++;
        return (slots[i] ??= { current: initial });
      },
      useState(initial) {
        const i = cursor++;
        slots[i] ??= { value: initial };
        return [
          slots[i].value,
          (value) =>
            (slots[i].value =
              typeof value === "function" ? value(slots[i].value) : value),
        ];
      },
      useEffect() {},
      useTransition: () => [
        false,
        (fn) => {
          pending = Promise.resolve(fn());
        },
      ],
    },
  };
}
const mock = (name) => ({ __esModule: true, default: name });
const ui = {
  "next-intl": {
    useTranslations: () => (key, args) =>
      args ? `${key}:${JSON.stringify(args)}` : key,
    useLocale: () => "en-IN",
  },
  "@/components/admin/common/ComponentCard": mock("card"),
  "@/components/admin/common/FilterSelect": mock("select"),
  "@/components/admin/form/input/InputField": mock("input"),
  "@/components/admin/form/Label": mock("label"),
  "@/components/admin/form/input/TextArea": mock("textarea"),
  "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
    mock("confirm"),
  "@/components/admin/form/switch/Switch": mock("switch"),
  "@/components/admin/ui/badge/Badge": mock("badge"),
  "@/icons": new Proxy({}, { get: (_, key) => key }),
  "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
    mock("relation"),
  "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
    mock("confirm"),
  "@/types/admin/fertilizerRecommendation": domain,
};
const regionModule = load(
  "src/components/admin/common/RegionScopeSelector.tsx",
  { ...ui, "./DistrictCheckboxTree": mock("tree") },
);
const states = [
  {
    id: 1,
    name: "State",
    is_active: true,
    districts: [
      { id: 11, name: "Active", is_active: true },
      { id: 12, name: "Saved inactive", is_active: false },
      { id: 13, name: "New inactive", is_active: false },
    ],
  },
];
function formHarness(
  record = recommendation,
  respond = async () => ({ success: false, message: "Retry" }),
  canReview = true,
  navigationFails = false,
  supportedOptions = options,
) {
  const state = hooks(),
    rules = {},
    errors = [],
    calls = [],
    pushes = [],
    notices = [];
  let values;
  const form = {
    control: {},
    formState: { errors: {}, isSubmitting: false },
    register(name, rule) {
      rules[name] = rule;
      return {
        name,
        onChange: (event) => {
          values[name] = event.target.value;
          rule?.onChange?.(event);
        },
      };
    },
    getValues: (name) =>
      name
        ? name.split(".").reduce((object, key) => object[key], values)
        : values,
    setValue(name, value) {
      values[name] = value;
    },
    setError(name, error) {
      errors.push({ name, ...error });
      form.formState.errors[name] = error;
    },
    clearErrors() {},
    reset(next) {
      values = next;
    },
    handleSubmit: (fn) => () => fn(values),
  };
  const Form = load(root + "_components/FertilizerRecommendationForm.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
      useFieldArray({ name, rules: rule }) {
        rules[name] = rule;
        return {
          fields: values[name].map((row, index) => ({
            ...row,
            id: "row-" + index,
          })),
          append: (row) => values[name].push(row),
          remove: (index) => values[name].splice(index, 1),
        };
      },
      useForm(options) {
        values ??= options.defaultValues;
        return form;
      },
      useWatch: ({ name }) => values[name],
    },
    "@/components/admin/common/RegionScopeSelector": {
      ...mock("regions"),
      validDistrictSelection: regionModule.validDistrictSelection,
    },
    "@/i18n/navigation": {
      useRouter: () => ({
        push: (href) => {
          pushes.push(href);
          if (navigationFails) throw Error("Navigation failed");
        },
      }),
    },
    "react-hot-toast": {
      __esModule: true,
      default: {
        success: (text) => notices.push(text),
        error: (text) => notices.push(text),
      },
    },
    "@/actions/admin/fertilizerRecommendations": {
      saveFertilizerRecommendation: async (...args) => {
        calls.push(args);
        return respond(...args);
      },
    },
  }).default;
  const render = () => {
    state.reset();
    return Form({
      recommendation: record,
      options: supportedOptions,
      choices: {},
      selections: {},
      states,
      canReview,
      maxReferenceYear: 2026,
    });
  };
  render();
  const bind = (name) => {
    const c = findAll(
      render(),
      (e) => e.type === "controller" && e.props.name === name,
    )[0];
    rules[name] = c.props.rules;
    return c.props.render({
      field: {
        value: values[name],
        onChange: (value) => (values[name] = value),
      },
    });
  };
  return {
    render,
    bind,
    values: () => values,
    fill: (next) => Object.assign(values, next),
    rules,
    errors,
    calls,
    pushes,
    notices,
    async submit() {
      findAll(render(), (e) => e.type === "form")[0].props.onSubmit({});
      await state.done();
    },
  };
}

test("recommendation client uses options and six CRUD/status endpoints with exact bodies", async () => {
  const h = serviceHarness();
  await h.service.options();
  await h.service.list({
    recommendation_type: "general",
    is_active: "0",
    page: 2,
  });
  await h.service.show(4);
  await h.service.create(payload);
  await h.service.update(4, payload);
  await h.service.updateStatus(4, false);
  await h.service.delete(4);
  assert.deepEqual(
    h.calls.map((c) => [c.url, c.options.method ?? "GET"]),
    [
      ["/admin/fertilizer-recommendations/options", "GET"],
      ["/admin/fertilizer-recommendations", "GET"],
      ["/admin/fertilizer-recommendations/4", "GET"],
      ["/admin/fertilizer-recommendations", "POST"],
      ["/admin/fertilizer-recommendations/4", "PATCH"],
      ["/admin/fertilizer-recommendations/4/status", "PATCH"],
      ["/admin/fertilizer-recommendations/4", "DELETE"],
    ],
  );
  assert.deepEqual(clone(h.calls[5].options.data), { is_active: false });
  assert.equal(h.calls[6].options.data, undefined);
  assert.equal(h.calls[1].options.params.is_active, "0");
});
test("actions allowlist complete scientific payload and preserve exact quantities; all scope clears districts", async () => {
  const h = serviceHarness(
    Array(2).fill({ status: true, data: recommendation }),
  );
  await h.actions.saveFertilizerRecommendation(null, {
    ...payload,
    sku: "fake",
    fertilizer_id: 5,
    translations: {},
    nutrients: [{ ...payload.nutrients[0], id: 99, content_value: 46 }],
  });
  assert.deepEqual(clone(h.calls[0].options.data), payload);
  await h.actions.saveFertilizerRecommendation(4, {
    ...payload,
    region_scope: "all",
  });
  assert.deepEqual(clone(h.calls[1].options.data.region_ids), []);
  assert.equal(h.invalidations.length, 6);
});
test("mutations authenticate and protect reviewer activation while ordinary users save inactive and deactivate", async () => {
  const anon = serviceHarness([], null);
  await anon.actions.saveFertilizerRecommendation(null, payload);
  await anon.actions.updateFertilizerRecommendationStatus(4, false);
  await anon.actions.deleteFertilizerRecommendation(4);
  assert.equal(anon.calls.length, 0);
  const h = serviceHarness(
    Array(2).fill({ status: true, data: recommendation }),
    { is_super_user: false },
  );
  assert.equal(
    (
      await h.actions.saveFertilizerRecommendation(null, {
        ...payload,
        is_active: true,
      })
    ).success,
    false,
  );
  assert.equal(
    (await h.actions.updateFertilizerRecommendationStatus(4, true)).success,
    false,
  );
  assert.equal(h.calls.length, 0);
  await h.actions.saveFertilizerRecommendation(null, payload);
  await h.actions.updateFertilizerRecommendationStatus(4, false);
  assert.equal(h.calls.length, 2);
});
test("422/409 errors retain fields and conflict messages, 5xx stays private and failures do not invalidate", async () => {
  const fields = {
    "nutrients.0.recommended_quantity": ["Positive"],
    "region_ids.0": ["Inactive"],
  };
  const h = serviceHarness([
    new ApiError("Invalid", 422, fields),
    new ApiError("Scientific conflict", 409),
    new ApiError("Private DB", 503),
  ]);
  assert.deepEqual(
    clone((await h.actions.saveFertilizerRecommendation(4, payload)).errors),
    fields,
  );
  assert.match(
    (await h.actions.updateFertilizerRecommendationStatus(4, true)).message,
    /Scientific/,
  );
  assert.doesNotMatch(
    (await h.actions.deleteFertilizerRecommendation(4)).message,
    /Private/,
  );
  assert.equal(h.invalidations.length, 0);
  const flow = Object.assign(Error("REDIRECT"), { controlFlow: true });
  await assert.rejects(
    serviceHarness([flow]).actions.saveFertilizerRecommendation(4, payload),
    /REDIRECT/,
  );
});
test("create/edit defaults preserve nullable context and saved rows and honor reviewer publication", () => {
  const h = formHarness();
  assert.equal(h.values().reference_year, "");
  assert.equal(h.values().soil_condition, "");
  assert.equal(h.values().season_id, "");
  assert.equal(h.values().nutrients[0].recommended_quantity, "80.1250");
  assert.equal(formHarness(null).values().is_active, true);
  assert.equal(formHarness(null, undefined, false).values().is_active, false);
  h.bind("source_id");
  h.bind("crop_id");
  assert.equal(h.rules.crop_id.required, "validation.required");
  assert.equal(h.rules.source_id.required, "validation.required");
});
test("every classification dropdown validates backend values rather than screenshot examples", () => {
  const custom = {
    ...options,
    recommendation_types: [
      { value: "backend_enabled", label: "Backend enabled type" },
    ],
  };
  const h = formHarness(null, undefined, true, false, custom);
  assert.equal(h.values().recommendation_type, "backend_enabled");
  assert.equal(h.rules.recommendation_type.validate("backend_enabled"), true);
  assert.notEqual(h.rules.recommendation_type.validate("general"), true);
  assert.notEqual(h.rules.recommendation_type.validate("demonstration"), true);
  assert.equal(h.rules.soil_condition.validate("loamy"), true);
  assert.notEqual(h.rules.soil_condition.validate("medium_loam"), true);
  assert.equal(h.rules.irrigation_condition.validate("rainfed"), true);
  assert.notEqual(
    h.rules.application_method.validate("basal_top_dressing"),
    true,
  );
  const text = JSON.stringify(h.render());
  assert.ok(text.includes("Backend enabled type"));
  assert.ok(text.includes("Backend soil texture definition"));
  const empty = formHarness(null, undefined, true, false, {
    ...options,
    recommendation_types: [],
    nutrient_codes: [],
  });
  assert.equal(
    findAll(
      empty.render(),
      (e) => e.type === "button" && e.props.type === "submit",
    )[0].props.disabled,
    true,
  );
});
test("nutrient targets require positive four-decimal quantities, approved units and unique codes", () => {
  const h = formHarness(),
    rule = h.rules["nutrients.0.recommended_quantity"];
  for (const value of ["0.0001", "80.1250", "9999999999.9999"])
    assert.equal(rule.validate(value), true);
  for (const value of ["0", "0.0000", "-1", "1.00001", "10000000000", "1e2"])
    assert.notEqual(rule.validate(value), true, value);
  assert.equal(h.rules["nutrients.0.unit_code"].validate("kg"), true);
  assert.notEqual(h.rules["nutrients.0.unit_code"].validate("g"), true);
  assert.equal(h.rules["nutrients.0.area_unit_code"].validate("ha"), true);
  assert.notEqual(h.rules["nutrients.0.area_unit_code"].validate("acre"), true);
  h.values().nutrients.push({ ...h.values().nutrients[0] });
  assert.notEqual(
    h.rules["nutrients.0.nutrient_code"].validate.unique("N"),
    true,
  );
  assert.notEqual(h.rules.nutrients.validate([]), true);
  assert.equal(
    h.rules.nutrients.maxLength.value,
    options.nutrient_codes.length,
  );
});
test("array add/remove remains local and confirmed, with a single complete nutrient submission", async () => {
  const h = formHarness();
  findAll(
    h.render(),
    (e) => e.type === "button" && e.props.children?.includes?.("nutrients.add"),
  )[0].props.onClick();
  assert.equal(h.values().nutrients.length, 2);
  assert.equal(h.values().nutrients[1].unit_code, "kg");
  findAll(
    h.render(),
    (e) =>
      e.type === "button" &&
      e.props["aria-label"]?.startsWith("nutrients.removeRow"),
  )[0].props.onClick();
  assert.equal(h.values().nutrients.length, 2);
  assert.equal(h.calls.length, 0);
  const dialog = findAll(h.render(), (e) => e.type === "confirm")[0];
  assert.ok(dialog.props.description.includes("Backend Nitrogen"));
  dialog.props.onConfirm();
  assert.equal(h.values().nutrients.length, 1);
  h.values().nutrients[0] = {
    nutrient_code: "S",
    recommended_quantity: "20.0000",
    unit_code: "kg",
    area_unit_code: "ha",
  };
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][1].nutrients[0].recommended_quantity, "20.0000");
});
test("crop changes clear variety without changing nutrients or guidance", () => {
  const h = formHarness({
    ...recommendation,
    crop_variety_id: 23,
    basal_dose_notes: "Keep guidance",
  });
  h.bind("crop_id").props.onChange("8");
  assert.equal(h.values().crop_variety_id, "");
  assert.equal(h.bind("crop_variety_id").props.cropId, 8);
  assert.equal(h.values().nutrients[0].recommended_quantity, "80.1250");
  assert.equal(h.values().basal_dose_notes, "Keep guidance");
});
test("regions preserve saved inactive districts, reject new inactive and clear mappings for All Regions", () => {
  const h = formHarness(),
    binding = h.bind("region_ids");
  assert.equal(binding.type, "regions");
  assert.equal(h.rules.region_ids.validate([12]), true);
  assert.notEqual(h.rules.region_ids.validate([13]), true);
  assert.notEqual(h.rules.region_ids.validate([]), true);
  binding.props.scopeInput.onChange({ target: { value: "all" } });
  assert.deepEqual(clone(h.values().region_ids), []);
  assert.equal(h.rules.region_ids.validate([]), true);
});
test("reference year follows backend UTC maximum and notes/guidance have verified limits", () => {
  const h = formHarness();
  for (const year of ["", "1000", "2024", "2026"])
    assert.equal(h.rules.reference_year.validate(year), true);
  for (const year of ["999", "2027", "10000", "2024.5"])
    assert.notEqual(h.rules.reference_year.validate(year), true);
  h.bind("notes");
  h.bind("basal_dose_notes");
  h.bind("top_dressing_notes");
  h.bind("general_advisory");
  assert.equal(h.rules.notes.maxLength.value, 500);
  assert.equal(h.rules.basal_dose_notes.maxLength.value, 65535);
  assert.equal(h.rules.top_dressing_notes.maxLength.value, 65535);
  assert.equal(h.rules.general_advisory.maxLength.value, 65535);
});
test("nullable context, exact nutrients and guidance newlines submit together through one save", async () => {
  const h = formHarness();
  await h.submit();
  assert.equal(h.calls[0][0], 4);
  assert.deepEqual(clone(h.calls[0][1]), payload);
  h.fill({
    basal_dose_notes: "Line one\nLine two",
    top_dressing_notes: "Top",
    general_advisory: "Guidance",
    reference_year: "2024",
    notes: "Keep note",
  });
  await h.submit();
  assert.equal(h.calls[1][1].basal_dose_notes, "Line one\nLine two");
  assert.equal(h.calls[1][1].reference_year, 2024);
});
test("indexed nutrient/district errors and conflicts retain every draft value for retry", async () => {
  const h = formHarness(recommendation, async () => ({
    success: false,
    message: "Conflict",
    errors: {
      "nutrients.0.unit_code": ["Bad unit"],
      "region_ids.0": ["Inactive"],
      reference_code: ["Taken"],
      notes: ["Too long"],
    },
  }));
  h.fill({ general_advisory: "Keep draft" });
  await h.submit();
  assert.deepEqual(
    h.errors.map((e) => e.name),
    ["nutrients.0.unit_code", "region_ids", "reference_code", "notes"],
  );
  assert.equal(h.values().general_advisory, "Keep draft");
  assert.equal(h.pushes.length, 0);
  await h.submit();
  assert.equal(h.calls[1][0], 4);
});
test("duplicate saves and cancellation are guarded, and successful creates retain the ID across navigation failures", async () => {
  let resolve;
  const h = formHarness(
    recommendation,
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const first = h.submit(),
    second = h.submit();
  findAll(
    h.render(),
    (e) =>
      e.type === "button" &&
      e.props.type === "button" &&
      !e.props["aria-label"],
  )[1]?.props.onClick();
  assert.equal(h.calls.length, 1);
  assert.equal(h.pushes.length, 0);
  resolve({ success: false, message: "Retry" });
  await Promise.all([first, second]);
  const created = formHarness(
    null,
    async () => ({ success: true, data: recommendation }),
    true,
    true,
  );
  created.fill({ crop_id: "3", source_id: "9" });
  await created.submit();
  await created.submit();
  assert.equal(created.calls[0][0], null);
  assert.equal(created.calls[1][0], 4);
  const locked = formHarness(
    { ...recommendation, is_active: true },
    undefined,
    false,
  );
  await locked.submit();
  assert.equal(locked.calls.length, 0);
});

function contentHarness(
  response,
  optionResponse = { status: true, data: options },
) {
  const calls = [],
    redirects = [];
  let optionCalls = 0;
  const Content = load(
    root + "_components/FertilizerRecommendationsContent.tsx",
    {
      "next-intl/server": translations,
      "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
      "@/i18n/navigation": {
        redirect(value) {
          redirects.push(value);
          throw Object.assign(Error("REDIRECT"), { controlFlow: true });
        },
      },
      "@/lib/apis/admin/fertilizerRecommendations": {
        fertilizerRecommendationsAPI: {
          options: async () => {
            optionCalls++;
            return optionResponse;
          },
          list: async (params) => {
            calls.push(params);
            if (response instanceof ApiError) throw response;
            return response;
          },
        },
      },
      "@/lib/apis/admin/cropStageTimelines": {
        getTimelineOptions: async () => ({ options: [], pagination }),
        getTimelineSelections: async () => ({}),
      },
      "@/lib/api/handleActionError": errorHandler,
      "@/lib/api/ApiError": { ApiError },
      "./FertilizerRecommendationsFilters": mock("filters"),
      "./FertilizerRecommendationsList": mock("list"),
    },
  ).default;
  return { Content, calls, redirects, optionCalls: () => optionCalls };
}
test("server listing fetches authoritative options once and keeps only approved URL filters", async () => {
  const h = contentHarness({
    status: true,
    data: [recommendation],
    pagination,
  });
  const tree = await h.Content({
    searchParams: Promise.resolve({
      keyword: " mustard ",
      crop_id: "3",
      crop_variety_id: "23",
      season_id: "2",
      recommendation_type: "general",
      region_scope: "specific",
      is_active: "0",
      page: "2",
    }),
  });
  assert.equal(h.optionCalls(), 1);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(clone(h.calls[0]), {
    keyword: "mustard",
    crop_id: "3",
    crop_variety_id: "23",
    season_id: "2",
    recommendation_type: "general",
    region_scope: "specific",
    is_active: "0",
    page: 2,
    per_page: 10,
  });
  assert.equal(
    findAll(tree, (e) => e.type === "list")[0].props.options,
    options,
  );
  const bad = contentHarness({ status: true, data: [], pagination });
  await bad.Content({
    searchParams: Promise.resolve({
      crop_id: "bad",
      crop_variety_id: "23",
      recommendation_type: "demonstration",
      region_scope: "specific_regions",
    }),
  });
  assert.equal(bad.calls[0].recommendation_type, "");
  assert.equal(bad.calls[0].crop_variety_id, "");
  assert.equal(bad.calls[0].region_scope, "");
});
test("options/list failures render recoverable errors and out-of-range pages retain filters in redirects", async () => {
  const failed = contentHarness(
    { status: true, data: [], pagination },
    { status: false, data: null },
  );
  const tree = await failed.Content({ searchParams: Promise.resolve({}) });
  assert.equal(failed.calls.length, 0);
  assert.equal(findAll(tree, (e) => e.props.role === "alert").length, 1);
  const h = contentHarness({
    status: true,
    data: [],
    pagination: { ...pagination, current_page: 8, last_page: 3 },
  });
  await assert.rejects(
    h.Content({
      searchParams: Promise.resolve({
        page: "8",
        is_active: "0",
        crop_id: "3",
      }),
    }),
    /REDIRECT/,
  );
  assert.equal(h.redirects[0].href.query.is_active, "0");
  assert.equal(h.redirects[0].href.query.page, 3);
  assert.equal(h.redirects[0].locale, "hi");
});
test("seven filters use backend labels, preserve zero and unrelated params, clear variety and reset page", () => {
  const state = hooks(),
    pushes = [];
  let values;
  const Filters = load(
    root + "_components/FertilizerRecommendationsFilters.tsx",
    {
      ...ui,
      react: state.react,
      "react-hook-form": {
        Controller: "controller",
        useForm: (opts) => {
          values ??= opts.defaultValues;
          return {
            control: {},
            register: (name) => ({ name }),
            handleSubmit: (fn) => () => fn(values),
            setValue: (name, value) => {
              values[name] = value;
            },
            reset: (next) => {
              values = next;
            },
          };
        },
        useWatch: ({ name }) => values[name],
      },
      "next/navigation": {
        useSearchParams: () => new URLSearchParams("page=8&extra=keep"),
      },
      "@/i18n/navigation": {
        useRouter: () => ({ push: (href) => pushes.push(href) }),
      },
    },
  ).default;
  const render = () => {
    state.reset();
    return Filters({
      initialFilters: {
        keyword: " mustard ",
        crop_id: "3",
        crop_variety_id: "23",
        season_id: "2",
        recommendation_type: "general",
        region_scope: "specific",
        is_active: "0",
      },
      options,
      choices: {},
      selections: {},
    });
  };
  const tree = render();
  assert.ok(JSON.stringify(tree).includes("Backend General"));
  findAll(tree, (e) => e.type === "form")[0].props.onSubmit();
  const query = new URLSearchParams(pushes[0].split("?")[1]);
  assert.equal(query.get("is_active"), "0");
  assert.equal(query.get("page"), null);
  assert.equal(query.get("recommendation_type"), "general");
  assert.equal(query.get("extra"), "keep");
  findAll(
    render(),
    (e) => e.type === "controller" && e.props.name === "crop_id",
  )[0]
    .props.render({
      field: {
        value: "3",
        onChange: (value) => {
          values.crop_id = value;
        },
      },
    })
    .props.onChange("8");
  assert.equal(values.crop_variety_id, "");
  assert.equal(values.season_id, "2");
  findAll(
    render(),
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  assert.equal(pushes[1], "/admin/fertilizer-recommendations?extra=keep");
});
function editorHarness(record = recommendation, canReview = true) {
  const calls = [];
  const Editor = load(root + "_components/FertilizerRecommendationEditor.tsx", {
    "next-intl/server": translations,
    "next/navigation": {
      notFound() {
        throw Object.assign(Error("NOT_FOUND"), { controlFlow: true });
      },
    },
    "@/lib/auth/dal": {
      requireAdmin: async () => ({ is_super_user: canReview }),
    },
    "@/lib/apis/admin/fertilizerRecommendations": {
      fertilizerRecommendationsAPI: {
        options: async () => {
          calls.push(["options"]);
          return { status: true, data: options };
        },
        show: async (id) => {
          calls.push(["record", id]);
          if (record instanceof ApiError) throw record;
          return { status: true, data: record };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async (kind, crop, eligible) => {
        calls.push([kind, crop, eligible]);
        return { options: [], pagination };
      },
      getTimelineRegions: async (saved) => {
        calls.push(["regions", saved]);
        return states;
      },
      getTimelineSelections: async () => ({}),
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": errorHandler,
    "./FertilizerRecommendationForm": mock("form"),
    "./FertilizerRecommendationDetails": mock("details"),
  }).default;
  return { Editor, calls };
}
test("editor fetches one options response and record, loads dependent crop choices and historical districts", async () => {
  const h = editorHarness({ ...recommendation, crop_variety_id: 23 });
  const tree = await h.Editor({ id: "4" });
  assert.equal(tree.type, "form");
  assert.equal(tree.props.options, options);
  assert.equal(h.calls.filter((c) => c[0] === "options").length, 1);
  assert.equal(h.calls.filter((c) => c[0] === "record").length, 1);
  assert.deepEqual(
    h.calls.find((c) => c[0] === "variety"),
    ["variety", 3, true],
  );
  assert.deepEqual(h.calls.find((c) => c[0] === "regions")[1], regions);
  assert.equal(tree.props.maxReferenceYear, new Date().getUTCFullYear());
});
test("ordinary active edits and detail pages skip master-dropdown requests, retaining Next control flow", async () => {
  const h = editorHarness({ ...recommendation, is_active: true }, false);
  const tree = await h.Editor({ id: "4" });
  assert.equal(findAll(tree, (e) => e.type === "details").length, 1);
  assert.deepEqual(h.calls, [["options"], ["record", 4]]);
  const view = editorHarness();
  await view.Editor({ id: "4", viewOnly: true });
  assert.deepEqual(view.calls, [["options"], ["record", 4]]);
  await assert.rejects(view.Editor({ id: "invalid" }), /NOT_FOUND/);
  await assert.rejects(
    editorHarness(new ApiError("Missing", 404)).Editor({ id: "4" }),
    /NOT_FOUND/,
  );
});
test("listing renders nine columns with real rule code, quantities, nullable context and backend labels", () => {
  const List = load(root + "_components/FertilizerRecommendationsList.tsx", {
    ...ui,
    "@/i18n/navigation": { Link: "link" },
    "@/components/admin/common/UrlPagination": mock("pagination"),
    "@/components/admin/ui/table": {
      Table: "table",
      TableHeader: "thead",
      TableBody: "tbody",
      TableRow: "tr",
      TableCell: "td",
    },
    "./FertilizerRecommendationRowActions": mock("actions"),
  }).default;
  const tree = List({
    result: { data: [recommendation], pagination },
    options,
    filtered: false,
    canReview: false,
  });
  const row = findAll(
    findAll(tree, (e) => e.type === "tbody")[0],
    (e) => e.type === "tr",
  )[0];
  assert.equal(row.props.children.length, 9);
  const text = JSON.stringify(tree);
  for (const value of [
    "सरसों",
    "FR-01",
    "80.125",
    "Backend General",
    "Backend Specific",
    "allVarieties",
    "allSeasons",
  ])
    assert.ok(text.includes(value), value);
  assert.ok(!text.includes("SKU"));
  assert.ok(!text.includes("image"));
  assert.ok(
    JSON.stringify(
      List({
        result: { data: [], pagination },
        options,
        filtered: true,
        canReview: false,
      }),
    ).includes("emptyFiltered"),
  );
});
test("details preserve guidance newlines, saved inactive district labels and actual unit codes", () => {
  const Details = load(
    root + "_components/FertilizerRecommendationDetails.tsx",
    {
      ...ui,
      "@/i18n/navigation": { Link: "link" },
      "./FertilizerRecommendationRowActions": mock("actions"),
    },
  ).default;
  const text = JSON.stringify(
    Details({
      recommendation: {
        ...recommendation,
        basal_dose_notes: "Line one\nLine two",
      },
      options,
      canReview: false,
    }),
  );
  for (const value of [
    "80.1250",
    "kg",
    "ha",
    "Saved inactive",
    "Backend General",
    "allVarieties",
  ])
    assert.ok(text.includes(value), value);
  assert.ok(!text.includes("SKU"));
});
test("shared TextArea forwards form, label and accessibility attributes while preserving its string change callback", () => {
  const TextArea = load("src/components/admin/form/input/TextArea.tsx", {
      react: {},
      "next-intl": ui["next-intl"],
    }).default,
    changed = [],
    ref = () => {};
  const tree = TextArea({
    id: "guidance",
    name: "general_advisory",
    value: "Saved",
    onChange: (value) => changed.push(value),
    onBlur: () => {},
    ref,
    maxLength: 500,
    "aria-describedby": "guidance-error",
  });
  const input = findAll(tree, (e) => e.type === "textarea")[0];
  assert.equal(input.props.id, "guidance");
  assert.equal(input.props.name, "general_advisory");
  assert.equal(input.props.maxLength, 500);
  assert.equal(input.props["aria-describedby"], "guidance-error");
  assert.equal(input.props.ref, ref);
  input.props.onChange({ target: { value: "Changed" } });
  assert.deepEqual(changed, ["Changed"]);
});
test("row permissions protect active recommendations; deletion waits for confirmation and retains conflict errors", async () => {
  const state = hooks(),
    calls = [];
  let resolve;
  const Actions = load(
    root + "_components/FertilizerRecommendationRowActions.tsx",
    {
      ...ui,
      react: state.react,
      "@headlessui/react": {
        Menu: "menu",
        MenuButton: "menuButton",
        MenuItem: "item",
        MenuItems: "items",
      },
      "@/i18n/navigation": { Link: "link", useRouter: () => ({ push() {} }) },
      "@/hooks/useModal": {
        useModal() {
          const [isOpen, open] = state.react.useState(false);
          return {
            isOpen,
            openModal: () => open(true),
            closeModal: () => open(false),
          };
        },
      },
      "react-hot-toast": {
        __esModule: true,
        default: { success() {}, error() {} },
      },
      "@/actions/admin/fertilizerRecommendations": {
        deleteFertilizerRecommendation: (id) => {
          calls.push(["delete", id]);
          return new Promise((done) => (resolve = done));
        },
        updateFertilizerRecommendationStatus: async (id, active) => {
          calls.push(["status", id, active]);
          return { success: true };
        },
      },
    },
  ).default;
  const render = (record = recommendation, canReview = false) => {
    state.reset();
    return Actions({ recommendation: record, canReview });
  };
  assert.equal(
    findAll(
      render({ ...recommendation, is_active: true }),
      (e) => e.type === "link" && e.props.children === "actions.edit",
    ).length,
    0,
  );
  assert.equal(
    findAll(
      render(),
      (e) => e.type === "button" && e.props.children === "actions.activate",
    ).length,
    0,
  );
  findAll(
    render(),
    (e) => e.type === "button" && e.props.children === "actions.delete",
  )[0].props.onClick();
  assert.equal(calls.length, 0);
  const dialog = () => findAll(render(), (e) => e.type === "confirm")[0];
  dialog().props.onConfirm();
  dialog().props.onConfirm();
  dialog().props.onClose();
  assert.equal(calls.length, 1);
  assert.equal(dialog().props.busy, true);
  resolve({ success: false, message: "Referenced recommendation" });
  await new Promise((done) => setImmediate(done));
  assert.match(dialog().props.description, /Referenced/);
  dialog().props.onClose();
  assert.equal(dialog(), undefined);
  findAll(
    render(recommendation, true),
    (e) => e.type === "button" && e.props.children === "actions.activate",
  )[0].props.onClick();
  dialog().props.onConfirm();
  await new Promise((done) => setImmediate(done));
  assert.deepEqual(calls[1], ["status", 4, true]);
});

test("English/Hindi recommendation messages compile and match interpolations without hardcoded option enums", () => {
  const en = JSON.parse(
      fs.readFileSync("src/messages/en.json", "utf8"),
    ).fertilizerRecommendations,
    hi = JSON.parse(
      fs.readFileSync("src/messages/hi.json", "utf8"),
    ).fertilizerRecommendations;
  const { IntlMessageFormat } = require("intl-messageformat");
  function flatten(obj, prefix = "") {
    return Object.entries(obj).flatMap(([key, value]) =>
      typeof value === "object"
        ? flatten(value, prefix + key + ".")
        : [[prefix + key, value]],
    );
  }
  const hindi = new Map(flatten(hi));
  assert.equal(flatten(en).length, hindi.size);
  for (const [key, value] of flatten(en)) {
    assert.equal(typeof hindi.get(key), "string");
    assert.deepEqual(
      hindi
        .get(key)
        .match(/\{\w+\}/g)
        ?.sort(),
      value.match(/\{\w+\}/g)?.sort(),
    );
    new IntlMessageFormat(value, "en");
    new IntlMessageFormat(hindi.get(key), "hi");
    assert.doesNotMatch(hindi.get(key), /\?\?|\uFFFD/);
  }
  assert.match(hi.title, /[\u0900-\u097f]/);
});
