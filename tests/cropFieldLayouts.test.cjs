const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const route =
  "src/app/[locale]/(admin)/admin/(pages)/crop-field-layouts/_components";

function load(file, dependencies = {}) {
  const loaded = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  vm.runInNewContext(outputText, {
    exports: loaded.exports,
    module: loaded,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), name);
      return dependencies[name];
    },
  });
  return loaded.exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("a new supported language shows stored content, direction, and locale-specific errors", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { createTranslator } = require("next-intl");
  const languages = [
    { id: "en", name: "English", dir: "ltr" },
    { id: "ar", name: "Arabic", dir: "rtl" },
    { id: "xx", name: "Legacy", dir: "ltr" },
  ];
  const types = load("src/types/admin/cropFieldLayout.ts");
  const messages = require("../src/messages/en.json");
  const errors = {
    translations: { ar: { title: { message: "Arabic title error" } } },
  };
  const { default: Translations } = load(`${route}/TranslationsStep.tsx`, {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "next-intl": {
      useTranslations: (namespace) =>
        createTranslator({ locale: "en", messages, namespace }),
    },
    "@/i18n/languages": {
      languages,
      getLanguage: (id) => languages.find((language) => language.id === id),
    },
    "@/types/admin/cropFieldLayout": types,
    "react-hook-form": {
      useFormContext: () => ({
        control: {},
        formState: { errors },
        register: (path) => ({
          name: path,
          defaultValue: path === "translations.ar.title" ? "Arabic layout" : "",
        }),
      }),
      Controller: ({ render }) =>
        render({ field: { value: "", onChange() {} }, fieldState: {} }),
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
  });
  const html = renderToStaticMarkup(
    React.createElement(Translations, {
      options: {
        supported_locales: [
          { value: "en", required: true },
          { value: "ar", required: true },
        ],
      },
    }),
  );
  const arabicInput =
    html.match(/<input[^>]+id="field-layout-ar-title"[^>]*>/)?.[0] ?? "";
  const legacyInput =
    html.match(/<input[^>]+id="field-layout-xx-title"[^>]*>/)?.[0] ?? "";
  assert.match(arabicInput, /name="translations\.ar\.title"/);
  assert.match(arabicInput, /lang="ar" dir="rtl"/);
  assert.match(arabicInput, /aria-describedby="field-layout-ar-title-error"/);
  assert.match(html, /Arabic title error/);
  assert.match(arabicInput, /value="Arabic layout"/);
  assert.match(legacyInput, /readOnly/i);
});

test("step requests use the confirmed Laravel paths and send the draft revision", async () => {
  const calls = [];
  const { cropFieldLayoutsAPI: api } = load(
    "src/lib/apis/admin/cropFieldLayouts.ts",
    {
      "server-only": {},
      "@/lib/api/request": { apiRequest: async (...args) => calls.push(args) },
    },
  );
  const basic = {
    crop_scope: "all",
    crop_ids: [],
    layout_type: "random_distribution",
    sort_order: 0,
    is_active: true,
  };
  const translations = {
    hi: { title: "Broadcasting", description: "Example" },
  };
  await api.create(basic);
  await api.basic(21, 1, basic);
  await api.configuration(21, 2, { configuration: {}, reference_note: null });
  await api.translations(21, 3, translations);
  await api.review(21);
  await api.finalize(21, 4);
  assert.deepEqual(plain(calls), [
    ["/admin/crop-field-layouts/step-1", { method: "POST", data: basic }],
    [
      "/admin/crop-field-layouts/21/step-1",
      { method: "PUT", data: { ...basic, draft_revision: 1 } },
    ],
    [
      "/admin/crop-field-layouts/21/step-2",
      {
        method: "PUT",
        data: { configuration: {}, reference_note: null, draft_revision: 2 },
      },
    ],
    [
      "/admin/crop-field-layouts/21/step-3",
      { method: "PUT", data: { translations, draft_revision: 3 } },
    ],
    ["/admin/crop-field-layouts/21/review"],
    [
      "/admin/crop-field-layouts/21/finalize",
      { method: "POST", data: { draft_revision: 4 } },
    ],
  ]);
});

test("configuration converts only distances and omits fields hidden by the planting pattern", () => {
  const { configurationDefaults, prepareConfiguration } = load(
    `${route}/configuration.ts`,
  );
  const distance = (key, extra = {}) => ({
    key,
    label: key,
    type: "number",
    display_unit: "cm",
    storage_unit: "m",
    required: true,
    min: 0,
    max: 1000,
    ...extra,
  });
  const definition = {
    value: "raised_bed_multi_row",
    fields: [
      distance("bed_width_m"),
      distance("path_width_m"),
      { key: "rows_per_bed", type: "integer", required: true, min: 2, max: 20 },
      distance("row_spacing_m"),
      {
        key: "planting_pattern",
        type: "select",
        default: "individual_plants",
        options: ["individual_plants", "continuous_row"],
      },
      distance("plant_spacing_m", {
        required: false,
        required_when: { planting_pattern: "individual_plants" },
      }),
    ],
  };
  const saved = {
    bed_width_m: 0.8,
    path_width_m: 0,
    rows_per_bed: 2,
    row_spacing_m: 0.29,
    planting_pattern: "individual_plants",
    plant_spacing_m: 0.1,
  };
  const display = configurationDefaults(definition, saved);
  assert.equal(display.row_spacing_m, "29");
  assert.deepEqual(plain(prepareConfiguration(definition, display)), {
    configuration: saved,
    errors: {},
  });
  const continuous = prepareConfiguration(definition, {
    ...display,
    planting_pattern: "continuous_row",
  });
  assert.equal(continuous.configuration.plant_spacing_m, undefined);
  assert.equal(continuous.configuration.path_width_m, 0);
  assert.equal(
    prepareConfiguration(definition, { ...display, rows_per_bed: "2.5" }).errors
      .rows_per_bed,
    "invalid",
  );
  assert.equal(
    prepareConfiguration(definition, { ...display, row_spacing_m: "90" }).errors
      .row_spacing_m,
    "rowsDoNotFit",
  );
  assert.deepEqual(
    plain(
      prepareConfiguration(
        { value: "random_distribution", fields: [] },
        display,
      ),
    ),
    { configuration: {}, errors: {} },
  );
});

test("edit resumes the next persisted step and review uses the dedicated persisted snapshot", async () => {
  const redirect = Error("redirect");
  let destination;
  let reviewCalls = 0;
  const layout = {
    id: 9,
    wizard: {
      completed_step: 1,
      revision: 3,
      is_finalized: false,
      has_pending_edit: true,
    },
    crops: [],
    draft: {
      basic_details: { layout_type: "individual_row" },
      layout_configuration: {},
      translations: {},
    },
  };
  const persistedReview = {
    ...layout.draft,
    wizard: { completed_step: 3, revision: 5, can_finalize: true },
  };
  const { default: Editor } = load(`${route}/FieldLayoutEditor.tsx`, {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "next-intl/server": {
      getLocale: async () => "hi",
      getTranslations: async () => (key) => key,
    },
    "next/navigation": { notFound: () => assert.fail("Unexpected not-found") },
    "@/i18n/navigation": {
      redirect: (result) => {
        destination = result;
        throw redirect;
      },
    },
    "@/components/admin/common/PageBreadCrumb": {},
    "@/lib/auth/dal": { requireAdmin: async () => {} },
    "@/lib/api/ApiError": { ApiError: class extends Error {} },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        throw error;
      },
    },
    "@/lib/apis/admin/cropFieldLayouts": {
      cropFieldLayoutsAPI: {
        options: async () => ({ status: true, data: {} }),
        show: async () => ({ status: true, data: layout }),
        review: async () => {
          reviewCalls++;
          return { status: true, data: persistedReview };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {},
    "./FieldLayoutForm": {},
    "./FieldLayoutReview": {},
  });
  const resume = await Editor({ id: "9" });
  assert.equal(resume.props.children[1].props.step, 2);
  assert.equal(resume.props.children[1].props.sections, layout.draft);
  await assert.rejects(
    Editor({ id: "9", requestedStep: "4" }),
    (error) => error === redirect,
  );
  assert.deepEqual(plain(destination), {
    href: "/admin/crop-field-layouts/9/edit?step=2",
    locale: "hi",
  });
  assert.equal(reviewCalls, 0);
  layout.wizard.completed_step = 3;
  const review = await Editor({ id: "9" });
  assert.equal(review.props.children[1].props.step, 4);
  assert.equal(review.props.children[1].props.sections, persistedReview);
  assert.equal(reviewCalls, 1);
});
