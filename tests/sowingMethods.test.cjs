const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies) {
  const loaded = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  vm.runInNewContext(outputText, {
    module: loaded,
    exports: loaded.exports,
    FormData,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), name);
      return dependencies[name];
    },
  });
  return loaded.exports;
}

test("creation stays inactive, edits preserve status, and finalization applies the requested status", async () => {
  const calls = [];
  const { sowingMethodsAPI: api } = load(
    "src/lib/apis/admin/sowingMethods.ts",
    {
      "server-only": {},
      "@/lib/api/request": { apiRequest: (...args) => calls.push(args) },
    },
  );
  const basic = {
    title: "Line Sowing",
    code: "line_sowing",
    slug: "line-sowing",
    crop_scope: "all",
    crop_ids: [],
    supports_row_spacing: null,
    supports_plant_spacing: false,
  };
  await api.create(basic);
  await api.update(17, basic);
  await api.finalize(17, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    [
      "/admin/sowing-methods",
      { method: "POST", data: { ...basic, is_active: false } },
    ],
    ["/admin/sowing-methods/17", { method: "PATCH", data: basic }],
    [
      "/admin/sowing-methods/17/finalize",
      { method: "POST", data: { is_active: true } },
    ],
  ]);
});

test("the simple table ignores legacy filters and keeps locale when correcting pagination", async () => {
  const redirectSignal = new Error("redirect");
  let destination;
  let requested;
  const { default: Content } = load(
    "src/app/[locale]/(admin)/admin/(pages)/sowing-methods/_components/SowingMethodsContent.tsx",
    {
      "react/jsx-runtime": require("react/jsx-runtime"),
      "next-intl/server": {
        getTranslations: async () => (key) => key,
        getLocale: async () => "hi",
      },
      "@/i18n/navigation": {
        redirect: (target) => {
          destination = target;
          throw redirectSignal;
        },
      },
      "@/lib/auth/dal": { requireAdmin: async () => {} },
      "@/lib/api/ApiError": { ApiError: Error },
      "@/lib/api/handleActionError": {
        handleActionError: async (error) => {
          throw error;
        },
      },
      "@/lib/apis/admin/sowingMethods": {
        sowingMethodsAPI: {
          list: async (params) => {
            requested = params;
            return {
              status: true,
              data: [],
              pagination: { current_page: 9, last_page: 2 },
            };
          },
          options: async () => ({ status: true, data: {} }),
        },
      },
      "./SowingMethodsList": {},
    },
  );
  await assert.rejects(
    Content({
      searchParams: Promise.resolve({
        page: "9",
        is_active: "0",
        keyword: "row",
        sort_by: "title",
        sort_direction: "desc",
      }),
    }),
    (error) => error === redirectSignal,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(requested)), {
    page: 9,
    per_page: 10,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(destination)), {
    locale: "hi",
    href: {
      pathname: "/admin/sowing-methods",
      query: { page: 2 },
    },
  });
});

test("additional content languages receive edit/create defaults, field errors, direction and placeholders", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { createTranslator } = require("next-intl");
  const methodTypes = load("src/types/admin/sowingMethod.ts", {});
  const catalog = [
    { id: "en", name: "English", dir: "ltr" },
    { id: "hi", name: "Hindi", dir: "ltr" },
    { id: "ar", name: "Arabic", dir: "rtl" },
  ];
  const languageModule = {
    languages: catalog,
    getLanguage: (id) => catalog.find((language) => language.id === id),
  };
  const fields = [
    "title",
    "short_description",
    "description",
    "advantages",
    "disadvantages",
    "suitable_conditions",
    "resource_requirements",
    "economic_considerations",
    "important_considerations",
  ];
  const method = {
    id: 17,
    crops: [],
    images: [],
    translations: {
      ar: {
        title: "Arabic title",
        short_description: "Arabic summary",
        description: "Arabic description",
        advantages: null,
      },
    },
  };
  const stop = {};
  let defaults;
  const { default: Form } = load(
    "src/app/[locale]/(admin)/admin/(pages)/sowing-methods/_components/SowingMethodForm.tsx",
    {
      "react/jsx-runtime": require("react/jsx-runtime"),
      react: {
        useState: (initial) => [
          typeof initial === "function" ? initial() : initial,
          () => {},
        ],
        useRef: (current) => ({ current }),
      },
      "react-hook-form": {
        useForm: (options) => {
          defaults = options.defaultValues;
          throw stop;
        },
      },
      "next-intl": { useTranslations: () => () => "" },
      "react-hot-toast": {},
      "@/i18n/navigation": { useRouter: () => ({}) },
      "@/i18n/languages": languageModule,
      "@/types/admin/sowingMethod": methodTypes,
      "@/actions/admin/sowingMethods": {},
      "@/components/admin/common/ProductWizardSteps": {},
      "@/icons": {},
      "../../seeds/_components/SeedConfirmDialog": {},
      "./MethodBasicStep": {},
      "./MethodTranslationsStep": {},
      "./MethodImagesStep": {},
      "./MethodReview": {},
    },
  );
  assert.throws(
    () => Form({ initialMethod: method }),
    (error) => error === stop,
  );
  assert.equal(defaults.translations.ar.title, "Arabic title");
  assert.equal(defaults.translations.ar.advantages, "");
  const values = defaults;
  assert.throws(
    () => Form({ initialMethod: null }),
    (error) => error === stop,
  );
  for (const { id } of catalog) {
    for (const field of fields)
      assert.equal(defaults.translations[id][field], "");
  }

  for (const locale of ["en", "hi"]) {
    const t = createTranslator({
      locale,
      messages: require(`../src/messages/${locale}.json`),
      namespace: "sowingMethods",
    });
    const { default: Translations } = load(
      "src/app/[locale]/(admin)/admin/(pages)/sowing-methods/_components/MethodTranslationsStep.tsx",
      {
        "react/jsx-runtime": require("react/jsx-runtime"),
        "next-intl": { useTranslations: () => t },
        "@/i18n/languages": languageModule,
        "@/types/admin/sowingMethod": methodTypes,
        "react-hook-form": {
          useFormContext: () => ({ control: {} }),
          Controller: ({ name, render }) => {
            const [, id, field] = name.split(".");
            return render({
              field: {
                name,
                value: values.translations[id][field],
                onChange: () => {},
              },
              fieldState: {
                error:
                  name === "translations.ar.title"
                    ? { message: t("required") }
                    : undefined,
              },
            });
          },
        },
        "@/components/admin/common/ComponentCard": ({ children }) =>
          React.createElement("section", null, children),
        "@/components/admin/form/Label": "label",
        "@/components/admin/form/input/InputField": ({ error, ...props }) => {
          void error;
          return React.createElement("input", props);
        },
        "@/components/admin/form/input/TextArea": ({ error, ...props }) => {
          void error;
          return React.createElement("textarea", props);
        },
      },
    );
    const html = renderToStaticMarkup(
      React.createElement(Translations, {
        supportedLocaleIds: ["en", "hi", "ar"],
      }),
    );
    assert.match(html, /id="method-ar-title"/);
    assert.match(html, /lang="ar" dir="rtl"/);
    assert.match(html, /aria-describedby="method-ar-title-error"/);
    assert.ok(
      html.includes(
        t("translationPlaceholder", {
          field: t("fields.title"),
          language: "Arabic",
        }),
      ),
    );
    assert.ok(html.includes(t("required")));
    assert.ok(html.includes("Arabic title"));
    const unsupported = renderToStaticMarkup(
      React.createElement(Translations, {
        supportedLocaleIds: ["en", "hi"],
      }),
    );
    assert.match(unsupported, /<input[^>]*id="method-ar-title"[^>]*readOnly/);
    assert.ok(unsupported.includes(t("translationUnavailable")));
    assert.ok(unsupported.includes("Arabic title"));
  }
});

test("adding a required translation to an active method preserves pending basic edits", async () => {
  const methodTypes = load("src/types/admin/sowingMethod.ts", {});
  const catalog = ["en", "hi", "ta", "ar"].map((id) => ({ id }));
  const calls = [];
  const method = {
    id: 17,
    code: "line_sowing",
    slug: "line-sowing",
    crop_scope: "all",
    sort_order: 0,
    is_active: true,
    crops: [],
    images: [],
    translations: {
      en: {
        title: "Row planting",
        short_description: "Sowing in rows",
        description: "Details",
      },
      hi: {
        title: "Hindi title",
        short_description: "Hindi summary",
        description: "Hindi details",
      },
    },
  };
  let values;
  let stateIndex;
  const state = [];
  const { default: Form } = load(
    "src/app/[locale]/(admin)/admin/(pages)/sowing-methods/_components/SowingMethodForm.tsx",
    {
      "react/jsx-runtime": require("react/jsx-runtime"),
      react: {
        useState: (initial) => {
          const index = stateIndex++;
          if (!(index in state))
            state[index] = typeof initial === "function" ? initial() : initial;
          return [
            state[index],
            (value) => {
              state[index] =
                typeof value === "function" ? value(state[index]) : value;
            },
          ];
        },
        useRef: (current) => ({ current }),
        useEffect: () => {},
      },
      "react-hook-form": {
        useForm: ({ defaultValues }) => {
          values ??= { ...defaultValues, sort_order: 10 };
          return {
            formState: { isDirty: true },
            getValues: () => values,
            clearErrors: () => {},
            setError: (field) => calls.push(["error", field]),
            reset: (nextValues) => {
              values = nextValues;
            },
          };
        },
        useWatch: () => true,
      },
      "next-intl": { useTranslations: () => (key) => key },
      "react-hot-toast": { error: () => {} },
      "@/i18n/navigation": { useRouter: () => ({}) },
      "@/i18n/languages": { languages: catalog },
      "@/types/admin/sowingMethod": methodTypes,
      "@/actions/admin/sowingMethods": {
        saveSowingMethodBasic: async (id, payload) => {
          calls.push(["basic", id, payload.sort_order]);
          return {
            success: false,
            message: "Complete the required translations",
            errors: { "translations.ta.title": ["Title is required"] },
          };
        },
        saveSowingMethodTranslations: async (id, translations) => {
          calls.push(["translations", id, Object.keys(translations)]);
          return { success: true, data: { ...method, translations } };
        },
      },
      "@/components/admin/common/ProductWizardSteps": () => null,
      "@/icons": {},
      "../../seeds/_components/SeedConfirmDialog": {},
      "./MethodBasicStep": {},
      "./MethodTranslationsStep": {},
      "./MethodImagesStep": {},
      "./MethodReview": {},
    },
  );
  function render() {
    stateIndex = 0;
    return Form({
      initialMethod: method,
      options: {
        supported_locales: ["en", "hi", "ta"].map((value) => ({ value })),
      },
    }).props.children[0];
  }
  async function next() {
    render().props.onSubmit({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
    return render().props.children[0].props.step;
  }
  assert.equal(await next(), 2);
  assert.deepEqual(calls.slice(0, 2), [
    ["basic", 17, 10],
    ["error", "translations.ta.title"],
  ]);
  Object.assign(values.translations.ta, {
    title: "Tamil title",
    short_description: "Tamil summary",
    description: "Tamil details",
  });
  assert.equal(await next(), 1);
  assert.equal(values.sort_order, 10);
  assert.deepEqual(calls[2], ["translations", 17, ["en", "hi", "ta"]]);
});

test("mixed gallery saves include upload keys, explicit removals and the exact display order", async () => {
  const calls = [];
  const { sowingMethodsAPI: api } = load(
    "src/lib/apis/admin/sowingMethods.ts",
    {
      "server-only": {},
      "@/lib/api/request": { apiRequest: (...args) => calls.push(args) },
    },
  );
  const uploads = new FormData();
  const file = new File(["image bytes"], "side.webp", { type: "image/webp" });
  uploads.append("images[side]", file);
  await api.images(
    17,
    { remove_image_ids: [6], image_order: ["new:side", "id:3"] },
    uploads,
  );
  await api.images(
    17,
    { remove_image_ids: [3, 6], image_order: [] },
    new FormData(),
  );
  assert.equal(calls[0][0], "/admin/sowing-methods/17/step-3");
  assert.equal(calls[0][1].method, "POST");
  const multipart = calls[0][1].data;
  assert.equal(multipart.get("images[side]"), file);
  assert.deepEqual(multipart.getAll("remove_image_ids[]"), ["6"]);
  assert.deepEqual(multipart.getAll("image_order[]"), ["new:side", "id:3"]);
  assert.deepEqual(calls[1][1].data, {
    remove_image_ids: [3, 6],
    image_order: [],
  });
});

test("server actions authenticate before saving and allow configured translation locales only", async () => {
  const calls = [];
  const { saveSowingMethodTranslations, deleteSowingMethod } = load(
    "src/actions/admin/sowingMethods.ts",
    {
      "next/cache": {
        revalidatePath: (path, type) => calls.push(["revalidate", path, type]),
      },
      "next-intl/server": {
        getTranslations: async (namespace) => {
          assert.equal(namespace, "sowingMethods");
          return (key) => `hi:${key}`;
        },
      },
      "@/lib/auth/dal": { requireAdmin: async () => calls.push(["auth"]) },
      "@/lib/api/handleActionError": {
        handleActionError: async (error) => ({
          success: false,
          message: error.message,
        }),
      },
      "@/i18n/languages": {
        languages: [{ id: "en" }, { id: "hi" }, { id: "ta" }],
      },
      "@/lib/apis/admin/sowingMethods": {
        sowingMethodsAPI: {
          translations: async (...args) => {
            calls.push(["translations", ...args]);
            return { status: true, message: "Saved", data: { id: 17 } };
          },
          delete: async () => {
            throw new Error("Referenced methods must be deactivated.");
          },
        },
      },
    },
  );
  const result = await saveSowingMethodTranslations(17, {
    en: { title: "Row planting", extra: "unexpected" },
    ta: { title: "வரிசை விதைப்பு", advantages: null },
    xx: { title: "Unsupported" },
  });
  assert.equal(result.success, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.slice(0, 2))), [
    ["auth"],
    [
      "translations",
      17,
      {
        en: { title: "Row planting" },
        ta: { title: "வரிசை விதைப்பு", advantages: null },
      },
    ],
  ]);
  assert.ok(
    calls.some(
      ([op, path, type]) =>
        op === "revalidate" &&
        path === "/[locale]/admin/sowing-methods" &&
        type === "page",
    ),
  );
  calls.length = 0;
  assert.equal(
    (await deleteSowingMethod(17)).message,
    "Referenced methods must be deactivated.",
  );
  assert.deepEqual(calls, [["auth"]]);
  calls.length = 0;
  assert.equal((await deleteSowingMethod(0)).message, "hi:failed");
  assert.deepEqual(calls, [["auth"]]);
});
