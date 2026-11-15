const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsxRuntime = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/crops/_components/";
const translate = { useTranslations: () => (key) => key };

function load(file, dependencies = {}) {
  const mod = { exports: {} };
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
    module: mod,
    exports: mod.exports,
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "next-intl") return translate;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return mod.exports;
}
function findAll(element, match) {
  if (!element || typeof element !== "object") return [];
  return [
    ...(match(element) ? [element] : []),
    ...[element.props?.children ?? []]
      .flat(Infinity)
      .flatMap((child) => findAll(child, match)),
  ];
}
const swatch = load("src/components/admin/common/ColorSwatch.tsx");
const pickerDependencies = {
  "@/components/admin/common/ColorSwatch": swatch,
  "@/components/admin/form/input/InputField": {
    __esModule: true,
    default: "hex-input",
  },
  "@/components/admin/form/Label": { __esModule: true, default: "label" },
};

function pickerHarness(initial = null) {
  let value = initial,
    state,
    props = {},
    changes = 0;
  const Picker = load("src/components/admin/form/ColorPicker.tsx", {
    ...pickerDependencies,
    react: {
      useId: () => "color-test",
      useState(initial) {
        state ??= initial;
        return [
          state,
          (next) => {
            state = next;
          },
        ];
      },
    },
  }).default;
  const h = {
    render() {
      return Picker({
        label: "Crop Color",
        value,
        onChange: (next) => {
          value = next;
          changes++;
        },
        ...props,
      });
    },
    native() {
      return findAll(h.render(), (e) => e.props?.type === "color")[0];
    },
    hex() {
      return findAll(h.render(), (e) => e.type === "hex-input")[0];
    },
    preview() {
      return findAll(h.render(), (e) => e.type === swatch.default)[0].props
        .value;
    },
    clear() {
      findAll(h.render(), (e) => e.type === "button")[0].props.onClick();
    },
    type(text) {
      h.hex().props.onChange({ target: { value: text } });
    },
    choose(color) {
      h.native().props.onChange({ target: { value: color } });
    },
    reset(next) {
      value = next;
      h.render();
    },
    props(next) {
      props = next;
    },
    value: () => value,
    changes: () => changes,
  };
  return h;
}

test("a new nullable picker uses only a native display fallback and never assigns it to the form", () => {
  const h = pickerHarness();
  assert.equal(h.value(), null);
  assert.equal(h.preview(), null);
  assert.equal(h.hex().props.value, "");
  assert.equal(h.native().props.value, "#000000");
  assert.equal(h.changes(), 0);
});

test("picker and HEX input synchronize valid values including lowercase, white and black", () => {
  const h = pickerHarness("#FFC107");
  assert.equal(h.preview(), "#FFC107");
  h.choose("#4caf50");
  assert.equal(h.hex().props.value, "#4caf50");
  for (const value of ["#aBcDeF", "#FFFFFF", "#000000"]) {
    h.type(value);
    assert.equal(h.native().props.value, value);
    assert.equal(h.preview(), value);
  }
});

test("incomplete text retains the last valid preview, clearing and external resets discard stale color", () => {
  const h = pickerHarness("#FFC107");
  h.type("#4C");
  assert.equal(h.hex().props.value, "#4C");
  assert.equal(h.preview(), "#FFC107");
  assert.equal(h.native().props.value, "#FFC107");
  h.type("#4CAF50");
  assert.equal(h.preview(), "#4CAF50");
  h.clear();
  assert.equal(h.value(), null);
  assert.equal(h.preview(), null);
  h.type("#");
  assert.equal(h.preview(), null);
  h.reset("#FFFFFF");
  assert.equal(h.native().props.value, "#FFFFFF");
  h.reset(null);
  h.type("invalid");
  assert.equal(h.preview(), null);
  h.type("");
  assert.equal(h.value(), null);
});

test("disabled picker ignores late native events, manual edits and clear actions during save", () => {
  const h = pickerHarness("#FFC107");
  h.props({ disabled: true, error: "Invalid color", helperText: "Color help" });
  assert.equal(h.hex().props.disabled, true);
  assert.equal(h.native().props.disabled, true);
  h.type("#FFFFFF");
  h.choose("#FFFFFF");
  h.clear();
  assert.equal(h.value(), "#FFC107");
  assert.equal(h.changes(), 0);
  assert.equal(h.hex().props["aria-invalid"], true);
  assert.equal(
    h.hex().props["aria-describedby"],
    "color-test-help color-test-error",
  );
  assert.equal(
    findAll(h.render(), (e) => e.props?.role === "alert")[0].props.children,
    "Invalid color",
  );
  assert.ok(h.native().props["aria-label"]);
});

test("the crop RHF field blocks incomplete, malformed and oversized colors, accepts null and all valid cases", () => {
  const Fields = load(`${root}CropBasicFields.tsx`, {
    ...pickerDependencies,
    "react-hook-form": { Controller: "controller" },
    "@/i18n/navigation": { Link: "a" },
    "@/components/admin/form/ColorPicker": {
      __esModule: true,
      default: "picker",
    },
  }).default;
  const tree = Fields({
    form: {
      register: () => ({}),
      control: {},
      formState: { errors: { crop_color: { message: "Server error" } } },
    },
    categories: [],
    crop: null,
    busy: true,
  });
  const field = findAll(tree, (e) => e.type === "controller")[0];
  assert.equal(field.props.name, "crop_color");
  for (const value of [
    null,
    "#FFC107",
    "#abcdef",
    "#aBcDeF",
    "#000000",
    "#FFFFFF",
  ])
    assert.equal(field.props.rules.validate(value), true);
  for (const value of [
    "",
    "#",
    "#ABC",
    "FFC107",
    "#GGGGGG",
    "#12345678",
    "yellow",
    "rgb(255, 193, 7)",
    " #FFC107",
    "#FFC107\n",
  ])
    assert.equal(field.props.rules.validate(value), "validation.cropColor");
  const picker = field.props.render({ field: { value: "#FFC107" } });
  assert.equal(picker.props.error, "Server error");
  assert.equal(picker.props.disabled, true);
});

test("swatches apply only validated HEX styles and retain textual codes, neutral placeholders and theme borders", () => {
  for (const value of [
    "#FFFFFF",
    "#000000",
    "#aBcDeF",
    null,
    undefined,
    "red; background:url(evil)",
    "#ABC",
  ]) {
    const tree = swatch.default({ value });
    const box = findAll(tree, (e) => e.props?.["aria-hidden"])[0];
    const valid = swatch.isHexColor(value);
    assert.equal(box.props.style?.backgroundColor, valid ? value : undefined);
    assert.ok(box.props.className.includes("border-gray-300"));
    assert.ok(box.props.className.includes("dark:border-gray-600"));
    assert.equal(
      tree.props.children[1].props.children,
      valid ? value : "notAssigned",
    );
  }
});

test("crop list adds a color column aligned with each crop's swatch and keeps pagination and actions", () => {
  const table = {
    Table: "table",
    TableBody: "tbody",
    TableCell: "td",
    TableHeader: "thead",
    TableRow: "tr",
  };
  const List = load(`${root}CropsList.tsx`, {
    "@/i18n/navigation": { Link: "a" },
    "@/components/common/ImagePreview": { __esModule: true, default: "image" },
    "@/components/admin/common/ColorSwatch": swatch,
    "@/components/admin/ui/badge/Badge": { __esModule: true, default: "badge" },
    "@/components/admin/ui/table": table,
    "@/components/admin/common/UrlPagination": {
      __esModule: true,
      default: "pagination",
    },
    "./CropRowActions": { __esModule: true, default: "actions" },
  }).default;
  const tree = List({
    crops: [
      { id: 1, name: "Mustard", crop_color: "#FFC107" },
      { id: 2, name: "Wheat", crop_color: null },
    ],
    categories: [],
    filtered: false,
    pagination: { current_page: 2, last_page: 3 },
  });
  assert.deepEqual(
    findAll(tree, (e) => e.props?.isHeader).map((e) => e.props.children),
    [
      "fields.image",
      "fields.name",
      "fields.color",
      "fields.category",
      "fields.scientificName",
      "fields.slug",
      "fields.status",
      "fields.addedAt",
      "fields.actions",
    ],
  );
  assert.deepEqual(
    findAll(tree, (e) => e.type === swatch.default).map((e) => e.props.value),
    ["#FFC107", null],
  );
  assert.equal(findAll(tree, (e) => e.type === "actions").length, 2);
  assert.equal(
    findAll(tree, (e) => e.type === "pagination")[0].props.currentPage,
    2,
  );
});

test("variety list displays the parent crop's color without assigning colors to dependent records", () => {
  const List = load(
    "src/app/[locale]/(admin)/admin/(pages)/crop-varieties/_components/CropVarietiesList.tsx",
    {
      "@/i18n/navigation": { Link: "a" },
      "@/icons": {
        PlusIcon: "icon",
        DocsIcon: "icon",
        CropCategoryIcon: "icon",
      },
      "@/components/admin/common/ColorSwatch": swatch,
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
      "./CropVarietyRowActions": { __esModule: true, default: "actions" },
    },
  ).default;
  const tree = List({
    result: {
      data: [
        { id: 1, crop_name: "Mustard", crop_color: "#FFC107" },
        { id: 2, crop_name: "Wheat", crop_color: null },
      ],
      pagination: { total: 2 },
    },
    filtered: false,
    returnQuery: "",
  });
  assert.deepEqual(
    findAll(tree, (e) => e.type === swatch.default).map((e) => e.props.value),
    ["#FFC107"],
  );
});

test("color labels, helpers and validation have matching English/Hindi keys and interpolation", () => {
  const en = require("../src/messages/en.json"),
    hi = require("../src/messages/hi.json");
  for (const keys of [
    ["ui", "colorPicker"],
    ["crops", "fields"],
    ["crops", "form"],
    ["crops", "validation"],
  ]) {
    const a = keys.reduce((value, key) => value[key], en);
    const b = keys.reduce((value, key) => value[key], hi);
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const key of Object.keys(a))
      assert.deepEqual(a[key].match(/\{\w+\}/g), b[key].match(/\{\w+\}/g));
  }
});
