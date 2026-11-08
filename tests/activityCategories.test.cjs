const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root =
  "src/app/[locale]/(admin)/admin/(pages)/activity-categories/_components/";
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
const icons = Object.fromEntries(
  [
    "AgricultureIcon",
    "CropCategoryIcon",
    "LeafIcon",
    "SeedIcon",
    "TaskIcon",
    "ListIcon",
    "CalenderIcon",
    "TimeIcon",
    "KnowledgeSourcesIcon",
    "TractorIcon",
    "SproutIcon",
    "DropletsIcon",
    "FlaskConicalIcon",
    "ShieldCheckIcon",
    "ScanEyeIcon",
    "ChartNoAxesColumnIncreasingIcon",
    "BotIcon",
    "UserRoundCheckIcon",
    "HarvestingIcon",
    "ClipboardListIcon",
    "MoreDotIcon",
    "PencilIcon",
    "TrashBinIcon",
    "PlusIcon",
    "SearchIcon",
    "CheckLineIcon",
    "ChevronDownIcon",
  ].map((id) => [id, () => null]),
);
const registry = load("src/icons/activityCategoryIcons.ts", {
  "@/icons": icons,
});
const domain = load("src/types/admin/activityCategory.ts");
const payload = {
  slug: "irrigation",
  icon: "LeafIcon",
  is_system: false,
  translations: {
    en: { name: "Irrigation", description: null },
    hi: { name: "सिंचाई", description: null },
  },
};
const category = {
  ...payload,
  id: 42,
  name: "Irrigation",
  is_active: false,
  added_at: "6 Nov 2026 10:30 AM",
};
const pagination = { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 };
function harness(responses = [], admin = { is_super_user: false }) {
  const requests = [],
    invalidations = [];
  const service = load("src/lib/apis/admin/activityCategories.ts", {
    "server-only": {},
    "@/lib/api/request": {
      apiRequest: async (url, options = {}) => {
        requests.push({ url, options: clone(options) });
        assert.ok(responses.length, "Unexpected backend request");
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response;
      },
    },
  });
  const actions = load("src/actions/admin/activityCategories.ts", {
    "next/cache": { revalidatePath: (route) => invalidations.push(route) },
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new Error("Unauthenticated");
        return admin;
      },
    },
    "@/i18n/languages": { languages },
    "@/types/admin/activityCategory": domain,
    "@/icons/activityCategoryIcons": registry,
    "@/lib/apis/admin/activityCategories": service,
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { success: false, message: error.message, errors: error.errors };
      },
    },
  });
  return { ...service, actions, requests, invalidations };
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
const ui = {
  "next-intl": { useTranslations: () => (key) => key },
  "@/i18n/navigation": { Link: "link" },
  "@/icons": icons,
  "@/icons/activityCategoryIcons": registry,
  "@/types/admin/activityCategory": domain,
  "@/i18n/languages": {
    languages,
    getLanguage: (id) => languages.find((language) => language.id === id),
  },
  "@/components/admin/form/input/InputField": {
    __esModule: true,
    default: "input",
  },
  "@/components/admin/form/Label": { __esModule: true, default: "label" },
  "@/components/admin/common/ComponentCard": {
    __esModule: true,
    default: "card",
  },
};
function hooks() {
  const states = [];
  let cursor = 0,
    job;
  const react = {
    useRef(initial) {
      const i = cursor++;
      states[i] ??= { current: initial };
      return states[i];
    },
    useState(initial) {
      const i = cursor++;
      states[i] ??= { value: initial };
      return [
        states[i].value,
        (value) => {
          states[i].value =
            typeof value === "function" ? value(states[i].value) : value;
        },
      ];
    },
    useTransition() {
      const i = cursor++;
      states[i] ??= { value: false };
      return [
        states[i].value,
        (callback) => {
          states[i].value = true;
          job = Promise.resolve()
            .then(callback)
            .finally(() => {
              states[i].value = false;
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

test("activity category service uses all six verified routes, pagination filters and body-free deletion", async () => {
  const h = harness(Array(6).fill({ status: true, data: category }));
  await h.activityCategoriesAPI.list({
    keyword: "water",
    status: "0",
    is_system: "0",
    page: 2,
  });
  await h.activityCategoriesAPI.show(42);
  await h.activityCategoriesAPI.create(payload);
  await h.activityCategoriesAPI.update(42, {
    slug: "irrigation",
    icon: null,
    translations: payload.translations,
  });
  await h.activityCategoriesAPI.updateStatus(42, true);
  await h.activityCategoriesAPI.delete(42);
  assert.deepEqual(
    h.requests.map(({ url, options }) => [url, options.method ?? "GET"]),
    [
      ["/admin/activity-categories", "GET"],
      ["/admin/activity-categories/42", "GET"],
      ["/admin/activity-categories", "POST"],
      ["/admin/activity-categories/42", "PATCH"],
      ["/admin/activity-categories/42/status", "PATCH"],
      ["/admin/activity-categories/42", "DELETE"],
    ],
  );
  assert.equal(h.requests[0].options.params.status, "0");
  assert.equal(h.requests[0].options.params.is_system, "0");
  assert.equal("data" in h.requests[5].options, false);
});

test("creates allowlist configured translations and safe icon IDs, remain inactive and revalidate only after saving", async () => {
  const h = harness([{ status: true, data: category }]);
  const result = await h.actions.saveActivityCategory(null, {
    ...payload,
    is_active: true,
    translations: {
      ...payload.translations,
      ar: { name: "ري", description: "", id: 99 },
      legacy: { name: "Retain in Laravel" },
    },
  });
  assert.equal(result.success, true);
  assert.equal(result.data.is_active, false);
  assert.equal(h.requests.length, 1);
  assert.deepEqual(Object.keys(h.requests[0].options.data).sort(), [
    "icon",
    "is_system",
    "slug",
    "translations",
  ]);
  assert.deepEqual(h.requests[0].options.data.translations.ar, {
    name: "ري",
    description: "",
  });
  assert.equal("legacy" in h.requests[0].options.data.translations, false);
  assert.equal(h.invalidations.length, 2);
  const privileged = harness(
    [{ status: true, data: { ...category, is_system: true } }],
    { is_super_user: true },
  );
  assert.equal(
    (
      await privileged.actions.saveActivityCategory(null, {
        ...payload,
        is_system: true,
      })
    ).success,
    true,
  );
  assert.equal(privileged.requests[0].options.data.is_system, true);
});

test("updates omit immutable system/status flags and preserve omitted translations and a null icon", async () => {
  const h = harness([{ status: true, data: category }]);
  await h.actions.saveActivityCategory(42, {
    ...payload,
    icon: null,
    is_system: true,
    is_active: true,
  });
  assert.equal(h.requests[0].options.method, "PATCH");
  assert.equal("is_system" in h.requests[0].options.data, false);
  assert.equal("is_active" in h.requests[0].options.data, false);
  assert.equal(h.requests[0].options.data.icon, null);
  assert.deepEqual(Object.keys(h.requests[0].options.data.translations), [
    "en",
    "hi",
  ]);
});

test("every mutation authenticates and unsafe IDs, arbitrary icons and unauthorized system creation send no request", async () => {
  const h = harness();
  for (const id of [0, -1, 1.5, Infinity, NaN, "42"]) {
    assert.equal(
      (await h.actions.saveActivityCategory(id, payload)).success,
      false,
    );
    assert.equal(
      (await h.actions.updateActivityCategoryStatus(id, true)).success,
      false,
    );
    assert.equal((await h.actions.deleteActivityCategory(id)).success, false);
  }
  for (const value of [
    null,
    { ...payload, icon: "<svg onload=alert(1)>" },
    { ...payload, icon: "__proto__" },
    { ...payload, translations: [] },
  ])
    assert.equal(
      (await h.actions.saveActivityCategory(null, value)).success,
      false,
    );
  const denied = await h.actions.saveActivityCategory(null, {
    ...payload,
    is_system: true,
  });
  assert.equal(denied.success, false);
  assert.ok(denied.errors.is_system);
  assert.equal(h.requests.length, 0);
  const unauthenticated = harness([], null);
  await unauthenticated.actions.saveActivityCategory(null, payload);
  await unauthenticated.actions.updateActivityCategoryStatus(42, true);
  await unauthenticated.actions.deleteActivityCategory(42);
  assert.equal(unauthenticated.requests.length, 0);
});

test("422 errors, protected status failures, deletion conflicts and business failures stay recoverable without revalidation", async () => {
  const error = Object.assign(new Error("Name required"), {
    status: 422,
    errors: { "translations.ar.name": ["Required"], slug: ["Already used"] },
  });
  const h = harness([
    error,
    Object.assign(new Error("Protected"), { status: 403 }),
    Object.assign(new Error("Referenced; deactivate instead"), { status: 409 }),
    { status: false },
  ]);
  assert.equal(
    (await h.actions.saveActivityCategory(42, payload)).errors[
      "translations.ar.name"
    ][0],
    "Required",
  );
  assert.equal(
    (await h.actions.updateActivityCategoryStatus(42, true)).success,
    false,
  );
  assert.match(
    (await h.actions.deleteActivityCategory(42)).message,
    /Referenced/,
  );
  assert.equal(
    (await h.actions.saveActivityCategory(null, payload)).success,
    false,
  );
  assert.equal(h.invalidations.length, 0);
  const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
    controlFlow: true,
  });
  await assert.rejects(
    harness([redirect]).actions.saveActivityCategory(null, payload),
    /NEXT_REDIRECT/,
  );
});

test("status changes submit only a boolean and successful deletion revalidates the feature pages", async () => {
  const h = harness([
    { status: true, data: { ...category, is_active: true } },
    { status: true, data: null },
  ]);
  assert.equal(
    (await h.actions.updateActivityCategoryStatus(42, true)).success,
    true,
  );
  assert.deepEqual(h.requests[0].options.data, { is_active: true });
  assert.equal((await h.actions.deleteActivityCategory(42)).success, true);
  assert.equal(h.invalidations.length, 4);
});

test("translation panels cover configured RTL languages, optional descriptions, saved locales and backend limits", () => {
  const rules = {};
  let description = "";
  const Component = load(root + "ActivityCategoryTranslations.tsx", ui).default;
  const tree = Component({
    locales: ["en", "hi", "ar", "legacy"],
    savedLocales: ["legacy"],
    form: {
      register: (name, options) => {
        rules[name] = options;
        return { name };
      },
      getValues: () => description,
      trigger() {},
      formState: {
        errors: { translations: { ar: { name: { message: "Required" } } } },
      },
    },
  });
  assert.equal(findAll(tree, (e) => e.type === "input").length, 4);
  const arabic = findAll(
    tree,
    (e) => e.props.name === "translations.ar.name",
  )[0];
  assert.equal(arabic.props.dir, "rtl");
  assert.equal(arabic.props.lang, "ar");
  assert.equal(arabic.props["aria-invalid"], true);
  assert.equal(rules["translations.ar.name"].validate(""), true);
  description = "Needs a title";
  assert.equal(
    rules["translations.ar.name"].validate(""),
    "validation.nameRequired",
  );
  assert.equal(rules["translations.ar.name"].validate("ري"), true);
  assert.equal(
    rules["translations.en.name"].required,
    "validation.nameRequired",
  );
  assert.equal(rules["translations.hi.name"].maxLength.value, 150);
  assert.equal(rules["translations.ar.description"].required, undefined);
  assert.equal(rules["translations.ar.description"].maxLength.value, 65535);
  assert.equal(
    findAll(tree, (e) => e.props.name === "translations.legacy.name")[0].props
      .readOnly,
    true,
  );
  assert.equal(findAll(tree, (e) => e.type === "button").length, 0);
});

test("the approved icon registry and previews safely reject unknown identifiers", () => {
  assert.equal(Object.keys(registry.activityCategoryIcons).length, 20);
  const Preview = load(root + "ActivityIconPreview.tsx", ui).default;
  for (const value of [null, "__proto__", "toString", "<svg>", "unsupported"]) {
    assert.doesNotThrow(() => Preview({ value }));
    assert.equal(
      Preview({ value }).props.children.props.children,
      "notAvailable",
    );
  }
  for (const id of Object.keys(registry.activityCategoryIcons)) {
    assert.equal(Preview({ value: id }).props.children.type, icons[id]);
    for (const locale of ["en", "hi"]) {
      const messages = require(`../src/messages/${locale}.json`);
      assert.ok(
        messages.activityCategories.icons[id],
        `Missing ${locale} label for ${id}`,
      );
    }
  }
});

test("the icon combobox searches labels and IDs, selects, clears, handles empty results and guards disabled changes", () => {
  const state = hooks(),
    changes = [];
  const Select = load(root + "ActivityIconSelect.tsx", {
    ...ui,
    react: state.react,
    "@headlessui/react": Object.fromEntries(
      [
        "Combobox",
        "ComboboxInput",
        "ComboboxButton",
        "ComboboxOptions",
        "ComboboxOption",
      ].map((name) => [name, name]),
    ),
    "./ActivityIconPreview": { __esModule: true, default: "preview" },
  }).default;
  const props = {
    value: "LeafIcon",
    onChange: (value) => changes.push(value),
    onBlur() {},
    inputRef() {},
    disabled: false,
  };
  const render = () => {
    state.reset();
    return Select(props);
  };
  let tree = render();
  findAll(tree, (e) => e.type === "ComboboxInput")[0].props.onChange({
    target: { value: "droplet" },
  });
  tree = render();
  assert.deepEqual(
    findAll(tree, (e) => e.type === "ComboboxOption").map((e) => e.props.value),
    ["", "DropletsIcon"],
  );
  const combo = findAll(tree, (e) => e.type === "Combobox")[0];
  combo.props.onChange("DropletsIcon");
  combo.props.onClose();
  assert.deepEqual(changes, ["DropletsIcon"]);
  combo.props.onChange("");
  assert.equal(changes[1], "");
  findAll(tree, (e) => e.type === "ComboboxInput")[0].props.onChange({
    target: { value: "missing-icon" },
  });
  assert.equal(
    findAll(render(), (e) => e.props.children === "icons.empty").length,
    1,
  );
  props.disabled = true;
  findAll(render(), (e) => e.type === "Combobox")[0].props.onChange("LeafIcon");
  assert.equal(changes.length, 2);
});

function formHarness(initial, responses) {
  const state = hooks(),
    calls = [],
    fieldErrors = [],
    navigations = [];
  let values;
  const form = {
    control: {},
    register: (name, rules) => ({ name, rules }),
    formState: { errors: {}, isSubmitting: false },
    clearErrors() {},
    setError: (field, error) => fieldErrors.push({ field, ...error }),
    reset: (next) => {
      values = clone(next);
    },
    handleSubmit: (submit) => () => submit(clone(values)),
  };
  const Form = load(root + "ActivityCategoryForm.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
      useForm: (options) => {
        values ??= clone(options.defaultValues);
        return form;
      },
    },
    "react-hot-toast": { success() {}, error() {} },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (route) => navigations.push(route) }),
    },
    "@/actions/admin/activityCategories": {
      saveActivityCategory: async (id, data) => {
        calls.push({ id, data: clone(data) });
        return responses.shift();
      },
    },
    "@/components/admin/form/switch/Switch": {
      __esModule: true,
      default: "switch",
    },
    "./ActivityIconSelect": { __esModule: true, default: "icon-select" },
    "./ActivityCategoryTranslations": {
      __esModule: true,
      default: "translations",
    },
    "./ActivityCategorySettings": { __esModule: true, default: "settings" },
  }).default;
  const render = () => {
    state.reset();
    return Form(initial);
  };
  render();
  return {
    render,
    calls,
    fieldErrors,
    navigations,
    values: () => clone(values),
    fill: (next) => {
      values = clone(next);
    },
    submit: async () => {
      render().props.onSubmit({ preventDefault() {} });
      await state.settle();
    },
  };
}

test("create forms initialize all languages, omit blank optional translations, submit identifiers and reset for another create", async () => {
  const h = formHarness(
    { category: null, canManageSystem: false },
    Array(2).fill({ success: true, data: category }),
  );
  assert.deepEqual(h.values().translations.ar, { name: "", description: "" });
  h.fill({
    slug: "irrigation",
    icon: "LeafIcon",
    is_system: false,
    translations: {
      en: { name: "Irrigation", description: "" },
      hi: { name: "सिंचाई", description: "" },
      ar: { name: "", description: "" },
    },
  });
  await h.submit();
  assert.equal("ar" in h.calls[0].data.translations, false);
  assert.equal(h.calls[0].data.icon, "LeafIcon");
  assert.equal(h.values().slug, "");
  assert.equal(h.values().icon, "");
  assert.equal(h.values().is_system, false);
  assert.deepEqual(h.values().translations.ar, { name: "", description: "" });
  h.fill({
    ...h.values(),
    slug: "sowing",
    translations: {
      en: { name: "Sowing", description: "" },
      hi: { name: "बुवाई", description: "" },
      ar: { name: "بذر", description: "" },
    },
  });
  await h.submit();
  assert.equal(h.calls[1].id, null);
  assert.equal(h.calls[1].data.translations.ar.name, "بذر");
  assert.equal(h.calls[1].data.icon, null);
  assert.equal(h.navigations.length, 2);
});

test("edits prefill configured and legacy translations, retain failed drafts and map nested errors before retrying the same ID", async () => {
  const existing = {
    ...category,
    translations: {
      ...category.translations,
      ar: { name: "ري", description: "ماء" },
      legacy: { name: "Saved", description: "Keep" },
    },
  };
  const h = formHarness({ category: existing, canManageSystem: true }, [
    {
      success: false,
      message: "Invalid",
      errors: { "translations.ar.name": ["Required"], slug: ["Already used"] },
    },
    { success: true, data: existing },
  ]);
  assert.equal(h.values().translations.ar.description, "ماء");
  assert.equal(h.values().translations.legacy.name, "Saved");
  const draft = { ...h.values(), slug: "irrigation-updated" };
  h.fill(draft);
  await h.submit();
  assert.deepEqual(h.values(), draft);
  assert.equal(h.fieldErrors[0].field, "translations.ar.name");
  assert.equal(h.navigations.length, 0);
  await h.submit();
  assert.deepEqual(
    h.calls.map((call) => call.id),
    [42, 42],
  );
  assert.equal("legacy" in h.calls[1].data.translations, false);
  assert.equal(h.values().translations.legacy.name, "Saved");
});

test("system edits lock the slug and ordinary admins get read-only fields without a Save action", () => {
  const h = formHarness(
    { category: { ...category, is_system: true }, canManageSystem: false },
    [],
  );
  const tree = h.render();
  assert.equal(
    findAll(tree, (e) => e.type === "fieldset")[0].props.disabled,
    true,
  );
  assert.equal(
    findAll(tree, (e) => e.props.id === "activity-category-slug")[0].props
      .readOnly,
    true,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "button" && e.props.type === "submit")
      .length,
    0,
  );
  const superAdmin = formHarness(
    { category: { ...category, is_system: true }, canManageSystem: true },
    [],
  );
  assert.equal(
    findAll(
      superAdmin.render(),
      (e) => e.props.id === "activity-category-slug",
    )[0].props.readOnly,
    true,
  );
});

test("listing shows exactly seven columns, backend names/dates, icons and empty states with backend pagination", () => {
  const List = load(root + "ActivityCategoriesList.tsx", {
    ...ui,
    "@/components/admin/ui/badge/Badge": { __esModule: true, default: "badge" },
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
    "./ActivityIconPreview": { __esModule: true, default: "preview" },
    "./ActivityCategoryRowActions": { __esModule: true, default: "actions" },
  }).default;
  const tree = List({
    result: { data: [category], pagination },
    filtered: false,
    canManageSystem: false,
  });
  assert.deepEqual(
    findAll(tree, (e) => e.props.isHeader).map((e) => e.props.children),
    [
      "fields.name",
      "fields.slug",
      "fields.icon",
      "fields.system",
      "fields.status",
      "fields.addedAt",
      "fields.actions",
    ],
  );
  assert.equal(
    findAll(tree, (e) => e.props.children === "6 Nov 2026 10:30 AM").length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "preview")[0].props.value,
    "LeafIcon",
  );
  assert.equal(
    findAll(tree, (e) => e.type === "pagination")[0].props.totalPages,
    1,
  );
  const empty = List({
    result: {
      data: [],
      pagination: { ...pagination, total: 0, from: null, to: null },
    },
    filtered: true,
    canManageSystem: false,
  });
  assert.equal(
    findAll(empty, (e) => e.props.children === "emptyFiltered").length,
    1,
  );
});

test("server listing normalizes URL filters including zero values and redirects excessive pages with filters", async () => {
  const calls = [];
  const Content = load(root + "ActivityCategoriesContent.tsx", {
    "next-intl/server": {
      getTranslations: async () => (key) => key,
      getLocale: async () => "hi",
    },
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
    "@/lib/apis/admin/activityCategories": {
      activityCategoriesAPI: {
        list: async (params) => {
          calls.push(clone(params));
          return {
            status: true,
            data: [category],
            pagination: { ...pagination, current_page: params.page },
          };
        },
      },
    },
    "@/i18n/navigation": {
      redirect: (destination) => {
        throw Object.assign(new Error("Redirect"), { destination });
      },
    },
    "@/lib/api/ApiError": { ApiError: Error },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        throw error;
      },
    },
    "./ActivityCategoriesFilters": { __esModule: true, default: "filters" },
    "./ActivityCategoriesList": { __esModule: true, default: "list" },
  }).default;
  const tree = await Content({
    searchParams: Promise.resolve({
      keyword: ["  water  ", "ignore"],
      status: "0",
      is_system: "0",
      page: "bad",
    }),
  });
  assert.deepEqual(calls[0], {
    keyword: "water",
    status: "0",
    is_system: "0",
    page: 1,
    per_page: 15,
  });
  assert.equal(
    findAll(tree, (e) => e.type === "list")[0].props.canManageSystem,
    true,
  );
  await assert.rejects(
    Content({
      searchParams: Promise.resolve({ status: "0", is_system: "1", page: "9" }),
    }),
    (error) => {
      assert.equal(error.destination.href.query.page, 1);
      assert.equal(error.destination.href.query.is_system, "1");
      assert.equal(error.destination.locale, "hi");
      return true;
    },
  );
});

test("filters retain unrelated query parameters and inactive/custom zero, reset page and clear controls on Reset", async () => {
  const state = hooks(),
    navigations = [];
  const Filters = load(root + "ActivityCategoriesFilters.tsx", {
    ...ui,
    react: state.react,
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("page=5&keep=yes&status=1"),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (url) => navigations.push(url) }),
    },
    "@/components/admin/common/FilterSelect": {
      __esModule: true,
      default: "select",
    },
  }).default;
  const render = () => {
    state.reset();
    return Filters({
      initialFilters: { keyword: "water", status: "0", is_system: "0" },
    });
  };
  let tree = render();
  tree.props.onSubmit({ preventDefault() {} });
  await state.settle();
  let query = new URL(navigations[0], "http://localhost").searchParams;
  assert.equal(query.get("status"), "0");
  assert.equal(query.get("is_system"), "0");
  assert.equal(query.get("page"), null);
  assert.equal(query.get("keep"), "yes");
  tree = render();
  findAll(
    tree,
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  await state.settle();
  query = new URL(navigations[1], "http://localhost").searchParams;
  assert.equal(query.get("status"), null);
  assert.equal(query.get("is_system"), null);
  assert.equal(query.get("keyword"), null);
  assert.equal(findAll(render(), (e) => e.type === "input")[0].props.value, "");
});

test("protected system rows hide mutation actions and only inactive custom rows offer deletion", () => {
  const state = hooks();
  const Actions = load(root + "ActivityCategoryRowActions.tsx", {
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
    "./ActivityCategoryConfirmDialog": { __esModule: true, default: "confirm" },
  }).default;
  const render = (record, permission) => {
    state.reset();
    return Actions({ category: record, canManageSystem: permission });
  };
  assert.equal(
    findAll(
      render({ ...category, is_system: true }, false),
      (e) => e.type === "button",
    ).length,
    0,
  );
  for (const record of [
    { ...category, is_system: true },
    { ...category, is_active: true },
  ])
    assert.equal(
      findAll(render(record, true), (e) =>
        e.props.children?.some?.((child) => child === "actions.delete"),
      ).length,
      0,
    );
  assert.equal(
    findAll(
      render(category, false),
      (e) =>
        e.type === "button" &&
        Array.isArray(e.props.children) &&
        e.props.children.includes("actions.delete"),
    ).length,
    1,
  );
});

test("deletion waits for confirmation, blocks duplicate requests/dismissal and retains conflicts for retry", async () => {
  const state = hooks(),
    successes = [],
    errors = [];
  let calls = 0,
    closed = 0;
  const Confirm = load(root + "ActivityCategoryConfirmDialog.tsx", {
    ...ui,
    react: state.react,
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
      error: (message) => errors.push(message),
    },
    "@/actions/admin/activityCategories": {
      deleteActivityCategory: async () =>
        ++calls === 1
          ? { success: false, message: "Referenced; deactivate instead" }
          : { success: true, message: "Deleted" },
      updateActivityCategoryStatus: async () => {
        throw new Error("Unexpected status request");
      },
    },
  }).default;
  const render = () => {
    state.reset();
    return Confirm({
      category,
      name: "Irrigation",
      operation: "delete",
      onClose: () => closed++,
    });
  };
  let tree = render();
  assert.equal(calls, 0);
  const button = findAll(
    tree,
    (e) => e.type === "button" && e.props.children === "actions.delete",
  )[0];
  button.props.onClick();
  button.props.onClick();
  tree.props.onClose();
  assert.equal(closed, 0);
  await state.settle();
  assert.equal(calls, 1);
  assert.equal(successes.length, 0);
  assert.equal(errors.length, 1);
  tree = render();
  assert.equal(
    findAll(tree, (e) => e.props.role === "alert")[0].props.children,
    errors[0],
  );
  findAll(
    tree,
    (e) => e.type === "button" && e.props.children === "actions.delete",
  )[0].props.onClick();
  await state.settle();
  assert.equal(closed, 1);
  assert.deepEqual(successes, ["Deleted"]);
});

test("English/Hindi messages retain identical keys and placeholders with real Hindi text", () => {
  const en = require("../src/messages/en.json").activityCategories;
  const hi = require("../src/messages/hi.json").activityCategories;
  function compare(a, b) {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const key of Object.keys(a)) {
      if (typeof a[key] === "object") compare(a[key], b[key]);
      else {
        const params = (value) =>
          [...value.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]).sort();
        assert.deepEqual(params(a[key]), params(b[key]), key);
        assert.equal(/\?{2,}|\uFFFD/.test(b[key]), false, key);
      }
    }
  }
  compare(en, hi);
  assert.match(hi.title, /[\u0900-\u097f]/);
});
