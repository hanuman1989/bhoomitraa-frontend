const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsxRuntime = require("react/jsx-runtime");

const clone = (value) => JSON.parse(JSON.stringify(value));
const entered = {
  slug: "cereals",
  is_active: true,
  translations: {
    en: { name: "Cereals", description: "Grains" },
    hi: { name: "Hindi name", description: "Description" },
  },
};

// Retain hook and form state across renders, as Next.js does for a restored
// Activity page. Exercise the real component's submit handler, not a copy of it.
function formHarness(results, category) {
  const hooks = [];
  const calls = [];
  const navigations = [];
  let cursor = 0;
  let defaults;
  let values;
  let transition;
  const react = {
    useRef(initial) {
      const index = cursor++;
      hooks[index] ??= { current: initial };
      return hooks[index];
    },
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: initial };
      return [
        hooks[index].value,
        (next) => {
          hooks[index].value =
            typeof next === "function" ? next(hooks[index].value) : next;
        },
      ];
    },
    useTransition() {
      const index = cursor++;
      hooks[index] ??= { pending: false };
      return [
        hooks[index].pending,
        (task) => {
          hooks[index].pending = true;
          transition = Promise.resolve()
            .then(task)
            .finally(() => {
              hooks[index].pending = false;
            });
        },
      ];
    },
  };
  const noop = () => null;
  const compiledModule = { exports: {} };
  const filename = path.join(
    __dirname,
    "../src/app/[locale]/(admin)/admin/(pages)/crop-categories/_components/CropCategoryForm.tsx",
  );
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      module: compiledModule,
      exports: compiledModule.exports,
      require(name) {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "react-hook-form")
          return {
            Controller: noop,
            useForm(options) {
              if (!defaults) {
                defaults = clone(options.defaultValues);
                values = clone(defaults);
              }
              return {
                register: () => ({}),
                control: {},
                formState: { errors: {} },
                setError: noop,
                handleSubmit: (submit) => () => submit(clone(values)),
                reset: () => {
                  values = clone(defaults);
                },
              };
            },
          };
        if (name === "next-intl")
          return { useTranslations: () => (key) => key };
        if (name === "@/i18n/languages")
          return { languages: [{ id: "en" }, { id: "hi" }] };
        if (name === "react-hot-toast") return { success: noop, error: noop };
        if (name === "@/i18n/navigation")
          return {
            useRouter: () => ({ push: (route) => navigations.push(route) }),
          };
        if (name === "@/actions/admin/cropCategories")
          return {
            saveCropCategory: async (...args) => {
              calls.push(clone(args));
              const result = results.shift();
              if (!result) throw new Error("Unexpected save");
              return result;
            },
          };
        if (name === "@/icons") return { CheckLineIcon: noop, InfoIcon: noop };
        return { __esModule: true, default: noop };
      },
    },
    { filename },
  );
  function render() {
    cursor = 0;
    return compiledModule.exports.default({ category });
  }
  function fieldset(element) {
    if (element?.type === "fieldset") return element;
    for (const child of [].concat(element?.props?.children ?? [])) {
      const match = fieldset(child);
      if (match) return match;
    }
  }
  return {
    calls,
    navigations,
    fill(next) {
      values = clone(next);
    },
    values: () => clone(values),
    disabled: () => fieldset(render()).props.disabled,
    async submit() {
      render().props.onSubmit({ preventDefault() {} });
      await transition;
    },
    render,
  };
}

test("returning to a successfully submitted create form gives blank, enabled fields and a new ID", async () => {
  const form = formHarness([
    { success: true, message: "Saved", data: { id: 42 } },
    { success: true, message: "Saved", data: { id: 43 } },
  ]);
  form.render();
  form.fill(entered);
  await form.submit();
  assert.equal(form.navigations[0], "/admin/crop-categories");
  assert.equal(form.disabled(), false);
  assert.deepEqual(form.values(), {
    slug: "",
    is_active: false,
    translations: {
      en: { name: "", description: "" },
      hi: { name: "", description: "" },
    },
  });
  form.fill({ ...entered, slug: "pulses" });
  await form.submit();
  assert.equal(form.calls[0][0], null);
  assert.equal(form.calls[1][0], null);
  assert.equal(form.calls[1][1].slug, "pulses");
});

test("failed saves keep entered values and reenable the form", async () => {
  const form = formHarness([{ success: false, message: "Validation failed" }]);
  form.render();
  form.fill(entered);
  await form.submit();
  assert.deepEqual(form.values(), entered);
  assert.equal(form.disabled(), false);
  assert.equal(form.navigations.length, 0);
});

test("partial publication failures retain the created ID until a retry succeeds", async () => {
  const form = formHarness([
    { success: false, message: "Publication failed", data: { id: 42 } },
    { success: true, message: "Saved", data: { id: 42 } },
  ]);
  form.render();
  form.fill(entered);
  await form.submit();
  assert.deepEqual(form.values(), entered);
  assert.equal(form.disabled(), false);
  await form.submit();
  assert.equal(form.calls[1][0], 42);
  assert.equal(form.values().slug, "");
  assert.equal(form.disabled(), false);
});

test("edit forms keep their record ID and saved values without a permanent disabled state", async () => {
  const category = { id: 42, ...entered };
  const form = formHarness(
    [
      { success: true, message: "Saved", data: category },
      { success: true, message: "Saved", data: category },
    ],
    category,
  );
  form.render();
  form.fill({ ...entered, slug: "grain-crops" });
  await form.submit();
  assert.equal(form.values().slug, "grain-crops");
  assert.equal(form.disabled(), false);
  await form.submit();
  assert.equal(form.calls[1][0], 42);
});
