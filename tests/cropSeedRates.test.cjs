const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/crop-seed-rates/";
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
const domain = load("src/types/admin/cropSeedRate.ts"),
  seeds = load("src/types/admin/seed.ts");
const payload = {
  crop_id: 3,
  crop_variety_id: null,
  seed_id: null,
  season_id: null,
  material_type: "seed",
  sowing_method: null,
  irrigation_condition: null,
  rate_basis: "per_area",
  rate_min: "0.0000",
  rate_recommended: "4.0000",
  rate_max: null,
  rate_unit_code: "kg",
  area_unit_code: "ha",
  spacing_row_cm: null,
  spacing_plant_cm: null,
  region_scope: "specific",
  region_ids: [12],
  source_id: 9,
  notes: null,
  is_active: false,
};
const product = {
  id: 7,
  name: "सरसों बीज",
  sku: "SKU-7",
  material_type: "seed",
  crop_id: 3,
  crop_variety_id: 23,
  primary_image: { image_url: "/seed.png", alt_text: "Mustard seed" },
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
const rate = {
  ...payload,
  id: 4,
  crop_name: "सरसों",
  crop_variety_name: null,
  season_name: null,
  crop: { id: 3, name: "सरसों" },
  crop_variety: null,
  season: null,
  seed: null,
  source_title: "ICAR",
  knowledge_source: { id: 9, title: "ICAR" },
  regions,
  created_at: null,
  updated_at: null,
  added_at: null,
};
const linked = { ...rate, seed_id: 7, seed: product };
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
  const service = load("src/lib/apis/admin/cropSeedRates.ts", {
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
  const actions = load("src/actions/admin/cropSeedRates.ts", {
    "next/cache": { revalidatePath: (value) => invalidations.push(value) },
    "next-intl/server": translations,
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new ApiError("Sign in", 401);
        return admin;
      },
    },
    "@/lib/apis/admin/cropSeedRates": service,
    "@/lib/api/handleActionError": errorHandler,
  });
  return { service: service.cropSeedRatesAPI, actions, calls, invalidations };
}
test("rate client integrates six verified endpoints, backend filters and status-only body", async () => {
  const h = serviceHarness();
  await h.service.list({
    keyword: "mustard",
    crop_id: 3,
    crop_variety_id: 23,
    season_id: 2,
    material_type: "seed",
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
      ["/admin/crop-seed-rates", "GET"],
      ["/admin/crop-seed-rates/4", "GET"],
      ["/admin/crop-seed-rates", "POST"],
      ["/admin/crop-seed-rates/4", "PATCH"],
      ["/admin/crop-seed-rates/4/status", "PATCH"],
      ["/admin/crop-seed-rates/4", "DELETE"],
    ],
  );
  assert.equal(h.calls[0].options.params.is_active, "0");
  assert.deepEqual(clone(h.calls[4].options.data), { is_active: true });
  assert.equal(h.calls[5].options.data, undefined);
});
test("save allowlists actual fields, preserves null seed and decimal zero, and clears all-region mappings", async () => {
  const h = serviceHarness(Array(2).fill({ status: true, data: rate }));
  await h.actions.saveCropSeedRate(null, {
    ...payload,
    rate_recommended: "9999999999.9999",
    translations: {},
    created_at: "forged",
    expected_yield: 99,
  });
  assert.deepEqual(clone(h.calls[0].options.data), {
    ...payload,
    rate_recommended: "9999999999.9999",
  });
  await h.actions.saveCropSeedRate(4, { ...payload, region_scope: "all" });
  assert.deepEqual(clone(h.calls[1].options.data.region_ids), []);
  assert.equal(h.calls[1].options.data.seed_id, null);
  assert.equal(h.invalidations.length, 6);
});
test("all mutations authenticate and guard IDs; only reviewers activate but ordinary admins save inactive and deactivate", async () => {
  const anon = serviceHarness([], null);
  await anon.actions.saveCropSeedRate(null, payload);
  await anon.actions.updateCropSeedRateStatus(4, false);
  await anon.actions.deleteCropSeedRate(4);
  assert.equal(anon.calls.length, 0);
  const h = serviceHarness(Array(2).fill({ status: true, data: rate }), {
    is_super_user: false,
  });
  assert.equal(
    (await h.actions.saveCropSeedRate(null, { ...payload, is_active: true }))
      .success,
    false,
  );
  assert.equal(
    (await h.actions.updateCropSeedRateStatus(4, true)).success,
    false,
  );
  assert.equal(h.calls.length, 0);
  assert.equal((await h.actions.saveCropSeedRate(null, payload)).success, true);
  assert.equal(
    (await h.actions.updateCropSeedRateStatus(4, false)).success,
    true,
  );
  for (const id of [0, -1, 1.2, "4", Infinity]) {
    assert.equal(
      (await h.actions.saveCropSeedRate(id, payload)).success,
      false,
    );
    assert.equal((await h.actions.deleteCropSeedRate(id)).success, false);
  }
  assert.equal(
    (await h.actions.saveCropSeedRate(null, { ...payload, source_id: 0 }))
      .success,
    false,
  );
});
test("422 fields and 409 conflicts remain recoverable, failures never invalidate and Next control flow survives", async () => {
  const errors = { "region_ids.0": ["Inactive"], rate_min: ["Too high"] };
  const h = serviceHarness([
    new ApiError("Invalid", 422, errors),
    new ApiError("Conflicting recommendation", 409),
    new ApiError("Private SQL", 500),
    { status: false },
  ]);
  assert.deepEqual(
    (await h.actions.saveCropSeedRate(4, payload)).errors,
    errors,
  );
  assert.equal(
    (await h.actions.updateCropSeedRateStatus(4, true)).message,
    "Conflicting recommendation",
  );
  assert.equal((await h.actions.deleteCropSeedRate(4)).message, "failed");
  assert.equal((await h.actions.saveCropSeedRate(4, payload)).success, false);
  assert.equal(h.invalidations.length, 0);
  await assert.rejects(
    serviceHarness([
      Object.assign(Error("REDIRECT"), { controlFlow: true }),
    ]).actions.saveCropSeedRate(4, payload),
    /REDIRECT/,
  );
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
  "@/components/common/ImagePreview": mock("image"),
  "@/icons": new Proxy({}, { get: (_, key) => key }),
  "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
    mock("relation"),
  "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
    mock("confirm"),
  "@/types/admin/cropSeedRate": domain,
  "@/types/admin/seed": seeds,
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
  record = rate,
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
    },
    clearErrors() {},
    reset(next) {
      values = next;
    },
    handleSubmit: (fn) => () => fn(values),
  };
  const Form = load(root + "_components/CropSeedRateForm.tsx", {
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
    "@/actions/admin/cropSeedRates": {
      saveCropSeedRate: async (...args) => {
        calls.push(args);
        return respond(...args);
      },
    },
  }).default;
  const render = () => {
    state.reset();
    return Form({
      rate: record,
      choices: {},
      selections: {},
      states,
      canReview,
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
test("create/edit defaults preserve nullable relations and zero, require source and recommended rate, and stay inactive", () => {
  const h = formHarness();
  assert.equal(h.values().seed_id, "");
  assert.equal(h.values().crop_variety_id, "");
  assert.equal(h.values().season_id, "");
  assert.equal(h.values().rate_min, "0.0000");
  assert.equal(h.values().source_id, "9");
  assert.equal(h.values().spacing_row_cm, "");
  h.bind("source_id");
  h.bind("seed_id");
  assert.equal(h.rules.source_id.required, "validation.required");
  assert.equal(h.rules.seed_id.required, undefined);
  assert.equal(h.rules.seed_id.validate(""), true);
  assert.equal(h.rules.notes.maxLength.value, 65535);
  const fresh = formHarness(null);
  assert.equal(fresh.values().is_active, false);
  assert.equal(fresh.values().rate_basis, "per_area");
  assert.equal(fresh.values().material_type, "");
  assert.equal(fresh.rules.rate_recommended.required, "validation.required");
});
test("rate/spacing precision and limits are validated, recommended stays positive and optional bounds accept zero", () => {
  const h = formHarness();
  for (const value of ["0.0001", "4.0000", "9999999999.9999"])
    assert.equal(h.rules.rate_recommended.validate(value), true);
  for (const value of ["0", "0.0000", "-1", "1.00001", "10000000000", "1e2"])
    assert.notEqual(h.rules.rate_recommended.validate(value), true);
  assert.equal(h.rules.rate_min.validate.decimal(""), true);
  assert.equal(h.rules.rate_min.validate.decimal("0.0000"), true);
  assert.equal(h.rules.rate_max.validate.decimal("0"), true);
  for (const value of ["", "0.01", "45", "99999999.99"])
    assert.equal(h.rules.spacing_row_cm.validate(value), true);
  for (const value of ["0", "-1", "0.001", "100000000"])
    assert.notEqual(h.rules.spacing_plant_cm.validate(value), true);
});
test("minimum and maximum comparisons cover missing/equal bounds and precision near the supported limit", () => {
  const h = formHarness();
  assert.equal(h.rules.rate_min.validate.order(""), true);
  assert.equal(h.rules.rate_min.validate.order("4"), true);
  assert.notEqual(h.rules.rate_min.validate.order("4.0001"), true);
  assert.equal(h.rules.rate_max.validate.order("4"), true);
  assert.notEqual(h.rules.rate_max.validate.order("3.9999"), true);
  h.fill({ rate_recommended: "9999999999.9999" });
  assert.equal(h.rules.rate_min.validate.order("9999999999.9998"), true);
  assert.notEqual(h.rules.rate_max.validate.order("9999999999.9998"), true);
});
test("changing crop clears variety and product without modifying scientific values or material", () => {
  const h = formHarness({ ...linked, crop_variety_id: 23 });
  h.bind("crop_id").props.onChange("8");
  assert.equal(h.values().crop_variety_id, "");
  assert.equal(h.values().seed_id, "");
  assert.equal(h.values().rate_recommended, "4.0000");
  assert.equal(h.values().material_type, "seed");
  assert.equal(h.bind("seed_id").props.cropId, 8);
  assert.equal(h.bind("crop_variety_id").props.cropId, 8);
});
test("changing variety clears incompatible product but retains generic and same-variety products", () => {
  const incompatible = formHarness(linked);
  incompatible.bind("crop_variety_id").props.onChange("24");
  assert.equal(incompatible.values().seed_id, "");
  const generic = formHarness({
    ...linked,
    seed: { ...product, crop_variety_id: null },
  });
  generic.bind("crop_variety_id").props.onChange("24");
  assert.equal(generic.values().seed_id, "7");
  assert.equal(generic.bind("seed_id").props.seedVarietyId, 24);
  const same = formHarness(linked);
  same.bind("crop_variety_id").props.onChange("23");
  assert.equal(same.values().seed_id, "7");
});
test("selecting seed initializes only blank material, preserves existing material and validates mismatches", () => {
  const h = formHarness(null);
  h.fill({ crop_id: "3", rate_unit_code: "kg" });
  const choose = h.bind("seed_id");
  choose.props.onSelectionChange({ seed: product });
  choose.props.onChange("7");
  h.render();
  assert.equal(h.values().material_type, "seed");
  h.fill({ material_type: "seedling" });
  choose.props.onSelectionChange({ seed: product });
  h.render();
  assert.equal(h.values().material_type, "seedling");
  assert.notEqual(h.rules.material_type.validate.seed("seedling"), true);
  assert.equal(h.rules.material_type.validate.seed("seed"), true);
  choose.props.onSelectionChange(null);
  choose.props.onChange("");
  h.render();
  assert.equal(h.rules.material_type.validate.seed("seedling"), true);
});
test("material changes constrain rate units without converting rates, and unsupported area/cultivation values fail", () => {
  const h = formHarness();
  assert.equal(h.rules.rate_unit_code.validate("kg"), true);
  assert.notEqual(h.rules.rate_unit_code.validate("plant"), true);
  findAll(
    h.render(),
    (e) => e.type === "select" && e.props.id === "rate-material",
  )[0].props.onChange({ target: { value: "seedling" } });
  h.render();
  assert.equal(h.values().rate_unit_code, "");
  assert.equal(h.values().rate_recommended, "4.0000");
  assert.equal(h.rules.rate_unit_code.validate("plant"), true);
  assert.notEqual(h.rules.rate_unit_code.validate("kg"), true);
  assert.equal(h.rules.area_unit_code.validate("ha"), true);
  assert.notEqual(h.rules.area_unit_code.validate("m2"), true);
  assert.equal(h.rules.sowing_method.validate(""), true);
  assert.notEqual(h.rules.irrigation_condition.validate("unknown"), true);
});
test("shared region selector retains saved inactive districts, rejects new inactive and clears All Regions", () => {
  const h = formHarness(),
    regionsBinding = h.bind("region_ids");
  assert.equal(regionsBinding.type, "regions");
  assert.equal(h.rules.region_ids.validate([12]), true);
  assert.notEqual(h.rules.region_ids.validate([13]), true);
  assert.notEqual(h.rules.region_ids.validate([]), true);
  assert.notEqual(h.rules.region_ids.validate([11, 11]), true);
  regionsBinding.props.scopeInput.onChange({ target: { value: "all" } });
  assert.deepEqual(clone(h.values().region_ids), []);
  assert.equal(h.rules.region_ids.validate([]), true);
  regionsBinding.props.scopeInput.onChange({ target: { value: "specific" } });
  assert.notEqual(h.rules.region_ids.validate([]), true);
});
test("general recommendations submit nullable relations, unchanged decimal strings, source and optional spacing", async () => {
  const h = formHarness();
  await h.submit();
  assert.equal(h.calls[0][0], 4);
  assert.deepEqual(clone(h.calls[0][1]), payload);
  h.fill({
    crop_variety_id: "23",
    season_id: "2",
    sowing_method: "drilling",
    irrigation_condition: "rainfed",
    spacing_row_cm: "45.25",
    notes: " Saved note ",
  });
  await h.submit();
  assert.equal(h.calls[1][1].spacing_row_cm, "45.25");
  assert.equal(h.calls[1][1].notes, "Saved note");
  assert.equal(h.calls[1][1].season_id, 2);
  assert.equal(h.calls[1][1].seed_id, null);
});
test("nested backend fields and conflicts retain the complete draft and can retry the existing ID", async () => {
  const h = formHarness(linked, async () => ({
    success: false,
    message: "Conflicting recommendation",
    errors: {
      "region_ids.0": ["Inactive"],
      rate_min: ["Too high"],
      seed_id: ["Incompatible"],
      source_id: ["Not eligible"],
    },
  }));
  h.fill({ rate_min: "3.1250", notes: "Keep draft" });
  await h.submit();
  assert.deepEqual(
    h.errors.map((error) => error.name),
    ["region_ids", "rate_min", "seed_id", "source_id"],
  );
  assert.equal(h.values().rate_min, "3.1250");
  assert.equal(h.values().notes, "Keep draft");
  assert.deepEqual(clone(h.values().region_ids), [12]);
  assert.equal(h.pushes.length, 0);
  await h.submit();
  assert.equal(h.calls[1][0], 4);
});
test("successful create keeps its ID across navigation failure; All Regions never submits district mappings", async () => {
  const h = formHarness(
    null,
    async () => ({ success: true, data: rate }),
    true,
    true,
  );
  h.fill({
    crop_id: "3",
    source_id: "9",
    material_type: "seed",
    rate_recommended: "4",
    rate_unit_code: "kg",
    area_unit_code: "ha",
    region_scope: "all",
    region_ids: [12],
  });
  await h.submit();
  assert.equal(h.calls[0][0], null);
  assert.deepEqual(clone(h.calls[0][1].region_ids), []);
  assert.equal(h.calls[0][1].is_active, false);
  await h.submit();
  assert.equal(h.calls[1][0], 4);
});
test("save blocks duplicate submissions and navigation; ordinary users cannot change active recommendations", async () => {
  let resolve;
  const h = formHarness(rate, () => new Promise((done) => (resolve = done)));
  const first = h.submit(),
    second = h.submit();
  assert.equal(h.calls.length, 1);
  findAll(
    h.render(),
    (e) => e.type === "button" && e.props.children === "cancel",
  )[0].props.onClick();
  assert.equal(h.pushes.length, 0);
  resolve({ success: false, message: "Retry" });
  await Promise.all([first, second]);
  const locked = formHarness({ ...rate, is_active: true }, undefined, false);
  assert.equal(
    findAll(
      locked.render(),
      (e) => e.type === "button" && e.props.type === "submit",
    ).length,
    0,
  );
  await locked.submit();
  assert.equal(locked.calls.length, 0);
  assert.equal(
    formHarness(null, undefined, false).bind("is_active").props.disabled,
    true,
  );
});
test("seed dropdown keeps generic and matching varieties on each server page; default behavior is preserved", () => {
  const state = hooks();
  const Selector = load(
    "src/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect.tsx",
    {
      ...ui,
      react: state.react,
      "@headlessui/react": {
        Combobox: "combo",
        ComboboxInput: "comboInput",
        ComboboxButton: "comboButton",
        ComboboxOption: "option",
        ComboboxOptions: "options",
      },
      "@/actions/admin/cropStageTimelines": {},
    },
  ).default;
  const render = (variety) => {
    state.reset();
    return Selector({
      kind: "seed",
      id: "seed",
      label: "Seed",
      value: "",
      onChange() {},
      seedVarietyId: variety,
      initialPage: {
        options: [
          { id: 1, is_active: true, seed: { crop_variety_id: null } },
          { id: 2, is_active: true, seed: { crop_variety_id: 23 } },
          { id: 3, is_active: true, seed: { crop_variety_id: 24 } },
        ],
        pagination,
      },
    });
  };
  assert.deepEqual(
    findAll(render(23), (e) => e.type === "option").map((e) => e.props.value),
    ["", "1", "2"],
  );
  assert.deepEqual(
    findAll(render(null), (e) => e.type === "option").map((e) => e.props.value),
    ["", "1", "2", "3"],
  );
});
test("seed options pass crop, eligibility, search and page to existing Seeds API without unsupported union parameters", async () => {
  const calls = [];
  const master = load("src/lib/apis/admin/cropStageTimelines.ts", {
    "server-only": {},
    "@/lib/api/request": {},
    "@/lib/api/ApiError": { ApiError },
    ...Object.fromEntries(
      [
        "crops",
        "cropStages",
        "cropVarieties",
        "seasons",
        "knowledgeSources",
        "regions",
        "activityCategories",
      ].map((name) => [`@/lib/apis/admin/${name}`, {}]),
    ),
    "@/lib/apis/admin/seeds": {
      seedsAPI: {
        list: async (params) => {
          calls.push(params);
          return { status: true, data: [], pagination };
        },
      },
    },
  });
  await master.getTimelineOptions("seed", 3, true, "mustard", 2);
  assert.deepEqual(clone(calls[0]), {
    keyword: "mustard",
    page: 2,
    per_page: 20,
    crop_id: 3,
    is_active: 1,
    setup_status: "completed",
    verification_status: "verified",
  });
  await master.getTimelineOptions("seed", null, false);
  assert.equal(calls[1].crop_id, undefined);
});
test("listing has eleven columns, nullable labels, seed thumbnails and exact decimal ranges without fabricated bounds", () => {
  const List = load(root + "_components/CropSeedRatesList.tsx", {
    ...ui,
    "@/i18n/navigation": { Link: "link" },
    "@/components/admin/ui/badge/Badge": mock("badge"),
    "@/components/admin/common/UrlPagination": mock("pagination"),
    "@/components/admin/ui/table": {
      Table: "table",
      TableHeader: "thead",
      TableBody: "tbody",
      TableRow: "tr",
      TableCell: "td",
    },
    "./CropSeedRateRowActions": mock("actions"),
  }).default;
  const tree = List({
    result: {
      data: [
        rate,
        {
          ...linked,
          rate_recommended: "9999999999.9999",
          rate_min: null,
          rate_max: "9999999999.9999",
        },
      ],
      pagination,
    },
    filtered: true,
    canReview: false,
  });
  assert.equal(
    findAll(tree, (e) => e.type === "thead")[0].props.children.props.children
      .length,
    11,
  );
  const content = JSON.stringify(tree);
  assert.ok(content.includes("सरसों"));
  assert.ok(content.includes("general"));
  assert.ok(content.includes("allSeasons"));
  assert.ok(content.includes("allVarieties"));
  assert.ok(content.includes("minimumValue"));
  assert.ok(content.includes("maximumValue"));
  assert.ok(content.includes("99,999.9999"));
  assert.equal(findAll(tree, (e) => e.type === "image").length, 1);
  assert.equal(
    findAll(tree, (e) => e.type === "image")[0].props.src,
    "/seed.png",
  );
  assert.ok(
    JSON.stringify(
      List({
        result: {
          data: [],
          pagination: { ...pagination, total: 0, from: null, to: null },
        },
        filtered: false,
        canReview: false,
      }),
    ).includes("empty"),
  );
});
test("filters preserve all seven values and inactive zero, reset page, clear variety on crop change and reset controls", () => {
  const state = hooks(),
    pushes = [];
  let values;
  const Filters = load(root + "_components/CropSeedRatesFilters.tsx", {
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
        material_type: "seed",
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
    material_type: "seed",
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
  assert.equal(pushes[1], "/admin/crop-seed-rates?extra=keep");
  assert.equal(values.crop_id, "");
});
function contentHarness(response) {
  const calls = [],
    redirects = [];
  const Content = load(root + "_components/CropSeedRatesContent.tsx", {
    "next-intl/server": translations,
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
    "@/i18n/navigation": {
      redirect(value) {
        redirects.push(value);
        throw Object.assign(Error("REDIRECT"), { controlFlow: true });
      },
    },
    "@/lib/apis/admin/cropSeedRates": {
      cropSeedRatesAPI: {
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
    "@/types/admin/seed": seeds,
    "./CropSeedRatesFilters": mock("filters"),
    "./CropSeedRatesList": mock("list"),
  }).default;
  return { Content, calls, redirects };
}
test("server listing normalizes URL values, drops variety without crop and shows load failures", async () => {
  const h = contentHarness({ status: true, data: [rate], pagination });
  const tree = await h.Content({
    searchParams: Promise.resolve({
      keyword: " seed ",
      crop_id: "3",
      crop_variety_id: "23",
      season_id: "2",
      material_type: "seed",
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
    material_type: "seed",
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
      material_type: "invalid",
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
function editorHarness(record = rate, canReview = true, missingSeed = false) {
  const calls = [];
  const Editor = load(root + "_components/CropSeedRateEditor.tsx", {
    "next-intl/server": translations,
    "next/navigation": {
      notFound() {
        throw Object.assign(Error("NOT_FOUND"), { controlFlow: true });
      },
    },
    "@/lib/auth/dal": {
      requireAdmin: async () => ({ is_super_user: canReview }),
    },
    "@/lib/apis/admin/cropSeedRates": {
      cropSeedRatesAPI: {
        show: async (id) => {
          calls.push(["rate", id]);
          if (record instanceof ApiError) throw record;
          return { status: true, data: record };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async (kind, crop) => {
        calls.push([kind, crop]);
        return {
          options:
            kind === "seed" && !missingSeed
              ? [{ id: 7, label: product.name, is_active: true, seed: product }]
              : [],
          pagination,
        };
      },
      getTimelineRegions: async (saved) => {
        calls.push(["regions", saved]);
        return states;
      },
      getTimelineSelections: async (_choices, ids) => {
        calls.push(["selections", ids]);
        return {};
      },
      getTimelineOption: async () => {
        throw new ApiError("Deleted seed", 404);
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": errorHandler,
    "./CropSeedRateForm": mock("form"),
    "./CropSeedRateDetails": mock("details"),
  }).default;
  return { Editor, calls };
}
test("editor loads one record, retains saved regions and historical seed while loading dependent options by crop", async () => {
  const h = editorHarness(linked);
  const tree = await h.Editor({ id: "4" });
  assert.equal(tree.type, "form");
  assert.equal(tree.props.selections.seed.id, 7);
  assert.deepEqual(
    h.calls.filter((call) => call[0] === "rate"),
    [["rate", 4]],
  );
  assert.deepEqual(h.calls.find((call) => call[0] === "regions")[1], regions);
  assert.deepEqual(
    h.calls.find((call) => call[0] === "seed"),
    ["seed", 3],
  );
  const missing = await editorHarness(linked, true, true).Editor({ id: "4" });
  assert.equal(missing.props.selections.seed.id, 7);
  assert.equal(missing.props.rate.seed, product);
});
test("view and ordinary active edits avoid option requests; invalid IDs and missing records remain not-found", async () => {
  const h = editorHarness({ ...rate, is_active: true }, false);
  const locked = await h.Editor({ id: "4" });
  assert.equal(findAll(locked, (e) => e.type === "details").length, 1);
  assert.equal(findAll(locked, (e) => e.props.role === "status").length, 1);
  assert.deepEqual(h.calls, [["rate", 4]]);
  const view = editorHarness();
  await view.Editor({ id: "4", viewOnly: true });
  assert.deepEqual(view.calls, [["rate", 4]]);
  await assert.rejects(
    editorHarness(new ApiError("Missing", 404)).Editor({ id: "4" }),
    /NOT_FOUND/,
  );
  await assert.rejects(view.Editor({ id: "invalid" }), /NOT_FOUND/);
});
test("row permissions protect active rates; deletion waits for confirmation and retains conflict errors", async () => {
  const state = hooks(),
    calls = [];
  let resolve;
  const Actions = load(root + "_components/CropSeedRateRowActions.tsx", {
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
    "@/actions/admin/cropSeedRates": {
      deleteCropSeedRate: (id) => {
        calls.push(["delete", id]);
        return new Promise((done) => (resolve = done));
      },
      updateCropSeedRateStatus: async (id, active) => {
        calls.push(["status", id, active]);
        return { success: true };
      },
    },
  }).default;
  const render = (record = rate, canReview = false) => {
    state.reset();
    return Actions({ rate: record, canReview });
  };
  assert.equal(
    findAll(
      render({ ...rate, is_active: true }),
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
    render(rate, true),
    (e) => e.type === "button" && e.props.children === "actions.activate",
  )[0].props.onClick();
  dialog().props.onConfirm();
  await new Promise((done) => setImmediate(done));
  assert.deepEqual(calls[1], ["status", 4, true]);
});
test("UI messages have matching keys/interpolation, true Hindi and labels for all verified constants", () => {
  const en = JSON.parse(
      fs.readFileSync("src/messages/en.json", "utf8"),
    ).cropSeedRates,
    hi = JSON.parse(
      fs.readFileSync("src/messages/hi.json", "utf8"),
    ).cropSeedRates;
  function flatten(object, prefix = "") {
    return Object.entries(object).flatMap(([key, value]) =>
      typeof value === "object"
        ? flatten(value, `${prefix}${key}.`)
        : [[`${prefix}${key}`, value]],
    );
  }
  const english = flatten(en),
    hindi = new Map(flatten(hi));
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
  for (const method of domain.rateSowingMethods)
    assert.ok(en.sowing[method] && hi.sowing[method]);
  for (const area of domain.rateAreaUnits)
    assert.ok(en.areaUnits[area] && hi.areaUnits[area]);
  assert.match(hi.title, /[\u0900-\u097f]/);
});
