const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/seed-prices/";
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
const domain = load("src/types/admin/seedPrice.ts"),
  seeds = load("src/types/admin/seed.ts");
const payload = {
  seed_id: 7,
  seller_name: null,
  price_type: "retail",
  package_quantity: "1.0000",
  package_unit_code: "kg",
  package_price: "0.0000",
  currency_code: "INR",
  effective_from: "2026-11-01",
  effective_to: null,
  source_id: null,
  region_scope: "specific",
  region_ids: [12],
  is_active: false,
};
const product = {
  id: 7,
  name: "सरसों",
  sku: "SKU-7",
  material_type: "seed",
  crop_id: 2,
  crop_name: "Mustard",
  crop_variety_id: null,
  crop_variety_name: null,
  primary_image: { image_url: "/seed.png", alt_text: "Seed" },
  default_unit_code: "kg",
  reference_pack_quantity: "5.0000",
  reference_pack_unit_code: "kg",
};
const regions = [
  {
    id: 12,
    parent_id: 1,
    name: "Old district",
    region_type: "district",
    is_active: false,
  },
];
const price = {
  ...payload,
  id: 4,
  seed: product,
  source_title: null,
  knowledge_source: null,
  regions,
  last_verified_at: null,
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
  to: 11,
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
  const service = load("src/lib/apis/admin/seedPrices.ts", {
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
  const actions = load("src/actions/admin/seedPrices.ts", {
    "next/cache": { revalidatePath: (value) => invalidations.push(value) },
    "next-intl/server": translations,
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new ApiError("Sign in", 401);
        return admin;
      },
    },
    "@/lib/apis/admin/seedPrices": service,
    "@/lib/api/handleActionError": errorHandler,
  });
  return { service: service.seedPricesAPI, actions, calls, invalidations };
}
test("prices integrate all six verified routes with server filters and body-free deletion", async () => {
  const h = serviceHarness();
  await h.service.list({
    keyword: "Mustard",
    seed_id: 7,
    price_type: "retail",
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
      ["/admin/seed-prices", "GET"],
      ["/admin/seed-prices/4", "GET"],
      ["/admin/seed-prices", "POST"],
      ["/admin/seed-prices/4", "PATCH"],
      ["/admin/seed-prices/4/status", "PATCH"],
      ["/admin/seed-prices/4", "DELETE"],
    ],
  );
  assert.equal(h.calls[0].options.params.is_active, "0");
  assert.equal(h.calls[5].options.data, undefined);
  assert.deepEqual(clone(h.calls[4].options.data), { is_active: true });
});
test("mutations allowlist writable fields and preserve decimal strings and zero without sending notes or metadata", async () => {
  const h = serviceHarness(Array(2).fill({ status: true, data: price }));
  await h.actions.saveSeedPrice(null, {
    ...payload,
    package_price: "999999999999.9999",
    notes: "unsupported",
    minimum_order_quantity: 1,
    last_verified_at: "forged",
    translations: {},
  });
  assert.deepEqual(clone(h.calls[0].options.data), {
    ...payload,
    package_price: "999999999999.9999",
  });
  await h.actions.saveSeedPrice(4, {
    ...payload,
    region_scope: "all",
    region_ids: [12],
  });
  assert.deepEqual(clone(h.calls[1].options.data.region_ids), []);
  assert.equal(h.calls[1].options.data.package_price, "0.0000");
  assert.equal(h.invalidations.length, 6);
});
test("all actions authenticate; only reviewers activate while ordinary admins can save inactive and deactivate", async () => {
  const anon = serviceHarness([], null);
  await anon.actions.saveSeedPrice(null, payload);
  await anon.actions.updateSeedPriceStatus(4, false);
  await anon.actions.deleteSeedPrice(4);
  assert.equal(anon.calls.length, 0);
  const h = serviceHarness(Array(2).fill({ status: true, data: price }), {
    is_super_user: false,
  });
  assert.equal(
    (await h.actions.saveSeedPrice(null, { ...payload, is_active: true }))
      .success,
    false,
  );
  assert.equal((await h.actions.updateSeedPriceStatus(4, true)).success, false);
  assert.equal(h.calls.length, 0);
  assert.equal((await h.actions.saveSeedPrice(null, payload)).success, true);
  assert.equal((await h.actions.updateSeedPriceStatus(4, false)).success, true);
  for (const id of [0, -1, 1.2, "4", Infinity]) {
    assert.equal((await h.actions.saveSeedPrice(id, payload)).success, false);
    assert.equal(
      (await h.actions.updateSeedPriceStatus(id, false)).success,
      false,
    );
    assert.equal((await h.actions.deleteSeedPrice(id)).success, false);
  }
});
test("backend field, authorization and overlap errors stay recoverable; 5xx is masked and control flow rethrown", async () => {
  const errors = {
    "region_ids.0": ["Inactive"],
    package_unit_code: ["Incompatible"],
  };
  const h = serviceHarness([
    new ApiError("Invalid", 422, errors),
    new ApiError("Overlapping price #9", 409),
    new ApiError("No permission", 403),
    new ApiError("SQL private", 500),
    { status: false },
  ]);
  assert.deepEqual((await h.actions.saveSeedPrice(4, payload)).errors, errors);
  assert.equal(
    (await h.actions.updateSeedPriceStatus(4, true)).message,
    "Overlapping price #9",
  );
  assert.equal((await h.actions.saveSeedPrice(4, payload)).success, false);
  assert.equal((await h.actions.deleteSeedPrice(4)).message, "failed");
  assert.equal((await h.actions.saveSeedPrice(4, payload)).success, false);
  assert.equal(h.invalidations.length, 0);
  await assert.rejects(
    serviceHarness([
      Object.assign(Error("NEXT_REDIRECT"), { controlFlow: true }),
    ]).actions.saveSeedPrice(4, payload),
    /NEXT_REDIRECT/,
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
      useCallback: (value) => value,
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
    useFormatter: () => ({
      dateTime: (date) => date.toISOString().slice(0, 10),
    }),
    useLocale: () => "en-IN",
  },
  "@/components/admin/common/ComponentCard": mock("card"),
  "@/components/admin/common/FilterSelect": mock("select"),
  "@/components/admin/form/input/InputField": mock("input"),
  "@/components/admin/form/Label": mock("label"),
  "@/components/admin/form/date-picker": mock("date"),
  "@/components/admin/form/switch/Switch": mock("switch"),
  "@/components/common/ImagePreview": mock("image"),
  "@/icons": new Proxy({}, { get: (_, key) => key }),
  "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
    mock("relation"),
  "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
    mock("confirm"),
  "@/types/admin/seedPrice": domain,
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
      { id: 12, name: "Old district", is_active: false },
      { id: 13, name: "Other inactive", is_active: false },
    ],
  },
];
function formHarness(
  record = price,
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
    trigger() {},
    reset(next) {
      values = next;
    },
    handleSubmit: (fn) => () => fn(values),
  };
  const Form = load(root + "_components/SeedPriceForm.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
      useForm(options) {
        values ??= options.defaultValues;
        return form;
      },
      useWatch: ({ name }) => values[name],
      useController({ name, rules: rule }) {
        rules[name] = rule;
        return {
          field: {
            name,
            value: values[name],
            onChange: (value) => (values[name] = value),
          },
        };
      },
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
    "@/actions/admin/seedPrices": {
      saveSeedPrice: async (...args) => {
        calls.push(args);
        return respond(...args);
      },
    },
  }).default;
  const render = () => {
    state.reset();
    return Form({
      price: record,
      choices: {},
      selections: {},
      states,
      canReview,
    });
  };
  render();
  const controller = (name) =>
    findAll(
      render(),
      (e) => e.type === "controller" && e.props.name === name,
    )[0];
  const bind = (name) => {
    const c = controller(name);
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
    controller,
    bind,
    values: () => values,
    fill: (next) => Object.assign(values, next),
    rules,
    errors,
    calls,
    pushes,
    notices,
    state,
    async submit() {
      findAll(render(), (e) => e.type === "form")[0].props.onSubmit({});
      await state.done();
    },
  };
}
test("form initializes backend decimals, optional nulls and inactive create defaults with required explicit fields", () => {
  const h = formHarness();
  assert.equal(h.values().package_price, "0.0000");
  assert.equal(h.values().seed_id, "7");
  assert.equal(h.values().effective_to, "");
  assert.equal(h.values().seller_name, "");
  assert.equal(h.values().source_id, "");
  const fresh = formHarness(null);
  assert.equal(fresh.values().is_active, false);
  assert.equal(fresh.values().currency_code, "INR");
  assert.equal(fresh.values().price_type, "");
  assert.equal(fresh.values().package_unit_code, "");
  assert.equal(fresh.rules.package_quantity.required, "validation.required");
  assert.equal(fresh.rules.effective_from.required, "validation.required");
  assert.equal(h.rules.notes, undefined);
  assert.equal(h.rules.minimum_order_quantity, undefined);
  assert.equal(h.rules.translations, undefined);
});
test("decimal validation is exact at four-place limits, permits zero price and rejects zero quantity", () => {
  const h = formHarness();
  for (const value of ["0", "0.0000", "999999999999.9999", "00001.2000"])
    assert.equal(h.rules.package_price.validate(value), true);
  for (const value of [
    "-1",
    "1.00001",
    "1000000000000",
    "9999999999999",
    "1e3",
    "",
    "1,000",
  ])
    assert.notEqual(h.rules.package_price.validate(value), true);
  for (const value of ["0.0001", "1", "9999999999.9999"])
    assert.equal(h.rules.package_quantity.validate(value), true);
  for (const value of ["0", "0.0000", "10000000000", "1.00001"])
    assert.notEqual(h.rules.package_quantity.validate(value), true);
});
test("dates reject invalid calendars/reversed periods, allow open-ended/equal periods and do not change active status", () => {
  const h = formHarness({ ...price, is_active: true });
  assert.equal(h.rules.effective_from.validate("2028-02-29"), true);
  assert.notEqual(h.rules.effective_from.validate("2026-02-29"), true);
  assert.notEqual(h.rules.effective_from.validate("0000-01-01"), true);
  assert.equal(h.rules.effective_to.validate.calendar(""), true);
  assert.equal(h.rules.effective_to.validate.order("2026-11-01"), true);
  assert.notEqual(h.rules.effective_to.validate.order("2026-10-31"), true);
  const from = findAll(
    h.render(),
    (e) => e.type === "date" && e.props.id === "price-from",
  )[0];
  from.props.onChange([], "2027-01-01");
  assert.equal(h.values().is_active, true);
});
test("product change clears incompatible unit while preserving price, and preview uses selected summary", () => {
  const h = formHarness(),
    relation = h.bind("seed_id");
  relation.props.onChange("8");
  relation.props.onSelectionChange({
    id: 8,
    seed: { ...product, id: 8, material_type: "seedling", name: "New plant" },
  });
  const content = JSON.stringify(h.render());
  assert.ok(content.includes("New plant"));
  assert.ok(content.includes("5.0000"));
  assert.equal(h.values().package_unit_code, "");
  assert.equal(h.values().package_price, "0.0000");
  assert.equal(h.rules.package_unit_code.validate("plant"), true);
  assert.notEqual(h.rules.package_unit_code.validate("kg"), true);
  assert.equal(h.calls.length, 0);
  relation.props.onChange("");
  relation.props.onSelectionChange(null);
  assert.ok(JSON.stringify(h.render()).includes("form.previewEmpty"));
});
test("region integration reuses shared tree, preserves saved inactive IDs, rejects new inactive and clears All Regions", () => {
  const h = formHarness(),
    binding = h.bind("region_ids");
  assert.equal(binding.type, "regions");
  assert.deepEqual(clone(binding.props.selectedIds), [12]);
  assert.equal(h.rules.region_ids.validate([12]), true);
  assert.notEqual(h.rules.region_ids.validate([13]), true);
  assert.notEqual(h.rules.region_ids.validate([]), true);
  assert.notEqual(h.rules.region_ids.validate([11, 11]), true);
  binding.props.scopeInput.onChange({ target: { value: "all" } });
  assert.equal(h.values().region_scope, "all");
  assert.deepEqual(clone(h.values().region_ids), []);
  assert.equal(h.rules.region_ids.validate([]), true);
  binding.props.scopeInput.onChange({ target: { value: "specific" } });
  assert.notEqual(h.rules.region_ids.validate([]), true);
  binding.props.onChange([11]);
  assert.equal(h.rules.region_ids.validate([11]), true);
});
test("submit uses exact package values and actual scope, maps nested backend errors and retains draft for correction", async () => {
  const h = formHarness(price, async () => ({
    success: false,
    message: "Overlap",
    errors: {
      "region_ids.0": ["Inactive"],
      package_price: ["Conflict"],
      source_id: ["Ineligible"],
    },
  }));
  h.fill({
    seller_name: " Seller ",
    package_price: "999999999999.9999",
    source_id: "9",
  });
  await h.submit();
  assert.equal(h.calls[0][0], 4);
  assert.deepEqual(clone(h.calls[0][1]), {
    ...payload,
    seller_name: "Seller",
    package_price: "999999999999.9999",
    source_id: 9,
  });
  assert.deepEqual(
    h.errors.map((error) => error.name),
    ["region_ids", "package_price", "source_id"],
  );
  assert.equal(h.values().package_price, "999999999999.9999");
  assert.deepEqual(clone(h.values().region_ids), [12]);
  assert.equal(h.pushes.length, 0);
  assert.equal(h.notices.length, 1);
});
test("All Regions submits no district mappings; successful create retains ID when navigation fails", async () => {
  const h = formHarness(
    null,
    async () => ({ success: true, data: price }),
    true,
    true,
  );
  h.fill({
    seed_id: "7",
    price_type: "retail",
    package_quantity: "1.0000",
    package_unit_code: "kg",
    package_price: "0.0000",
    region_scope: "all",
    region_ids: [12],
  });
  await h.submit();
  assert.equal(h.calls[0][0], null);
  assert.deepEqual(clone(h.calls[0][1].region_ids), []);
  assert.equal(h.calls[0][1].effective_to, null);
  assert.equal(h.calls[0][1].source_id, null);
  assert.equal(h.calls[0][1].is_active, false);
  await h.submit();
  assert.equal(h.calls[1][0], 4);
});
test("form guards duplicate submission and navigation during save; ordinary active records are read-only", async () => {
  let resolve;
  const h = formHarness(price, () => new Promise((done) => (resolve = done)));
  const first = h.submit();
  const second = h.submit();
  assert.equal(h.calls.length, 1);
  const cancel = findAll(
    h.render(),
    (e) => e.type === "button" && e.props.children === "cancel",
  )[0];
  cancel.props.onClick();
  assert.equal(h.pushes.length, 0);
  resolve({ success: false, message: "Retry" });
  await Promise.all([first, second]);
  const locked = formHarness({ ...price, is_active: true }, undefined, false);
  assert.equal(
    findAll(
      locked.render(),
      (e) => e.type === "button" && e.props.type === "submit",
    ).length,
    0,
  );
  await locked.submit();
  assert.equal(locked.calls.length, 0);
  const ordinary = formHarness(null, undefined, false);
  assert.equal(ordinary.bind("is_active").props.disabled, true);
  assert.equal(ordinary.bind("source_id").props.eligible, true);
});
test("listing has ten columns with backend metadata and precise full-package currency display", () => {
  const List = load(root + "_components/SeedPricesList.tsx", {
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
    "./SeedPriceRowActions": mock("actions"),
  }).default;
  const tree = List({
    result: {
      data: [
        {
          ...price,
          package_price: "999999999999.9999",
          source_title: "Backend Hindi source",
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
    10,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "tbody")[0].props.children[0].props
      .children[0].props.children,
    11,
  );
  const content = JSON.stringify(tree);
  assert.ok(content.includes("सरसों"));
  assert.ok(content.includes("Backend Hindi source"));
  assert.ok(content.includes("99,999.9999"));
  assert.ok(content.includes("periodFrom"));
  assert.equal(
    findAll(tree, (e) => e.type === "image")[0].props.src,
    "/seed.png",
  );
  const empty = List({
    result: {
      data: [],
      pagination: { ...pagination, from: null, to: null, total: 0 },
    },
    filtered: false,
    canReview: true,
  });
  assert.ok(JSON.stringify(empty).includes("empty"));
});
test("five filters preserve inactive zero and unrelated parameters, reset page and clear on Reset", () => {
  const state = hooks(),
    pushes = [];
  let values;
  const Filters = load(root + "_components/SeedPricesFilters.tsx", {
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
          reset: (next) => (values = next),
        };
      },
    },
    "next/navigation": {
      useSearchParams: () =>
        new URLSearchParams("page=3&extra=keep&is_active=1"),
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
        seed_id: "7",
        price_type: "mrp",
        region_scope: "specific",
        is_active: "0",
      },
      selection: null,
    });
  };
  findAll(render(), (e) => e.type === "form")[0].props.onSubmit();
  const query = new URLSearchParams(pushes[0].split("?")[1]);
  assert.equal(query.get("page"), null);
  assert.equal(query.get("keyword"), "seed");
  assert.equal(query.get("seed_id"), "7");
  assert.equal(query.get("price_type"), "mrp");
  assert.equal(query.get("region_scope"), "specific");
  assert.equal(query.get("is_active"), "0");
  assert.equal(query.get("extra"), "keep");
  findAll(
    render(),
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  assert.equal(pushes[1], "/admin/seed-prices?extra=keep");
});
function contentHarness(response) {
  const calls = [],
    redirects = [];
  const Content = load(root + "_components/SeedPricesContent.tsx", {
    "next-intl/server": translations,
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
    "@/i18n/navigation": {
      redirect(value) {
        redirects.push(value);
        throw Object.assign(Error("REDIRECT"), { controlFlow: true });
      },
    },
    "@/lib/apis/admin/seedPrices": {
      seedPricesAPI: {
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
    "@/types/admin/seedPrice": domain,
    "./SeedPricesFilters": mock("filters"),
    "./SeedPricesList": mock("list"),
  }).default;
  return { Content, calls, redirects };
}
test("server listing normalizes filters, preserves inactive zero and handles load failures without invented records", async () => {
  const h = contentHarness({ status: true, data: [price], pagination });
  const tree = await h.Content({
    searchParams: Promise.resolve({
      keyword: " seller ",
      seed_id: "7",
      price_type: "retail",
      region_scope: "specific",
      is_active: "0",
      page: "2",
    }),
  });
  assert.deepEqual(clone(h.calls[0]), {
    keyword: "seller",
    seed_id: "7",
    price_type: "retail",
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
      seed_id: "bad",
      price_type: "madeup",
      region_scope: "specific_regions",
      is_active: "bad",
    }),
  });
  assert.equal(findAll(failure, (e) => e.props.role === "alert").length, 1);
  assert.equal(failed.calls[0].seed_id, "");
  assert.equal(failed.calls[0].region_scope, "");
});
test("excessive pages redirect with applied filters and locale while retaining Next control flow", async () => {
  const h = contentHarness({
    status: true,
    data: [],
    pagination: { ...pagination, current_page: 8, last_page: 3 },
  });
  await assert.rejects(
    h.Content({
      searchParams: Promise.resolve({
        page: "8",
        seed_id: "7",
        is_active: "0",
      }),
    }),
    /REDIRECT/,
  );
  assert.equal(h.redirects[0].locale, "hi");
  assert.equal(h.redirects[0].href.query.page, 3);
  assert.equal(h.redirects[0].href.query.is_active, "0");
});
function editorHarness(record = price, canReview = true, missingSeed = false) {
  const calls = [];
  const Editor = load(root + "_components/SeedPriceEditor.tsx", {
    "next-intl/server": translations,
    "next/navigation": {
      notFound() {
        throw Object.assign(Error("NOT_FOUND"), { controlFlow: true });
      },
    },
    "@/lib/auth/dal": {
      requireAdmin: async () => ({ is_super_user: canReview }),
    },
    "@/lib/apis/admin/seedPrices": {
      seedPricesAPI: {
        show: async (id) => {
          calls.push(["price", id]);
          if (record instanceof ApiError) throw record;
          return { status: true, data: record };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async (kind) => {
        calls.push([kind]);
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
      getTimelineSelections: async () => ({}),
      getTimelineOption: async () => {
        throw new ApiError("Deleted seed", 404);
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": errorHandler,
    "./SeedPriceForm": mock("form"),
    "./SeedPriceDetails": mock("details"),
  }).default;
  return { Editor, calls };
}
test("editor loads price once, supplies saved districts and preserves deleted historical seed selection", async () => {
  const h = editorHarness();
  const tree = await h.Editor({ id: "4" });
  assert.equal(tree.type, "form");
  assert.equal(tree.props.selections.seed.id, 7);
  assert.deepEqual(
    h.calls.filter((call) => call[0] === "price"),
    [["price", 4]],
  );
  assert.deepEqual(h.calls.find((call) => call[0] === "regions")[1], regions);
  const missing = await editorHarness(price, true, true).Editor({ id: "4" });
  assert.equal(missing.props.selections.seed.id, 7);
  assert.equal(missing.props.price.seed, product);
});
test("ordinary active edits are read-only and view routes avoid selector requests; real 404 remains not-found", async () => {
  const h = editorHarness({ ...price, is_active: true }, false);
  const locked = await h.Editor({ id: "4" });
  assert.equal(findAll(locked, (e) => e.type === "details").length, 1);
  assert.equal(findAll(locked, (e) => e.props.role === "status").length, 1);
  assert.deepEqual(h.calls, [["price", 4]]);
  const view = editorHarness();
  await view.Editor({ id: "4", viewOnly: true });
  assert.deepEqual(view.calls, [["price", 4]]);
  await assert.rejects(
    editorHarness(new ApiError("Missing", 404)).Editor({ id: "4" }),
    /NOT_FOUND/,
  );
  await assert.rejects(view.Editor({ id: "invalid" }), /NOT_FOUND/);
});
test("row actions enforce publication permissions and defer deletion until confirmed, retaining conflicts for retry", async () => {
  const state = hooks(),
    calls = [];
  let resolve;
  const Actions = load(root + "_components/SeedPriceRowActions.tsx", {
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
    "@/actions/admin/seedPrices": {
      deleteSeedPrice: (id) => {
        calls.push(["delete", id]);
        return new Promise((done) => (resolve = done));
      },
      updateSeedPriceStatus: async (id, active) => {
        calls.push(["status", id, active]);
        return { success: true };
      },
    },
  }).default;
  const render = (record = price, canReview = false) => {
    state.reset();
    return Actions({ price: record, canReview });
  };
  assert.equal(
    findAll(
      render({ ...price, is_active: true }),
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
  assert.equal(
    findAll(
      render({ ...price, is_active: true }),
      (e) => e.type === "button" && e.props.children === "actions.delete",
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
  resolve({ success: false, message: "Referenced historical price" });
  await new Promise((done) => setImmediate(done));
  assert.match(dialog().props.description, /Referenced/);
  dialog().props.onClose();
  assert.equal(dialog(), undefined);
  findAll(
    render(price, true),
    (e) => e.type === "button" && e.props.children === "actions.activate",
  )[0].props.onClick();
  dialog().props.onConfirm();
  await new Promise((done) => setImmediate(done));
  assert.deepEqual(calls[1], ["status", 4, true]);
  assert.equal(dialog(), undefined);
});
test("messages have matching keys/ICU arguments, real Hindi, and labels for every verified enum", () => {
  const en = JSON.parse(
      fs.readFileSync("src/messages/en.json", "utf8"),
    ).seedPrices,
    hi = JSON.parse(fs.readFileSync("src/messages/hi.json", "utf8")).seedPrices;
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
  for (const type of domain.seedPriceTypes)
    assert.ok(en.types[type] && hi.types[type]);
  for (const unit of seeds.seedUnitCodes)
    assert.ok(en.units[unit] && hi.units[unit]);
  assert.match(hi.title, /[\u0900-\u097f]/);
});
