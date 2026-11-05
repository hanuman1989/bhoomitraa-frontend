const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsxRuntime = require("react/jsx-runtime");

const root = "src/app/[locale]/(admin)/admin/(pages)/crop-stages/";
const clone = (value) => JSON.parse(JSON.stringify(value));
const languages = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "hi", name: "Hindi", dir: "ltr" },
  { id: "ar", name: "Arabic", dir: "rtl" },
];
const payload = {
  crop_id: 3,
  code: "flowering",
  sequence: 4,
  translations: {
    en: { name: "Flowering", description: null },
    hi: { name: "पुष्पन", description: null },
  },
};
const stage = {
  id: 42,
  ...payload,
  crop_name: "Wheat",
  name: "Flowering",
  is_active: false,
  added_at: "5 Nov 2026 10:30 AM",
};
class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

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
function harness(responses = [], admin = true, locale = "en") {
  const requests = [],
    invalidations = [];
  async function request(url, options = {}) {
    requests.push({ url, options: clone(options) });
    assert.ok(responses.length, "unexpected backend request");
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response;
  }
  const service = load("src/lib/apis/admin/cropStages.ts", {
    "server-only": {},
    "next-intl/server": { getLocale: async () => locale },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/request": { apiRequest: request },
    "@/lib/apis/admin/crops": {
      cropsAPI: {
        list: (params) => request("/admin/crops", { params }),
        show: (id) => request(`/admin/crops/${id}`),
      },
    },
  });
  const actions = load("src/actions/admin/cropStages.ts", {
    "next/cache": { revalidatePath: (route) => invalidations.push(route) },
    "next-intl/server": {
      getTranslations: async () => (key, args) =>
        args?.message ? `${key}: ${args.message}` : key,
    },
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new Error("Unauthenticated");
      },
    },
    "@/i18n/languages": { languages },
    "@/types/admin/cropStage": { requiredStageLocales: ["en", "hi"] },
    "@/lib/apis/admin/cropStages": service,
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { success: false, message: error.message, errors: error.errors };
      },
    },
  });
  return { ...service, actions, requests, invalidations };
}

test("growth stage API uses verified routes, methods and pagination; metadata excludes status and immutable parent on update", async () => {
  const h = harness(Array(6).fill({ status: true, data: stage }));
  await h.cropStagesAPI.list({
    keyword: "flower",
    crop_id: 3,
    status: "0",
    page: 2,
    per_page: 15,
  });
  await h.cropStagesAPI.show(42);
  await h.cropStagesAPI.create(payload);
  const { crop_id: _crop, ...metadata } = payload;
  await h.cropStagesAPI.update(42, metadata);
  await h.cropStagesAPI.updateStatus(42, true);
  await h.cropStagesAPI.delete(42);
  assert.deepEqual(
    h.requests.map((request) => [request.url, request.options.method ?? "GET"]),
    [
      ["/admin/crop-stages", "GET"],
      ["/admin/crop-stages/42", "GET"],
      ["/admin/crop-stages", "POST"],
      ["/admin/crop-stages/42", "PATCH"],
      ["/admin/crop-stages/42/status", "PATCH"],
      ["/admin/crop-stages/42", "DELETE"],
    ],
  );
  assert.equal(h.requests[0].options.params.status, "0");
  assert.equal("crop_id" in h.requests[3].options.data, false);
  assert.deepEqual(h.requests[4].options.data, { is_active: true });
  assert.equal("data" in h.requests[5].options, false);
});

test("stage save allowlists writable fields, preserves omitted translations and creates inactive without a status request", async () => {
  const h = harness([{ status: true, data: stage }]);
  const result = await h.actions.saveCropStage(
    null,
    {
      ...payload,
      is_active: true,
      timeline: 20,
      translations: {
        ...payload.translations,
        ar: { name: "إزهار", description: null, id: 9 },
        old: { name: "Legacy", description: null },
      },
    },
    false,
  );
  assert.equal(result.success, true);
  assert.deepEqual(Object.keys(h.requests[0].options.data), [
    "crop_id",
    "code",
    "sequence",
    "translations",
  ]);
  assert.deepEqual(h.requests[0].options.data.translations.ar, {
    name: "إزهار",
    description: null,
  });
  assert.equal("old" in h.requests[0].options.data.translations, false);
  assert.equal(h.requests.length, 1);
  assert.ok(h.invalidations.includes("/[locale]/admin/crop-stages"));
});

test("partial activation failure retains committed ID and errors; retry updates instead of creating", async () => {
  const error = new ApiError("Parent crop inactive", 422, {
    crop_id: ["Activate parent first"],
  });
  const h = harness([
    { status: true, data: stage },
    error,
    { status: true, data: stage },
    { status: true, data: { ...stage, is_active: true } },
  ]);
  const result = await h.actions.saveCropStage(null, payload, true);
  assert.equal(result.success, false);
  assert.equal(result.data.id, 42);
  assert.equal(result.data.is_active, false);
  assert.equal(result.errors.crop_id[0], "Activate parent first");
  assert.equal(
    (
      await h.actions.saveCropStage(
        result.data.id,
        { ...payload, crop_id: 999 },
        true,
      )
    ).success,
    true,
  );
  assert.equal(h.requests[2].options.method, "PATCH");
  assert.equal("crop_id" in h.requests[2].options.data, false);
  assert.equal(
    h.requests.filter((request) => request.options.method === "POST").length,
    1,
  );
});

test("validation, sequence conflicts, referenced deletions and business failures stay recoverable without false success", async () => {
  const h = harness([
    new ApiError("Duplicate", 422, {
      sequence: ["Already used"],
      "translations.ar.name": ["Required"],
    }),
  ]);
  const result = await h.actions.saveCropStage(42, payload, false);
  assert.equal(result.errors.sequence[0], "Already used");
  assert.equal(result.errors["translations.ar.name"][0], "Required");
  assert.equal(h.invalidations.length, 0);
  const conflict = harness([
    new ApiError("Referenced; deactivate instead", 409),
  ]);
  assert.equal((await conflict.actions.deleteCropStage(42)).success, false);
  assert.equal(conflict.invalidations.length, 0);
  const business = harness([{ status: false, data: null }]);
  assert.equal(
    (await business.actions.saveCropStage(null, payload, true)).success,
    false,
  );
  assert.equal(business.requests.length, 1);
  assert.equal(business.invalidations.length, 0);
  const statusFailure = harness([
    { status: true, data: stage },
    { status: false, data: null },
  ]);
  assert.equal(
    (await statusFailure.actions.saveCropStage(null, payload, true)).data.id,
    42,
  );
});

test("all stage mutations authenticate, reject unsafe IDs, sequences and payloads, and preserve Next control flow", async () => {
  const h = harness();
  for (const id of [0, -1, 2.5, NaN, "42", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      (await h.actions.saveCropStage(id, payload, false)).success,
      false,
    );
    assert.equal((await h.actions.deleteCropStage(id)).success, false);
    assert.equal(
      (await h.actions.updateCropStageStatus(id, true)).success,
      false,
    );
  }
  for (const sequence of [0, -1, 65536, 2.5, Infinity])
    assert.equal(
      (await h.actions.saveCropStage(null, { ...payload, sequence }, false))
        .success,
      false,
    );
  assert.equal(
    (await h.actions.saveCropStage(null, null, false)).success,
    false,
  );
  assert.equal(
    (
      await h.actions.saveCropStage(
        null,
        { ...payload, translations: [] },
        false,
      )
    ).success,
    false,
  );
  assert.equal(h.requests.length, 0);
  const unauthenticated = harness([], false);
  await unauthenticated.actions.saveCropStage(null, payload, false);
  await unauthenticated.actions.deleteCropStage(42);
  await unauthenticated.actions.updateCropStageStatus(42, true);
  assert.equal(unauthenticated.requests.length, 0);
  const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
    controlFlow: true,
  });
  await assert.rejects(
    harness([redirect]).actions.saveCropStage(null, payload, false),
    /NEXT_REDIRECT/,
  );
});

test("crop options load all pages, apply active-only on create and retain backend labels on Hindi screens", async () => {
  const h = harness([
    {
      status: true,
      data: [{ id: 1, name: "Wheat", slug: "wheat" }],
      pagination: { last_page: 2 },
    },
    {
      status: true,
      data: [{ id: 2, name: "Rice", slug: "rice" }],
      pagination: { last_page: 2 },
    },
  ]);
  const options = await h.getCropStageCropOptions(true);
  assert.deepEqual(clone(options), [
    { id: 1, name: "Wheat" },
    { id: 2, name: "Rice" },
  ]);
  assert.equal(h.requests[1].options.params.page, 2);
  assert.equal(h.requests[0].options.params.is_active, 1);
  const hi = harness(
    [
      {
        status: true,
        data: [{ id: 1, name: "गेहूँ" }],
        pagination: { last_page: 1 },
      },
    ],
    true,
    "hi",
  );
  assert.equal((await hi.getCropStageCropOptions(false))[0].name, "गेहूँ");
  assert.equal(hi.requests.length, 1);
  assert.equal("is_active" in hi.requests[0].options.params, false);
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
const ui = {
  "next-intl": { useTranslations: () => (key) => key },
  "@/i18n/navigation": { Link: "a" },
  "@/i18n/languages": {
    languages,
    getLanguage: (id) => languages.find((language) => language.id === id),
  },
  "@/types/admin/cropStage": { requiredStageLocales: ["en", "hi"] },
  "@/components/admin/form/input/InputField": {
    __esModule: true,
    default: "input",
  },
  "@/components/admin/form/Label": { __esModule: true, default: "label" },
};

test("stage translations require English/Hindi, allow optional blanks, reject description-only drafts and preserve legacy fields", () => {
  let description = "";
  const rules = {};
  const Component = load(
    `${root}_components/CropStageTranslations.tsx`,
    ui,
  ).default;
  const form = {
    register: (name, options) => {
      rules[name] = options;
      return { name };
    },
    getValues: () => description,
    trigger() {},
    formState: {
      errors: { translations: { ar: { name: { message: "Required" } } } },
    },
  };
  const tree = Component({
    form,
    locales: ["en", "hi", "ar", "old"],
    savedLocales: ["old"],
  });
  assert.equal(
    rules["translations.en.name"].required,
    "validation.nameRequired",
  );
  assert.equal(
    rules["translations.hi.name"].required,
    "validation.nameRequired",
  );
  assert.equal(rules["translations.ar.name"].validate(""), true);
  description = "Description";
  assert.equal(
    rules["translations.ar.name"].validate(" "),
    "validation.nameRequired",
  );
  assert.equal(rules["translations.ar.name"].validate("إزهار"), true);
  const inputs = findAll(tree, (element) => element.type === "input");
  assert.equal(inputs[2].props.dir, "rtl");
  assert.equal(inputs[2].props["aria-invalid"], true);
  assert.equal(inputs[3].props.readOnly, true);
  assert.equal(
    findAll(
      tree,
      (element) => element.type === "button" || element.type === "select",
    ).length,
    0,
  );
  Component({ form, locales: ["ar"], savedLocales: ["ar"] });
  assert.equal(
    rules["translations.ar.name"].required,
    "validation.nameRequired",
  );
});

test("stage basic fields validate code and sequence, and edit parent crop is read-only", () => {
  const rules = {};
  const Component = load(`${root}_components/CropStageBasicFields.tsx`, {
    ...ui,
    "@/icons": { InfoIcon: () => null },
    "@/components/admin/common/ComponentCard": {
      __esModule: true,
      default: "card",
    },
  }).default;
  const form = {
    register: (name, options) => {
      rules[name] = options;
      return { name };
    },
    formState: { errors: {} },
  };
  Component({ form, stage: null, crops: [{ id: 3, name: "Wheat" }] });
  assert.equal(rules.code.pattern.value.test("grain-filling"), true);
  assert.equal(rules.code.pattern.value.test("Bad_Code"), false);
  assert.equal(rules.code.maxLength.value, 50);
  assert.equal(rules.sequence.validate("4"), true);
  assert.equal(rules.sequence.validate("4.5"), "validation.sequence");
  assert.equal(rules.sequence.validate("65536"), "validation.sequence");
  const edit = Component({ form, stage, crops: [] });
  assert.equal(findAll(edit, (element) => element.type === "select").length, 0);
  assert.equal(
    findAll(edit, (element) => element.props.id === "stage-crop")[0].props
      .readOnly,
    true,
  );
});

test("stage messages have matching English/Hindi keys and parameters", () => {
  const en = require("../src/messages/en.json").cropStages,
    hi = require("../src/messages/hi.json").cropStages;
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

test("stage list keeps backend sequence order and exactly the seven approved columns", () => {
  const List = load(`${root}_components/CropStagesList.tsx`, {
    ...ui,
    "@/icons": { LeafIcon: () => null, PlusIcon: () => null },
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
    "./CropStageRowActions": { __esModule: true, default: "actions" },
  }).default;
  const tree = List({
    result: {
      data: [
        { ...stage, id: 5, sequence: 5, name: null, code: "grain-filling" },
        stage,
      ],
      pagination: { from: 1, to: 2, total: 12, current_page: 1, last_page: 6 },
    },
    filtered: false,
  });
  assert.deepEqual(
    findAll(tree, (element) => element.props.isHeader).map(
      (element) => element.props.children,
    ),
    [
      "fields.name",
      "fields.crop",
      "fields.code",
      "fields.sequence",
      "fields.status",
      "fields.addedAt",
      "fields.actions",
    ],
  );
  const actions = findAll(tree, (element) => element.type === "actions");
  assert.deepEqual(
    actions.map((element) => element.props.stage.sequence),
    [5, 4],
  );
  assert.equal(actions[0].props.name, "grain-filling");
  assert.equal(
    findAll(
      tree,
      (element) =>
        element.type === "badge" && element.props.children === "Wheat",
    ).length,
    2,
  );
  assert.equal(
    findAll(tree, (element) => element.type === "pagination")[0].props
      .totalPages,
    6,
  );
});

test("stage filter navigation preserves inactive zero and unrelated params, resets page and clears all filters", () => {
  const hooks = [];
  let cursor = 0;
  const navigations = [];
  const Filters = load(`${root}_components/CropStagesFilters.tsx`, {
    ...ui,
    react: {
      useState(initial) {
        const index = cursor++;
        hooks[index] ??= initial;
        return [
          hooks[index],
          (next) => {
            hooks[index] =
              typeof next === "function" ? next(hooks[index]) : next;
          },
        ];
      },
      useTransition: () => [false, (task) => task()],
    },
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("page=3&status=1&custom=keep"),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (url) => navigations.push(url) }),
    },
    "@/components/admin/common/FilterSelect": {
      __esModule: true,
      default: "select",
    },
  }).default;
  const props = {
    initialFilters: { keyword: "flower", crop_id: "3", status: "1" },
    crops: [{ id: 3, name: "Wheat" }],
  };
  const render = () => {
    cursor = 0;
    return Filters(props);
  };
  let tree = render();
  findAll(
    tree,
    (element) => element.props.id === "stage-filter-status",
  )[0].props.onChange({ target: { value: "0" } });
  tree = render();
  tree.props.onSubmit({ preventDefault() {} });
  const applied = new URL(navigations[0], "http://localhost").searchParams;
  assert.equal(applied.get("status"), "0");
  assert.equal(applied.get("crop_id"), "3");
  assert.equal(applied.get("page"), null);
  assert.equal(applied.get("custom"), "keep");
  findAll(
    tree,
    (element) => element.type === "button" && element.props.type === "button",
  )[0].props.onClick();
  const reset = new URL(navigations[1], "http://localhost").searchParams;
  assert.equal(reset.get("status"), null);
  assert.equal(reset.get("crop_id"), null);
  assert.equal(reset.get("keyword"), null);
});

test("server stage listing normalizes URL parameters and redirects excessive pages without changing filters", async () => {
  const calls = [];
  const Content = load(`${root}_components/CropStagesContent.tsx`, {
    "next-intl/server": {
      getLocale: async () => "en",
      getTranslations: async () => (key) => key,
    },
    "@/i18n/navigation": {
      redirect: (destination) => {
        throw Object.assign(new Error("Redirect"), { destination });
      },
    },
    "@/lib/auth/dal": { requireAdmin: async () => {} },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        throw error;
      },
    },
    "@/lib/apis/admin/cropStages": {
      getCropStageCropOptions: async () => [],
      cropStagesAPI: {
        list: async (params) => {
          calls.push(clone(params));
          return {
            status: true,
            data: [stage],
            pagination: { current_page: params.page, last_page: 2 },
          };
        },
      },
    },
    "./CropStagesFilters": { __esModule: true, default: "filters" },
    "./CropStagesList": { __esModule: true, default: "list" },
  }).default;
  await Content({
    searchParams: Promise.resolve({
      keyword: [" flower ", "ignored"],
      crop_id: "3",
      status: "0",
      page: "invalid",
    }),
  });
  assert.deepEqual(calls[0], {
    keyword: "flower",
    crop_id: 3,
    status: "0",
    page: 1,
    per_page: 15,
  });
  await assert.rejects(
    Content({
      searchParams: Promise.resolve({ crop_id: "3", status: "0", page: "8" }),
    }),
    (error) => {
      assert.equal(error.destination.href.query.page, 2);
      assert.equal(error.destination.href.query.crop_id, "3");
      assert.equal(error.destination.href.query.status, "0");
      return true;
    },
  );
});
