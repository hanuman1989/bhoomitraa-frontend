const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsxRuntime = require("react/jsx-runtime");

const clone = (value) => JSON.parse(JSON.stringify(value));
const root = "src/app/[locale]/(admin)/admin/(pages)/seasons/";
const languages = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "hi", name: "Hindi", dir: "ltr" },
  { id: "ar", name: "Arabic", dir: "rtl" },
];
const payload = {
  slug: "rabi",
  translations: {
    en: { name: "Rabi", description: null },
    hi: { name: "रबी", description: "" },
  },
};
const season = {
  id: 42,
  ...payload,
  name: "Rabi",
  description: null,
  is_active: false,
  added_at: "5 Nov 2026 10:30 AM",
};

function load(file, dependencies) {
  const compiledModule = { exports: {} };
  const source = ts.transpileModule(
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
  vm.runInNewContext(source, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    URLSearchParams,
  });
  return compiledModule.exports;
}

function harness(responses = [], admin = true) {
  const requests = [];
  const invalidations = [];
  const api = load("src/lib/apis/admin/seasons.ts", {
    "server-only": {},
    "@/lib/api/request": {
      apiRequest: async (url, options = {}) => {
        requests.push({ url, options: clone(options) });
        assert.ok(responses.length, "unexpected backend call");
        const result = responses.shift();
        if (result instanceof Error) throw result;
        return result;
      },
    },
  }).seasonsAPI;
  const actions = load("src/actions/admin/seasons.ts", {
    "next/cache": {
      revalidatePath: (route, type) => invalidations.push({ route, type }),
    },
    "next-intl/server": {
      getTranslations: async () => (key, values) =>
        values?.message ? `${key}: ${values.message}` : key,
    },
    "@/i18n/languages": { languages },
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new Error("Unauthenticated");
      },
    },
    "@/lib/apis/admin/seasons": { seasonsAPI: api },
    "@/types/admin/season": { requiredSeasonLocales: ["en", "hi"] },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { success: false, message: error.message, errors: error.errors };
      },
    },
  });
  return { api, actions, requests, invalidations };
}

test("season service uses the verified endpoints, verbs and server pagination parameters", async () => {
  const h = harness(Array(6).fill({ status: true, data: season }));
  await h.api.list({ keyword: "rabi", status: "0", page: 2, per_page: 15 });
  await h.api.show(42);
  await h.api.create(payload);
  await h.api.update(42, payload);
  await h.api.updateStatus(42, true);
  await h.api.delete(42);
  assert.deepEqual(
    h.requests.map((request) => [request.url, request.options.method ?? "GET"]),
    [
      ["/admin/seasons", "GET"],
      ["/admin/seasons/42", "GET"],
      ["/admin/seasons", "POST"],
      ["/admin/seasons/42", "PATCH"],
      ["/admin/seasons/42/status", "PATCH"],
      ["/admin/seasons/42", "DELETE"],
    ],
  );
  assert.equal(h.requests[0].options.params.status, "0");
  assert.equal(h.requests[0].options.params.page, 2);
  assert.deepEqual(h.requests[4].options.data, { is_active: true });
  assert.equal("data" in h.requests[5].options, false);
});

test("create defaults inactive; allowlisting saves selected configured languages and omits unsupported fields", async () => {
  const h = harness([{ status: true, data: season }]);
  const result = await h.actions.saveSeason(
    null,
    {
      ...payload,
      is_active: true,
      month: 10,
      translations: {
        ...payload.translations,
        ar: { name: "ربيع", description: "", reviewed_by: 1 },
        old: { name: "Preserved in Laravel", description: null },
      },
    },
    false,
  );
  assert.equal(result.success, true);
  assert.equal(result.data.is_active, false);
  assert.deepEqual(Object.keys(h.requests[0].options.data), [
    "slug",
    "translations",
  ]);
  assert.deepEqual(h.requests[0].options.data.translations.ar, {
    name: "ربيع",
    description: "",
  });
  assert.equal("old" in h.requests[0].options.data.translations, false);
  assert.equal(h.requests.length, 1);
  assert.ok(
    h.invalidations.some(
      (item) =>
        item.route === "/[locale]/admin/seasons" && item.type === "page",
    ),
  );
});

test("absent optional translations stay omitted; status only changes after metadata commits", async () => {
  const h = harness([
    { status: true, data: season },
    { status: true, data: { ...season, is_active: true } },
  ]);
  const result = await h.actions.saveSeason(null, payload, true);
  assert.equal(result.success, true);
  assert.equal(result.data.is_active, true);
  assert.equal("ar" in h.requests[0].options.data.translations, false);
  assert.deepEqual(h.requests[1], {
    url: "/admin/seasons/42/status",
    options: { method: "PATCH", data: { is_active: true } },
  });
});

test("failed activation returns the committed inactive record and nested errors; retry patches that ID", async () => {
  const error = Object.assign(new Error("Names required"), {
    errors: { "translations.hi.name": ["Required"] },
  });
  const h = harness([
    { status: true, data: season },
    error,
    { status: true, data: season },
    { status: true, data: { ...season, is_active: true } },
  ]);
  const partial = await h.actions.saveSeason(null, payload, true);
  assert.equal(partial.success, false);
  assert.equal(partial.data.id, 42);
  assert.equal(partial.data.is_active, false);
  assert.equal(partial.errors["translations.hi.name"][0], "Required");
  assert.match(partial.message, /statusSaveFailed/);
  const retry = await h.actions.saveSeason(partial.data.id, payload, true);
  assert.equal(retry.success, true);
  assert.equal(
    h.requests.filter((request) => request.options.method === "POST").length,
    1,
  );
  assert.equal(h.requests[2].url, "/admin/seasons/42");
  assert.equal(h.requests[2].options.method, "PATCH");
});

test("metadata rejection never activates or revalidates, and business status failures retain the saved ID", async () => {
  const rejected = harness([
    { status: false, data: null, message: "Rejected" },
  ]);
  assert.equal(
    (await rejected.actions.saveSeason(null, payload, true)).success,
    false,
  );
  assert.equal(rejected.requests.length, 1);
  assert.equal(rejected.invalidations.length, 0);
  const partial = harness([
    { status: true, data: season },
    { status: false, data: null },
  ]);
  const result = await partial.actions.saveSeason(null, payload, true);
  assert.equal(result.success, false);
  assert.equal(result.data.id, 42);
});

test("every season mutation authenticates and validates IDs and runtime payloads before requests", async () => {
  const h = harness();
  for (const id of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1, "42"]) {
    assert.equal(
      (await h.actions.saveSeason(id, payload, false)).success,
      false,
    );
    assert.equal((await h.actions.updateSeasonStatus(id, true)).success, false);
    assert.equal((await h.actions.deleteSeason(id)).success, false);
  }
  for (const value of [
    null,
    {},
    { ...payload, translations: [] },
    { ...payload, translations: { en: { name: "Rabi" } } },
    {
      ...payload,
      translations: {
        ...payload.translations,
        ar: { name: 3, description: null },
      },
    },
  ])
    assert.equal(
      (await h.actions.saveSeason(null, value, false)).success,
      false,
    );
  assert.equal((await h.actions.updateSeasonStatus(42, "true")).success, false);
  assert.equal(
    (await h.actions.saveSeason(null, payload, "false")).success,
    false,
  );
  assert.equal(h.requests.length, 0);
  const unauthenticated = harness([], false);
  assert.equal(
    (await unauthenticated.actions.saveSeason(null, payload, false)).success,
    false,
  );
  assert.equal(
    (await unauthenticated.actions.updateSeasonStatus(42, true)).success,
    false,
  );
  assert.equal((await unauthenticated.actions.deleteSeason(42)).success, false);
  assert.equal(unauthenticated.requests.length, 0);
});

test("Laravel field errors and deletion conflicts remain failures; Next control flow is rethrown", async () => {
  const error = Object.assign(new Error("Duplicate slug"), {
    status: 422,
    errors: { slug: ["Already used"], "translations.ar.name": ["Required"] },
  });
  const invalid = harness([error]);
  const result = await invalid.actions.saveSeason(42, payload, false);
  assert.equal(result.errors["translations.ar.name"][0], "Required");
  assert.equal(invalid.invalidations.length, 0);
  const conflict = harness([
    Object.assign(new Error("Referenced season. Deactivate it instead."), {
      status: 409,
    }),
  ]);
  const deletion = await conflict.actions.deleteSeason(42);
  assert.equal(deletion.success, false);
  assert.match(deletion.message, /Deactivate/);
  assert.equal(conflict.invalidations.length, 0);
  const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
    controlFlow: true,
  });
  await assert.rejects(
    harness([redirect]).actions.saveSeason(null, payload, false),
    /NEXT_REDIRECT/,
  );
});

test("English and Hindi season messages have matching keys and interpolation parameters", () => {
  const en = require("../src/messages/en.json").seasons;
  const hi = require("../src/messages/hi.json").seasons;
  function compare(first, second) {
    assert.deepEqual(Object.keys(first).sort(), Object.keys(second).sort());
    for (const key of Object.keys(first)) {
      if (typeof first[key] === "object") compare(first[key], second[key]);
      else {
        const parameters = (value) =>
          [...value.matchAll(/\{(\w+)(?:[,}])/g)]
            .map((match) => match[1])
            .sort();
        assert.deepEqual(parameters(first[key]), parameters(second[key]), key);
      }
    }
  }
  compare(en, hi);
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
function uiDependencies(extra = {}) {
  return {
    "next-intl": { useTranslations: () => (key) => key },
    "@/i18n/navigation": { Link: "a" },
    "@/i18n/languages": {
      languages,
      getLanguage: (id) => languages.find((language) => language.id === id),
    },
    "@/components/admin/form/input/InputField": {
      __esModule: true,
      default: "input",
    },
    "@/components/admin/form/Label": { __esModule: true, default: "label" },
    ...extra,
  };
}

test("season translation panels preserve validation, direction and nested errors without language controls", () => {
  const rules = {};
  const fields = load(
    `${root}_components/SeasonTranslations.tsx`,
    uiDependencies(),
  ).default({
    form: {
      register: (field, options) => {
        rules[field] = options;
        return { name: field };
      },
      formState: {
        errors: {
          translations: { ar: { name: { message: "Arabic name required" } } },
        },
      },
    },
    locales: ["en", "hi", "ar"],
  });
  const names = findAll(fields, (element) => element.type === "input");
  assert.equal(names.length, 3);
  assert.equal(names[2].props.dir, "rtl");
  assert.equal(names[2].props.lang, "ar");
  assert.equal(names[2].props["aria-invalid"], true);
  assert.equal(names[2].props["aria-describedby"], "season-ar-name-error");
  assert.equal(
    rules["translations.ar.name"].validate("   "),
    "validation.nameRequired",
  );
  assert.equal(rules["translations.ar.name"].validate("ربيع"), true);
  assert.equal(rules["translations.ar.name"].maxLength.value, 255);
  assert.equal(
    findAll(fields, (element) => element.type === "button").length,
    0,
  );
  assert.equal(
    findAll(fields, (element) => element.type === "select").length,
    0,
  );
});

function hooks() {
  const state = [];
  let cursor = 0;
  return {
    reset() {
      cursor = 0;
    },
    react: {
      useState(initial) {
        const index = cursor++;
        state[index] ??= { value: initial };
        return [
          state[index].value,
          (next) => {
            state[index].value =
              typeof next === "function" ? next(state[index].value) : next;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        state[index] ??= { current: initial };
        return state[index];
      },
      useTransition: () => [false, (task) => task()],
    },
  };
}

test("season filters preserve unrelated URL parameters and inactive zero, reset pagination, and clear controls on Reset", () => {
  const state = hooks();
  const navigations = [];
  const Filters = load(
    `${root}_components/SeasonsFilters.tsx`,
    uiDependencies({
      react: state.react,
      "next/navigation": {
        useSearchParams: () =>
          new URLSearchParams("keyword=old&status=1&page=3&custom=keep"),
      },
      "@/i18n/navigation": {
        useRouter: () => ({ push: (url) => navigations.push(url) }),
      },
      "@/components/admin/common/FilterSelect": {
        __esModule: true,
        default: "select",
      },
      "@/icons": { SearchIcon: () => null },
    }),
  ).default;
  const props = { initialFilters: { keyword: "old", status: "1" } };
  const render = () => {
    state.reset();
    return Filters(props);
  };
  let tree = render();
  findAll(tree, (element) => element.type === "select")[0].props.onChange({
    target: { value: "0" },
  });
  findAll(tree, (element) => element.type === "input")[0].props.onChange({
    target: { value: "rabi" },
  });
  tree = render();
  tree.props.onSubmit({ preventDefault() {} });
  let query = new URL(navigations[0], "http://localhost").searchParams;
  assert.equal(query.get("status"), "0");
  assert.equal(query.get("keyword"), "rabi");
  assert.equal(query.get("page"), null);
  assert.equal(query.get("custom"), "keep");
  findAll(
    tree,
    (element) => element.type === "button" && element.props.type === "button",
  )[0].props.onClick();
  query = new URL(navigations[1], "http://localhost").searchParams;
  assert.equal(query.get("keyword"), null);
  assert.equal(query.get("status"), null);
  assert.equal(query.get("page"), null);
  assert.equal(query.get("custom"), "keep");
  assert.equal(
    findAll(render(), (element) => element.type === "input")[0].props.value,
    "",
  );
});

function contentHarness(locale = "en", totalPages = 2) {
  const calls = [];
  class ApiError extends Error {}
  const content = load(`${root}_components/SeasonsContent.tsx`, {
    "next-intl/server": {
      getLocale: async () => locale,
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
    "@/lib/apis/admin/seasons": {
      seasonsAPI: {
        list: async (params) => {
          calls.push({ kind: "list", ...clone(params) });
          return {
            status: true,
            data: [
              {
                ...season,
                name: locale === "hi" ? "रबी" : season.name,
                description:
                  locale === "hi" ? "सर्दियों की फसल का मौसम।" : null,
              },
            ],
            pagination: { current_page: params.page, last_page: totalPages },
          };
        },
        show: async (id) => {
          calls.push({ kind: "show", id });
          return { status: true, data: season };
        },
      },
    },
    "./SeasonsFilters": { __esModule: true, default: "filters" },
    "./SeasonList": { __esModule: true, default: "list" },
  }).default;
  return { content, calls };
}

test("server listing normalizes query values and avoids repeated listing reads", async () => {
  const h = contentHarness();
  const tree = await h.content({
    searchParams: Promise.resolve({
      keyword: ["  rabi  ", "ignored"],
      status: "0",
      page: "invalid",
    }),
  });
  assert.deepEqual(h.calls, [
    { kind: "list", keyword: "rabi", status: "0", page: 1, per_page: 15 },
  ]);
  assert.equal(
    findAll(tree, (element) => element.type === "list")[0].props.filtered,
    true,
  );
  const invalid = contentHarness();
  await invalid.content({
    searchParams: Promise.resolve({
      keyword: "x".repeat(200),
      status: "false",
      page: "-3",
    }),
  });
  assert.equal(invalid.calls[0].keyword.length, 150);
  assert.equal(invalid.calls[0].status, "");
  assert.equal(invalid.calls[0].page, 1);
});

test("Hindi listing retains backend names without detail reads and out-of-range pages redirect with filters", async () => {
  const h = contentHarness("hi");
  const tree = await h.content({
    searchParams: Promise.resolve({ keyword: "rabi", status: "0" }),
  });
  const listing = findAll(tree, (element) => element.type === "list")[0];
  assert.equal(listing.props.result.data[0].name, "रबी");
  assert.equal(
    listing.props.result.data[0].description,
    "सर्दियों की फसल का मौसम।",
  );
  assert.deepEqual(
    h.calls.map((call) => call.kind),
    ["list"],
  );
  const outOfRange = contentHarness();
  await assert.rejects(
    outOfRange.content({
      searchParams: Promise.resolve({
        keyword: "rabi",
        status: "0",
        page: "9",
      }),
    }),
    (error) => {
      assert.equal(error.destination.href.query.page, 2);
      assert.equal(error.destination.href.query.status, "0");
      assert.equal(error.destination.href.query.keyword, "rabi");
      return true;
    },
  );
});

test("Crop Variety preserves its translation fields and direction without language controls", () => {
  const fields = load(
    "src/app/[locale]/(admin)/admin/(pages)/crop-varieties/_components/CropVarietyTranslations.tsx",
    uiDependencies(),
  ).default({
    form: {
      register: (name) => ({ name }),
      formState: { errors: {}, isSubmitting: false },
    },
    locales: ["en", "hi", "ar"],
  });
  assert.equal(
    findAll(fields, (element) => element.type === "input").length,
    3,
  );
  assert.equal(
    findAll(fields, (element) => element.type === "textarea").length,
    6,
  );
  const arabicNotes = findAll(
    fields,
    (element) => element.props.name === "translations.ar.region_notes",
  )[0];
  assert.equal(arabicNotes.props.dir, "rtl");
  assert.equal(
    findAll(fields, (element) => element.type === "button").length,
    0,
  );
  assert.equal(
    findAll(fields, (element) => element.type === "select").length,
    0,
  );
});

test("season table renders exactly five columns with backend dates, names and descriptions", () => {
  const List = load(
    `${root}_components/SeasonList.tsx`,
    uiDependencies({
      "@/icons": { CalenderIcon: () => null, PlusIcon: () => null },
      "@/components/admin/ui/badge/Badge": {
        __esModule: true,
        default: "badge",
      },
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
      "./SeasonRowActions": { __esModule: true, default: "actions" },
    }),
  ).default;
  const tree = List({
    result: {
      data: [
        { ...season, name: "रबी", description: "सर्दियों की फसल का मौसम।" },
      ],
      pagination: { total: 4, current_page: 1, last_page: 1, from: 1, to: 1 },
    },
    filtered: false,
  });
  const headers = findAll(
    tree,
    (element) => element.type === "td" && element.props.isHeader,
  );
  assert.deepEqual(
    headers.map((element) => element.props.children),
    [
      "fields.name",
      "fields.slug",
      "fields.status",
      "fields.addedAt",
      "fields.actions",
    ],
  );
  assert.equal(
    findAll(tree, (element) => element.props.children === "5 Nov 2026 10:30 AM")
      .length,
    1,
  );
  assert.equal(
    findAll(tree, (element) => element.type === "actions")[0].props.name,
    "रबी",
  );
  assert.equal(
    findAll(
      tree,
      (element) =>
        element.type === "p" &&
        element.props.children === "सर्दियों की फसल का मौसम।",
    ).length,
    1,
  );
  assert.equal(
    findAll(
      tree,
      (element) => element.type === "a" && element.props.children === "रबी",
    ).length,
    1,
  );
  assert.equal(
    findAll(tree, (element) => element.type === "pagination")[0].props
      .totalPages,
    1,
  );
});

test("season deletion waits for confirmation, blocks duplicate submission and dismissal, and keeps conflicts open for retry", async () => {
  const state = hooks();
  let task;
  let requests = 0;
  let closed = 0;
  const errors = [];
  const successes = [];
  const Confirm = load(`${root}_components/SeasonConfirmDialog.tsx`, {
    react: {
      ...state.react,
      useTransition: () => [
        false,
        (callback) => {
          task = Promise.resolve().then(callback);
        },
      ],
    },
    "next-intl": { useTranslations: () => (key) => key },
    "@headlessui/react": {
      Dialog: "dialog",
      DialogBackdrop: "backdrop",
      DialogPanel: "panel",
      DialogTitle: "title",
      Description: "description",
    },
    "react-hot-toast": {
      __esModule: true,
      default: {
        error: (message) => errors.push(message),
        success: (message) => successes.push(message),
      },
    },
    "@/actions/admin/seasons": {
      deleteSeason: async () => {
        requests++;
        return requests === 1
          ? { success: false, message: "Referenced; deactivate instead" }
          : { success: true, message: "Deleted" };
      },
      updateSeasonStatus: async () => {
        throw new Error("Unexpected status update");
      },
    },
  }).default;
  const props = {
    season,
    name: "Rabi",
    operation: "delete",
    onClose: () => closed++,
  };
  const render = () => {
    state.reset();
    return Confirm(props);
  };
  let tree = render();
  assert.equal(requests, 0);
  const confirm = findAll(
    tree,
    (element) =>
      element.type === "button" && element.props.children === "actions.delete",
  )[0];
  confirm.props.onClick();
  confirm.props.onClick();
  tree.props.onClose();
  assert.equal(closed, 0);
  await task;
  assert.equal(requests, 1);
  assert.equal(successes.length, 0);
  assert.equal(errors[0], "Referenced; deactivate instead");
  tree = render();
  assert.equal(
    findAll(tree, (element) => element.props.role === "alert")[0].props
      .children,
    errors[0],
  );
  findAll(
    tree,
    (element) =>
      element.type === "button" && element.props.children === "actions.delete",
  )[0].props.onClick();
  await task;
  assert.equal(requests, 2);
  assert.equal(closed, 1);
  assert.deepEqual(successes, ["Deleted"]);
});
