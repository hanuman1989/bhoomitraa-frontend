const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/crop-yield-benchmarks/";
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

const domain = load("src/types/admin/cropYieldBenchmark.ts");
const payload = {
  crop_id: 3,
  crop_variety_id: null,
  season_id: null,
  yield_min_kg_ha: "0.000",
  yield_avg_kg_ha: "2000.125",
  yield_max_kg_ha: null,
  benchmark_type: "research_trial",
  reference_year: null,
  source_id: 9,
  region_scope: "specific",
  region_ids: [12],
  notes: null,
  is_active: false,
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
const benchmark = {
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
  regions,
  created_at: null,
  updated_at: null,
  added_at: null,
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
  const service = load("src/lib/apis/admin/cropYieldBenchmarks.ts", {
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
  const actions = load("src/actions/admin/cropYieldBenchmarks.ts", {
    "next/cache": { revalidatePath: (value) => invalidations.push(value) },
    "next-intl/server": translations,
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new ApiError("Sign in", 401);
        return admin;
      },
    },
    "@/lib/apis/admin/cropYieldBenchmarks": service,
    "@/lib/api/handleActionError": errorHandler,
  });
  return {
    service: service.cropYieldBenchmarksAPI,
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
  "@/components/admin/form/switch/Switch": mock("switch"),
  "@/components/admin/ui/badge/Badge": mock("badge"),
  "@/icons": new Proxy({}, { get: (_, key) => key }),
  "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
    mock("relation"),
  "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
    mock("confirm"),
  "@/types/admin/cropYieldBenchmark": domain,
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
  record = benchmark,
  respond = async () => ({ success: false, message: "Retry" }),
  canReview = true,
  navigationFails = false,
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
    getValues: (name) => (name ? values[name] : values),
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
  const Form = load(root + "_components/CropYieldBenchmarkForm.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
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
    "@/actions/admin/cropYieldBenchmarks": {
      saveCropYieldBenchmark: async (...args) => {
        calls.push(args);
        return respond(...args);
      },
    },
  }).default;
  const render = () => {
    state.reset();
    return Form({
      benchmark: record,
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

test("client uses six verified endpoints and status requests contain only is_active", async () => {
  const h = serviceHarness();
  await h.service.list({
    keyword: "mustard",
    crop_id: 3,
    crop_variety_id: 23,
    season_id: 2,
    benchmark_type: "research_trial",
    region_scope: "specific",
    is_active: "0",
    page: 2,
  });
  await h.service.show(4);
  await h.service.create(payload);
  await h.service.update(4, payload);
  await h.service.updateStatus(4, true);
  await h.service.delete(4);
  assert.deepEqual(
    h.calls.map((c) => [c.url, c.options.method ?? "GET"]),
    [
      ["/admin/crop-yield-benchmarks", "GET"],
      ["/admin/crop-yield-benchmarks/4", "GET"],
      ["/admin/crop-yield-benchmarks", "POST"],
      ["/admin/crop-yield-benchmarks/4", "PATCH"],
      ["/admin/crop-yield-benchmarks/4/status", "PATCH"],
      ["/admin/crop-yield-benchmarks/4", "DELETE"],
    ],
  );
  assert.equal(h.calls[0].options.params.is_active, "0");
  assert.deepEqual(clone(h.calls[4].options.data), { is_active: true });
  assert.equal(h.calls[5].options.data, undefined);
});
test("save allowlists scientific fields, preserving zero and null while clearing All Regions", async () => {
  const h = serviceHarness(Array(2).fill({ status: true, data: benchmark }));
  await h.actions.saveCropYieldBenchmark(null, {
    ...payload,
    yield_unit: "q/ha",
    translations: {},
    sku: "fake",
    created_at: "forged",
  });
  assert.deepEqual(clone(h.calls[0].options.data), payload);
  await h.actions.saveCropYieldBenchmark(4, {
    ...payload,
    region_scope: "all",
    yield_avg_kg_ha: "999999999.999",
  });
  assert.deepEqual(clone(h.calls[1].options.data.region_ids), []);
  assert.equal(h.calls[1].options.data.yield_avg_kg_ha, "999999999.999");
  assert.equal(h.invalidations.length, 6);
});
test("all mutations authenticate; ordinary admins save inactive and deactivate, reviewers activate", async () => {
  const anon = serviceHarness([], null);
  await anon.actions.saveCropYieldBenchmark(null, payload);
  await anon.actions.updateCropYieldBenchmarkStatus(4, false);
  await anon.actions.deleteCropYieldBenchmark(4);
  assert.equal(anon.calls.length, 0);
  const h = serviceHarness(Array(2).fill({ status: true, data: benchmark }), {
    is_super_user: false,
  });
  assert.equal(
    (
      await h.actions.saveCropYieldBenchmark(null, {
        ...payload,
        is_active: true,
      })
    ).success,
    false,
  );
  assert.equal(
    (await h.actions.updateCropYieldBenchmarkStatus(4, true)).success,
    false,
  );
  assert.equal(h.calls.length, 0);
  assert.equal(
    (await h.actions.saveCropYieldBenchmark(null, payload)).success,
    true,
  );
  assert.equal(
    (await h.actions.updateCropYieldBenchmarkStatus(4, false)).success,
    true,
  );
  for (const id of [0, -1, 1.2, "4", Infinity])
    assert.equal((await h.actions.deleteCropYieldBenchmark(id)).success, false);
  assert.equal(h.calls.length, 2);
});
test("422/409 errors remain recoverable, 5xx is safe, and failed mutations never revalidate", async () => {
  const fields = {
    yield_min_kg_ha: ["Too high"],
    "region_ids.0": ["Inactive"],
  };
  const h = serviceHarness([
    new ApiError("Invalid", 422, fields),
    new ApiError("Overlapping benchmark", 409),
    new ApiError("Private database", 503),
    { status: false },
  ]);
  const invalid = await h.actions.saveCropYieldBenchmark(4, payload);
  assert.deepEqual(clone(invalid.errors), fields);
  assert.match(
    (await h.actions.updateCropYieldBenchmarkStatus(4, true)).message,
    /Overlapping/,
  );
  assert.doesNotMatch(
    (await h.actions.deleteCropYieldBenchmark(4)).message,
    /Private/,
  );
  assert.equal(
    (await h.actions.saveCropYieldBenchmark(4, payload)).success,
    false,
  );
  assert.equal(h.invalidations.length, 0);
  const flow = Object.assign(Error("REDIRECT"), { controlFlow: true });
  await assert.rejects(
    serviceHarness([flow]).actions.saveCropYieldBenchmark(4, payload),
    /REDIRECT/,
  );
});
test("successful delete revalidates affected pages only after backend success", async () => {
  const h = serviceHarness([{ status: true, data: null, message: "Deleted" }]);
  assert.equal(
    (await h.actions.deleteCropYieldBenchmark(4)).message,
    "Deleted",
  );
  assert.equal(h.invalidations.length, 3);
  assert.ok(h.invalidations.every((p) => p.includes("crop-yield-benchmarks")));
});
test("create defaults honor reviewer permissions and edit defaults preserve null and decimal zero", () => {
  const fresh = formHarness(null),
    ordinary = formHarness(null, undefined, false),
    edit = formHarness();
  assert.equal(fresh.values().is_active, true);
  assert.equal(ordinary.values().is_active, false);
  assert.equal(fresh.values().benchmark_type, "research_trial");
  assert.equal(edit.values().yield_min_kg_ha, "0.000");
  assert.equal(edit.values().yield_max_kg_ha, "");
  assert.equal(edit.values().reference_year, "");
  assert.equal(edit.values().crop_variety_id, "");
  assert.equal(edit.values().season_id, "");
  edit.bind("source_id");
  edit.bind("crop_id");
  edit.bind("crop_variety_id");
  edit.bind("season_id");
  assert.equal(edit.rules.crop_id.required, "validation.required");
  assert.equal(edit.rules.source_id.required, "validation.required");
  assert.equal(edit.rules.crop_variety_id.validate(""), true);
  assert.equal(edit.rules.season_id.validate(""), true);
  assert.equal(edit.rules.yield_avg_kg_ha.required, "validation.required");
  assert.equal(edit.rules.notes.maxLength.value, 65535);
  const unit = findAll(
    edit.render(),
    (e) => e.type === "input" && e.props.id === "benchmark-unit",
  )[0];
  assert.equal(unit.props.readOnly, true);
  assert.equal(unit.props.value, "kg/ha");
  assert.equal(unit.props.name, undefined);
});
test("yield precision and decimal limit match Laravel, average is positive and bounds allow zero", () => {
  const h = formHarness();
  for (const value of ["0.001", "2000", "2000.125", "999999999.999"])
    assert.equal(h.rules.yield_avg_kg_ha.validate(value), true);
  for (const value of [
    "0",
    "0.000",
    "-1",
    "1.0001",
    "1000000000",
    "1e2",
    "Infinity",
    "NaN",
    "1,000",
  ])
    assert.notEqual(h.rules.yield_avg_kg_ha.validate(value), true, value);
  for (const name of ["yield_min_kg_ha", "yield_max_kg_ha"]) {
    assert.equal(h.rules[name].validate.decimal(""), true);
    assert.equal(h.rules[name].validate.decimal("0.000"), true);
    assert.notEqual(h.rules[name].validate.decimal("-0.001"), true);
  }
});
test("minimum/average/maximum comparisons handle omitted/equal bounds and largest allowed precision", () => {
  const h = formHarness();
  assert.equal(h.rules.yield_min_kg_ha.validate.range(""), true);
  assert.equal(h.rules.yield_min_kg_ha.validate.range("2000.125"), true);
  assert.notEqual(h.rules.yield_min_kg_ha.validate.range("2000.126"), true);
  assert.equal(h.rules.yield_max_kg_ha.validate.range("2000.125"), true);
  assert.notEqual(h.rules.yield_max_kg_ha.validate.range("2000.124"), true);
  h.fill({ yield_avg_kg_ha: "999999999.999" });
  assert.equal(h.rules.yield_min_kg_ha.validate.range("999999999.998"), true);
  assert.notEqual(
    h.rules.yield_max_kg_ha.validate.range("999999999.998"),
    true,
  );
  assert.deepEqual(clone(h.rules.yield_avg_kg_ha.deps), [
    "yield_min_kg_ha",
    "yield_max_kg_ha",
  ]);
});
test("year is optional, four digits and no later than backend UTC year; type cannot be invented", () => {
  const h = formHarness();
  for (const year of ["", "1000", "2024", "2026"])
    assert.equal(h.rules.reference_year.validate(year), true);
  for (const year of ["999", "0001", "2027", "10000", "2024.5", "20e2"])
    assert.notEqual(h.rules.reference_year.validate(year), true, year);
  for (const type of domain.yieldBenchmarkTypes)
    assert.equal(h.rules.benchmark_type.validate(type), true);
  assert.notEqual(h.rules.benchmark_type.validate("other"), true);
  assert.equal(h.rules.benchmark_type.required, "validation.required");
});
test("crop change clears only variety, reloads scoped choices and retains scientific values", () => {
  const h = formHarness({ ...benchmark, crop_variety_id: 23, season_id: 2 });
  h.bind("crop_id").props.onChange("8");
  assert.equal(h.values().crop_variety_id, "");
  assert.equal(h.values().season_id, "2");
  assert.equal(h.values().yield_avg_kg_ha, "2000.125");
  assert.equal(h.bind("crop_variety_id").props.cropId, 8);
  assert.equal(h.bind("crop_variety_id").props.initialSelection, null);
});
test("district selector keeps saved inactive districts, blocks newly inactive and clears mappings for All Regions", () => {
  const h = formHarness(),
    binding = h.bind("region_ids");
  assert.equal(binding.type, "regions");
  assert.equal(h.rules.region_ids.validate([12]), true);
  assert.notEqual(h.rules.region_ids.validate([13]), true);
  assert.notEqual(h.rules.region_ids.validate([]), true);
  assert.notEqual(h.rules.region_ids.validate([11, 11]), true);
  binding.props.scopeInput.onChange({ target: { value: "all" } });
  assert.deepEqual(clone(h.values().region_ids), []);
  assert.equal(h.rules.region_ids.validate([]), true);
  binding.props.scopeInput.onChange({ target: { value: "specific" } });
  assert.notEqual(h.rules.region_ids.validate([]), true);
});
test("form submits exact decimal strings, nullable context and optional notes without a yield_unit field", async () => {
  const h = formHarness();
  await h.submit();
  assert.equal(h.calls[0][0], 4);
  assert.deepEqual(clone(h.calls[0][1]), payload);
  h.fill({
    crop_variety_id: "23",
    season_id: "2",
    reference_year: "2024",
    notes: " Notes ",
  });
  await h.submit();
  assert.equal(h.calls[1][1].reference_year, 2024);
  assert.equal(h.calls[1][1].notes, "Notes");
  assert.equal(h.calls[1][1].crop_variety_id, 23);
  assert.equal(h.calls[1][1].season_id, 2);
  assert.equal(h.calls[1][1].yield_unit, undefined);
});
test("backend field errors and overlap conflicts retain the whole draft and retry the existing ID", async () => {
  const h = formHarness(benchmark, async () => ({
    success: false,
    message: "Overlapping benchmark",
    errors: {
      "region_ids.0": ["Inactive"],
      yield_min_kg_ha: ["Too high"],
      reference_year: ["Future"],
      source_id: ["Not eligible"],
    },
  }));
  h.fill({
    yield_min_kg_ha: "0.125",
    notes: "Keep draft",
    reference_year: "2024",
  });
  await h.submit();
  assert.deepEqual(
    h.errors.map((e) => e.name),
    ["region_ids", "yield_min_kg_ha", "reference_year", "source_id"],
  );
  assert.equal(h.values().notes, "Keep draft");
  assert.equal(h.values().yield_min_kg_ha, "0.125");
  assert.deepEqual(clone(h.values().region_ids), [12]);
  assert.equal(h.pushes.length, 0);
  await h.submit();
  assert.equal(h.calls[1][0], 4);
});
test("successful create retains its ID when navigation fails and All Regions submits no districts", async () => {
  const h = formHarness(
    null,
    async () => ({ success: true, data: benchmark }),
    true,
    true,
  );
  h.fill({
    crop_id: "3",
    source_id: "9",
    yield_avg_kg_ha: "2000.125",
    region_scope: "all",
    region_ids: [12],
  });
  await h.submit();
  assert.equal(h.calls[0][0], null);
  assert.deepEqual(clone(h.calls[0][1].region_ids), []);
  await h.submit();
  assert.equal(h.calls[1][0], 4);
});
test("pending save guards duplicate submissions and cancellation; ordinary active edits stay locked", async () => {
  let resolve;
  const h = formHarness(
    benchmark,
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const first = h.submit();
  const second = h.submit();
  findAll(
    h.render(),
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  assert.equal(h.calls.length, 1);
  assert.equal(h.pushes.length, 0);
  resolve({ success: false, message: "Retry" });
  await Promise.all([first, second]);
  const locked = formHarness(
    { ...benchmark, is_active: true },
    undefined,
    false,
  );
  await locked.submit();
  assert.equal(locked.calls.length, 0);
  assert.equal(locked.bind("is_active").props.disabled, true);
});
test("filters preserve all seven values and inactive zero, reset page, clear variety on crop change and reset controls", () => {
  const state = hooks(),
    pushes = [];
  let values;
  const Filters = load(root + "_components/CropYieldBenchmarksFilters.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
      useForm(options) {
        values ??= options.defaultValues;
        return {
          control: {},
          register: (name) => ({ name }),
          handleSubmit: (fn) => () => fn(values),
          setValue: (name, value) => (values[name] = value),
          reset: (next) => (values = next),
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
  }).default;
  const render = () => {
    state.reset();
    return Filters({
      initialFilters: {
        keyword: " seed ",
        crop_id: "3",
        crop_variety_id: "23",
        season_id: "2",
        benchmark_type: "research_trial",
        region_scope: "specific",
        is_active: "0",
      },
      choices: {},
      selections: {},
    });
  };
  findAll(render(), (e) => e.type === "form")[0].props.onSubmit();
  const query = new URLSearchParams(pushes[0].split("?")[1]);
  for (const [key, value] of Object.entries({
    keyword: "seed",
    crop_id: "3",
    crop_variety_id: "23",
    season_id: "2",
    benchmark_type: "research_trial",
    region_scope: "specific",
    is_active: "0",
    extra: "keep",
  }))
    assert.equal(query.get(key), value);
  assert.equal(query.get("page"), null);
  findAll(
    render(),
    (e) => e.type === "controller" && e.props.name === "crop_id",
  )[0]
    .props.render({
      field: { value: "3", onChange: (value) => (values.crop_id = value) },
    })
    .props.onChange("8");
  assert.equal(values.crop_variety_id, "");
  assert.equal(values.season_id, "2");
  findAll(
    render(),
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  assert.equal(pushes[1], "/admin/crop-yield-benchmarks?extra=keep");
  assert.equal(values.crop_id, "");
});
function contentHarness(response) {
  const calls = [],
    redirects = [];
  const Content = load(root + "_components/CropYieldBenchmarksContent.tsx", {
    "next-intl/server": translations,
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
    "@/i18n/navigation": {
      redirect(value) {
        redirects.push(value);
        throw Object.assign(Error("REDIRECT"), { controlFlow: true });
      },
    },
    "@/lib/apis/admin/cropYieldBenchmarks": {
      cropYieldBenchmarksAPI: {
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
    "@/types/admin/cropYieldBenchmark": domain,
    "./CropYieldBenchmarksFilters": mock("filters"),
    "./CropYieldBenchmarksList": mock("list"),
  }).default;
  return { Content, calls, redirects };
}
test("server listing normalizes URL values, drops variety without crop and shows load failures", async () => {
  const h = contentHarness({ status: true, data: [benchmark], pagination });
  const tree = await h.Content({
    searchParams: Promise.resolve({
      keyword: " seed ",
      crop_id: "3",
      crop_variety_id: "23",
      season_id: "2",
      benchmark_type: "research_trial",
      region_scope: "specific",
      is_active: "0",
      page: "2",
    }),
  });
  assert.deepEqual(clone(h.calls[0]), {
    keyword: "seed",
    crop_id: "3",
    crop_variety_id: "23",
    season_id: "2",
    benchmark_type: "research_trial",
    region_scope: "specific",
    is_active: "0",
    page: 2,
    per_page: 10,
  });
  assert.equal(findAll(tree, (e) => e.type === "list").length, 1);
  assert.equal(h.calls.length, 1);
  const failed = contentHarness(new ApiError("Private", 503));
  const failure = await failed.Content({
    searchParams: Promise.resolve({
      crop_id: "bad",
      crop_variety_id: "23",
      benchmark_type: "invalid",
      region_scope: "specific_regions",
    }),
  });
  assert.equal(failed.calls[0].crop_variety_id, "");
  assert.equal(failed.calls[0].region_scope, "");
  assert.equal(findAll(failure, (e) => e.props.role === "alert").length, 1);
});
test("out-of-range pages redirect with filters and preserve Next control flow", async () => {
  const h = contentHarness({
    status: true,
    data: [],
    pagination: { ...pagination, current_page: 8, last_page: 3 },
  });
  await assert.rejects(
    h.Content({
      searchParams: Promise.resolve({
        page: "8",
        crop_id: "3",
        is_active: "0",
      }),
    }),
    /REDIRECT/,
  );
  assert.equal(h.redirects[0].locale, "hi");
  assert.equal(h.redirects[0].href.query.page, 3);
  assert.equal(h.redirects[0].href.query.is_active, "0");
});

function editorHarness(record = benchmark, canReview = true) {
  const calls = [];
  const Editor = load(root + "_components/CropYieldBenchmarkEditor.tsx", {
    "next-intl/server": translations,
    "next/navigation": {
      notFound() {
        throw Object.assign(Error("NOT_FOUND"), { controlFlow: true });
      },
    },
    "@/lib/auth/dal": {
      requireAdmin: async () => ({ is_super_user: canReview }),
    },
    "@/lib/apis/admin/cropYieldBenchmarks": {
      cropYieldBenchmarksAPI: {
        show: async (id) => {
          calls.push(["benchmark", id]);
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
      getTimelineSelections: async (_choices, ids) => {
        calls.push(["selections", ids]);
        return {};
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": errorHandler,
    "./CropYieldBenchmarkForm": mock("form"),
    "./CropYieldBenchmarkDetails": mock("details"),
  }).default;
  return { Editor, calls };
}
test("editor reads the record once, preloads dependent choices and preserves historical districts and blank year", async () => {
  const h = editorHarness({ ...benchmark, crop_variety_id: 23 });
  const tree = await h.Editor({ id: "4" });
  assert.equal(tree.type, "form");
  assert.equal(tree.props.benchmark.reference_year, null);
  assert.equal(tree.props.maxReferenceYear, new Date().getUTCFullYear());
  assert.deepEqual(
    h.calls.filter((c) => c[0] === "benchmark"),
    [["benchmark", 4]],
  );
  assert.deepEqual(
    h.calls.find((c) => c[0] === "variety"),
    ["variety", 3, true],
  );
  assert.deepEqual(h.calls.find((c) => c[0] === "regions")[1], regions);
  assert.equal(h.calls.find((c) => c[0] === "selections")[1].variety, 23);
});
test("view and ordinary active edit avoid option reads; invalid/deleted records keep Next not-found behavior", async () => {
  const locked = editorHarness({ ...benchmark, is_active: true }, false);
  const tree = await locked.Editor({ id: "4" });
  assert.equal(findAll(tree, (e) => e.type === "details").length, 1);
  assert.equal(findAll(tree, (e) => e.props.role === "status").length, 1);
  assert.deepEqual(locked.calls, [["benchmark", 4]]);
  const view = editorHarness();
  await view.Editor({ id: "4", viewOnly: true });
  assert.deepEqual(view.calls, [["benchmark", 4]]);
  await assert.rejects(
    editorHarness(new ApiError("Missing", 404)).Editor({ id: "4" }),
    /NOT_FOUND/,
  );
  await assert.rejects(view.Editor({ id: "invalid" }), /NOT_FOUND/);
});
test("table groups three yield columns and renders twelve cells without fake SKU, image or missing bounds", () => {
  const List = load(root + "_components/CropYieldBenchmarksList.tsx", {
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
    "./CropYieldBenchmarkRowActions": mock("actions"),
  }).default;
  const render = (data, filtered = false) =>
    List({ result: { data, pagination }, filtered, canReview: false });
  const tree = render([
    benchmark,
    {
      ...benchmark,
      id: 5,
      yield_min_kg_ha: null,
      yield_avg_kg_ha: "999999999.999",
      yield_max_kg_ha: "999999999.999",
    },
  ]);
  const headers = findAll(tree, (e) => e.type === "thead")[0].props.children;
  assert.equal(headers.length, 2);
  assert.equal(headers[0].props.children.length, 10);
  assert.equal(headers[1].props.children.length, 3);
  assert.equal(
    findAll(headers[0], (e) => e.props.colSpan === 3)[0].props.scope,
    "colgroup",
  );
  assert.equal(findAll(headers[0], (e) => e.props.rowSpan === 2).length, 9);
  const rows = findAll(
    findAll(tree, (e) => e.type === "tbody")[0],
    (e) => e.type === "tr",
  );
  assert.equal(rows[0].props.children.length, 12);
  assert.equal(rows[1].props.children.length, 12);
  assert.equal(rows[0].props.children[0].props.children, 11);
  assert.equal(rows[0].props.children[4].props.children, "0");
  assert.equal(rows[0].props.children[6].props.children, "notAvailable");
  assert.equal(rows[1].props.children[5].props.children, "99,99,99,999.999");
  const text = JSON.stringify(tree);
  assert.ok(text.includes("सरसों"));
  assert.ok(text.includes("allVarieties"));
  assert.ok(text.includes("allSeasons"));
  assert.ok(!text.includes("sku"));
  assert.ok(!text.includes("image"));
  assert.ok(JSON.stringify(render([], true)).includes("emptyFiltered"));
  assert.ok(JSON.stringify(render([])).includes("empty"));
});
test("shared TableCell forwards grouped header spans and leaves ordinary cells unchanged", () => {
  const cells = load("src/components/admin/ui/table/index.tsx", { react: {} });
  const ordinary = cells.TableCell({ children: "value" });
  assert.equal(ordinary.type, "td");
  assert.equal(ordinary.props.colSpan, undefined);
  assert.equal(ordinary.props.rowSpan, undefined);
  const group = cells.TableCell({
    children: "Yields",
    isHeader: true,
    colSpan: 3,
    scope: "colgroup",
  });
  assert.equal(group.type, "th");
  assert.equal(group.props.colSpan, 3);
  assert.equal(group.props.scope, "colgroup");
  const column = cells.TableCell({
    children: "Crop",
    isHeader: true,
    rowSpan: 2,
    scope: "col",
  });
  assert.equal(column.props.rowSpan, 2);
});
test("details show backend names, nullable context, exact yields and saved inactive districts", () => {
  const Details = load(root + "_components/CropYieldBenchmarkDetails.tsx", {
    ...ui,
    "@/i18n/navigation": { Link: "link" },
    "./CropYieldBenchmarkRowActions": mock("actions"),
  }).default;
  const text = JSON.stringify(Details({ benchmark, canReview: false }));
  assert.ok(text.includes("सरसों"));
  assert.ok(text.includes("Saved inactive"));
  assert.ok(text.includes("inactive"));
  assert.ok(text.includes("2000.125"));
  assert.ok(text.includes("allVarieties"));
  assert.ok(text.includes("allSeasons"));
  assert.ok(!text.includes("image"));
  assert.ok(!text.includes("SKU"));
});
test("row permissions protect active benchmarks; deletion waits for confirmation and retains conflict errors", async () => {
  const state = hooks(),
    calls = [];
  let resolve;
  const Actions = load(root + "_components/CropYieldBenchmarkRowActions.tsx", {
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
    "@/actions/admin/cropYieldBenchmarks": {
      deleteCropYieldBenchmark: (id) => {
        calls.push(["delete", id]);
        return new Promise((done) => (resolve = done));
      },
      updateCropYieldBenchmarkStatus: async (id, active) => {
        calls.push(["status", id, active]);
        return { success: true };
      },
    },
  }).default;
  const render = (record = benchmark, canReview = false) => {
    state.reset();
    return Actions({ benchmark: record, canReview });
  };
  assert.equal(
    findAll(
      render({ ...benchmark, is_active: true }),
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
    render(benchmark, true),
    (e) => e.type === "button" && e.props.children === "actions.activate",
  )[0].props.onClick();
  dialog().props.onConfirm();
  await new Promise((done) => setImmediate(done));
  assert.deepEqual(calls[1], ["status", 4, true]);
});

test("English/Hindi keys, interpolations and enum labels match without replacement characters", () => {
  const en = JSON.parse(fs.readFileSync("src/messages/en.json", "utf8"));
  const hi = JSON.parse(fs.readFileSync("src/messages/hi.json", "utf8"));
  function flatten(object, prefix = "") {
    return Object.entries(object).flatMap(([key, value]) =>
      typeof value === "object"
        ? flatten(value, prefix + key + ".")
        : [[prefix + key, value]],
    );
  }
  const english = flatten(en.cropYieldBenchmarks),
    hindi = new Map(flatten(hi.cropYieldBenchmarks));
  assert.equal(english.length, hindi.size);
  for (const [key, value] of english) {
    const translated = hindi.get(key);
    assert.equal(typeof translated, "string", key);
    assert.deepEqual(
      translated.match(/\{\w+\}/g)?.sort(),
      value.match(/\{\w+\}/g)?.sort(),
      key,
    );
    assert.doesNotMatch(translated, /\?\?|\uFFFD/, key);
  }
  for (const type of domain.yieldBenchmarkTypes)
    assert.ok(
      en.cropYieldBenchmarks.types[type] && hi.cropYieldBenchmarks.types[type],
    );
  for (const key of [
    "yieldAdvisoryManager",
    "cropYieldBenchmarks",
    "fertilizerRecommendations",
  ]) {
    assert.ok(en.sidebar.items[key]);
    assert.match(hi.sidebar.items[key], /[\u0900-\u097f]/);
  }
  assert.match(hi.cropYieldBenchmarks.title, /[\u0900-\u097f]/);
});
