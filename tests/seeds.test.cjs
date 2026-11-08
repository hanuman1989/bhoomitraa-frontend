const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/seeds/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
const languages = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "hi", name: "Hindi", dir: "ltr" },
  { id: "ar", name: "Arabic", dir: "rtl" },
];
function load(file, dependencies = {}, globals = {}) {
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
    FormData,
    File,
    URLSearchParams,
    console,
    ...globals,
    require(name) {
      if (name === "react/jsx-runtime") return jsx;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return loadedModule.exports;
}
const domain = load("src/types/admin/seed.ts");
const ApiError = load("src/lib/api/ApiError.ts").ApiError;
const basic = {
  crop_id: 3,
  crop_variety_id: null,
  name: "Primary English name",
  slug: "mustard-seed",
  sku: "SEED-1",
  brand_name: null,
  producer_name: null,
  material_type: "seed",
  seed_type: null,
  propagation_method: null,
  seed_class: null,
  treatment_status: "unknown",
  default_unit_code: "g",
  reference_pack_quantity: null,
  reference_pack_unit_code: null,
  germination_reference_pct: "0",
  purity_reference_pct: null,
  seeds_per_gram: null,
  is_f1_hybrid: null,
  is_organic: false,
  is_pelleted: null,
};
const images = [
  { id: 11, image_url: "/image-11.jpg", alt_text: "First", sort_order: 1 },
  { id: 12, image_url: "/image-12.jpg", alt_text: null, sort_order: 2 },
];
const seed = {
  ...basic,
  id: 42,
  seed_id: 42,
  name: "Backend Hindi name",
  crop_name: "Mustard",
  crop_variety_name: null,
  description: null,
  planting_instructions: null,
  source_id: null,
  source: null,
  verification_status: "pending",
  is_active: false,
  requested_is_active: false,
  setup_status: "draft",
  completed_step: 1,
  next_step: 2,
  primary_image: images[0],
  images,
  translations: {
    en: {
      name: basic.name,
      description: "English description",
      planting_instructions: null,
    },
    hi: {
      name: "Hindi seed",
      description: null,
      planting_instructions: "Instructions",
    },
  },
  ready_to_finalize: false,
  readiness_errors: { completed_step: ["Complete all steps"] },
};
const pagination = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 1,
  from: 1,
  to: 1,
};
function serviceHarness(responses = [], admin = { is_super_user: true }) {
  const calls = [],
    invalidations = [];
  const service = load("src/lib/apis/admin/seeds.ts", {
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
  const translations = { getTranslations: async () => (key) => key };
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
  const actions = load("src/actions/admin/seeds.ts", {
    "next/cache": { revalidatePath: (path) => invalidations.push(path) },
    "next-intl/server": translations,
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new ApiError("Sign in", 401);
        return admin;
      },
    },
    "@/lib/apis/admin/seeds": service,
    "@/lib/api/handleActionError": errorHandler,
    "@/i18n/languages": { languages },
    "@/types/admin/seed": domain,
  });
  return { service: service.seedsAPI, actions, calls, invalidations };
}
test("seed client integrates all ten verified routes with exact methods, filters and empty finalize/delete bodies", async () => {
  const h = serviceHarness(Array(10).fill({ status: true, data: seed }));
  await h.service.list({
    keyword: "seed",
    is_active: "0",
    verification_status: "pending",
    setup_status: "draft",
    page: 2,
  });
  await h.service.show(42);
  await h.service.createStepOne(basic);
  await h.service.updateStepOne(42, basic);
  await h.service.saveTranslations(42, seed.translations);
  await h.service.saveMedia(42, new FormData());
  await h.service.review(42);
  await h.service.finalize(42);
  await h.service.updateStatus(42, true);
  await h.service.delete(42);
  assert.deepEqual(
    h.calls.map((call) => [call.url, call.options.method ?? "GET"]),
    [
      ["/admin/seeds", "GET"],
      ["/admin/seeds/42", "GET"],
      ["/admin/seeds/step-1", "POST"],
      ["/admin/seeds/42/step-1", "PATCH"],
      ["/admin/seeds/42/step-2", "PATCH"],
      ["/admin/seeds/42/step-3", "POST"],
      ["/admin/seeds/42/review", "GET"],
      ["/admin/seeds/42/finalize", "POST"],
      ["/admin/seeds/42/status", "PATCH"],
      ["/admin/seeds/42", "DELETE"],
    ],
  );
  assert.equal(h.calls[0].options.params.is_active, "0");
  assert.equal("data" in h.calls[7].options, false);
  assert.equal("data" in h.calls[9].options, false);
});
test("step one creates once and updates the same ID; payload allowlisting preserves decimal zero and nullable attributes", async () => {
  const h = serviceHarness(Array(2).fill({ status: true, data: seed }));
  assert.equal(
    (
      await h.actions.saveSeedBasic(null, {
        ...basic,
        is_active: true,
        verification_status: "verified",
        completed_step: 4,
      })
    ).data.id,
    42,
  );
  await h.actions.saveSeedBasic(42, { ...basic, name: "Updated" });
  assert.equal(h.calls[0].url, "/admin/seeds/step-1");
  assert.equal(h.calls[1].url, "/admin/seeds/42/step-1");
  const sent = h.calls[0].options.data;
  assert.equal(sent.germination_reference_pct, "0");
  assert.equal(sent.is_f1_hybrid, null);
  assert.equal(sent.is_organic, false);
  assert.equal("is_active" in sent, false);
  assert.equal("completed_step" in sent, false);
  assert.equal(h.invalidations.length, 6);
});
test("translations derive all configured locales and writable fields while omitted stored languages stay untouched", async () => {
  const h = serviceHarness([{ status: true, data: seed }]);
  await h.actions.saveSeedTranslations(42, {
    ...seed.translations,
    ar: {
      name: "Arabic seed",
      description: null,
      planting_instructions: "RTL instructions",
      id: 9,
    },
    legacy: { name: "Preserve" },
  });
  const sent = h.calls[0].options.data.translations;
  assert.deepEqual(Object.keys(sent), ["en", "hi", "ar"]);
  assert.equal("id" in sent.ar, false);
  assert.equal(sent.ar.planting_instructions, "RTL instructions");
  assert.equal(
    (await serviceHarness().actions.saveSeedTranslations(42, seed.translations))
      .success,
    false,
  );
});
test("multipart mixed-gallery ordering sends retained IDs and new tokens without re-uploading existing images", async () => {
  const h = serviceHarness([{ status: true, data: seed }]);
  const uploads = new FormData();
  uploads.append(
    "images[k1]",
    new File(["image"], "seed.webp", { type: "image/webp" }),
  );
  const result = await h.actions.saveSeedMedia(
    42,
    {
      source_id: null,
      verification_status: "pending",
      is_active: false,
      retain_image_ids: [12],
      remove_image_ids: [11],
      image_order: ["new:k1", "id:12"],
    },
    uploads,
  );
  assert.equal(result.success, true);
  const body = h.calls[0].options.data;
  assert.equal(body.get("source_id"), "");
  assert.equal(body.get("is_active"), "0");
  assert.deepEqual(body.getAll("image_order[]"), ["new:k1", "id:12"]);
  assert.deepEqual(body.getAll("retain_image_ids[]"), ["12"]);
  assert.deepEqual(body.getAll("remove_image_ids[]"), ["11"]);
  assert.equal(
    [...body.values()].filter((value) => value instanceof File).length,
    1,
  );
});
test("gallery reorder-only and removal-all payloads keep backend image-plan semantics", async () => {
  const h = serviceHarness(Array(2).fill({ status: true, data: seed }));
  await h.actions.saveSeedMedia(
    42,
    {
      source_id: 9,
      verification_status: "verified",
      is_active: true,
      retain_image_ids: [11, 12],
      remove_image_ids: [],
      image_order: ["id:12", "id:11"],
    },
    new FormData(),
  );
  assert.equal(
    [...h.calls[0].options.data.values()].filter(
      (value) => value instanceof File,
    ).length,
    0,
  );
  await h.actions.saveSeedMedia(
    42,
    {
      source_id: null,
      verification_status: "pending",
      is_active: false,
      retain_image_ids: [],
      remove_image_ids: [11, 12],
      image_order: [],
    },
    new FormData(),
  );
  assert.deepEqual(h.calls[1].options.data.getAll("remove_image_ids[]"), [
    "11",
    "12",
  ]);
});
test("uploads reject empty, oversized, unsupported, excessive and malformed files; reviewer boundaries remain authoritative", async () => {
  const values = {
    source_id: null,
    verification_status: "pending",
    is_active: false,
    retain_image_ids: [],
    remove_image_ids: [],
    image_order: ["new:k1"],
  };
  for (const file of [
    new File([], "seed.jpg", { type: "image/jpeg" }),
    new File(["x"], "seed.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    }),
  ]) {
    const h = serviceHarness();
    const data = new FormData();
    data.append("images[k1]", file);
    assert.equal(
      (await h.actions.saveSeedMedia(42, values, data)).success,
      false,
    );
    assert.equal(h.calls.length, 0);
  }
  const h = serviceHarness();
  const tooMany = new FormData();
  for (let i = 0; i < 9; i++)
    tooMany.append(
      `images[k${i}]`,
      new File(["x"], "seed.jpg", { type: "image/jpeg" }),
    );
  assert.equal(
    (await h.actions.saveSeedMedia(42, values, tooMany)).success,
    false,
  );
  const ordinary = serviceHarness([{ status: true, data: seed }], {
    is_super_user: false,
  });
  assert.equal(
    (
      await ordinary.actions.saveSeedMedia(
        42,
        { ...values, verification_status: "verified" },
        new FormData(),
      )
    ).success,
    false,
  );
  assert.equal(
    (await ordinary.actions.updateSeedStatus(42, true)).success,
    false,
  );
  assert.equal(
    (await ordinary.actions.updateSeedStatus(42, false)).success,
    true,
  );
});
test("all mutations authenticate and reject unsafe IDs; validation/conflicts are recoverable and 5xx details stay private", async () => {
  const h = serviceHarness([], null);
  await h.actions.saveSeedBasic(null, basic);
  await h.actions.saveSeedTranslations(42, {});
  await h.actions.saveSeedMedia(42, {}, new FormData());
  await h.actions.finalizeSeed(42);
  await h.actions.updateSeedStatus(42, false);
  await h.actions.deleteSeed(42);
  assert.equal(h.calls.length, 0);
  const invalid = serviceHarness();
  for (const id of [0, -1, 1.2, Infinity, "42"]) {
    assert.equal((await invalid.actions.finalizeSeed(id)).success, false);
    assert.equal((await invalid.actions.deleteSeed(id)).success, false);
  }
  const errors = {
    "translations.hi.name": ["Required"],
    "images.k1": ["Invalid image"],
  };
  const failed = serviceHarness([
    new ApiError("Invalid", 422, errors),
    new ApiError("Referenced", 409),
    new ApiError("SQL private detail", 500),
    { status: false },
  ]);
  assert.deepEqual(
    (await failed.actions.saveSeedBasic(42, basic)).errors,
    errors,
  );
  assert.equal((await failed.actions.deleteSeed(42)).message, "Referenced");
  assert.equal((await failed.actions.finalizeSeed(42)).message, "failed");
  assert.equal((await failed.actions.finalizeSeed(42)).success, false);
  assert.equal(failed.invalidations.length, 0);
  await assert.rejects(
    serviceHarness([
      Object.assign(new Error("NEXT_REDIRECT"), { controlFlow: true }),
    ]).actions.finalizeSeed(42),
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
  const slots = [],
    cleanups = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: initial };
      return [
        slots[i].value,
        (next) => {
          slots[i].value =
            typeof next === "function" ? next(slots[i].value) : next;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      slots[i] ??= { current: initial };
      return slots[i];
    },
    useEffect(callback) {
      const cleanup = callback();
      if (cleanup) cleanups.push(cleanup);
    },
    useTransition() {
      return [false, (callback) => callback()];
    },
  };
  return {
    react,
    reset() {
      cursor = 0;
    },
    cleanup() {
      cleanups.forEach((fn) => fn());
    },
  };
}
const ui = {
  "next-intl": {
    useTranslations: () =>
      Object.assign(
        (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key),
        { has: () => true },
      ),
  },
  "@/i18n/languages": {
    languages,
    getLanguage: (id) => languages.find((language) => language.id === id),
  },
  "@/i18n/routing": { routing: { defaultLocale: "en" } },
  "@/icons": new Proxy({}, { get: () => () => null }),
  "@/types/admin/seed": domain,
  "@/components/admin/common/ComponentCard": {
    __esModule: true,
    default: "card",
  },
  "@/components/admin/form/input/InputField": {
    __esModule: true,
    default: "input",
  },
  "@/components/admin/form/Label": { __esModule: true, default: "label" },
  "@/components/admin/common/FilterSelect": {
    __esModule: true,
    default: "select",
  },
  "@/components/admin/form/switch/Switch": {
    __esModule: true,
    default: "switch",
  },
  "@/components/admin/ui/badge/Badge": { __esModule: true, default: "badge" },
  "@/components/common/ImagePreview": { __esModule: true, default: "image" },
  "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
    { __esModule: true, default: "relation" },
  "@/i18n/navigation": { Link: "link" },
};
function stepHarness(
  file,
  record = seed,
  respond = async () => ({ success: false, message: "Retry" }),
) {
  const state = hooks(),
    rules = {},
    fieldErrors = [],
    calls = [],
    revoked = [];
  let values,
    drop,
    sequence = 0;
  const form = {
    control: {},
    formState: { errors: {}, isDirty: false },
    register(name, rule) {
      rules[name] = rule;
      return { name };
    },
    getValues(name) {
      return name
        ? name.split(".").reduce((object, key) => object[key], values)
        : values;
    },
    setValue(name, value) {
      values[name] = value;
      form.formState.isDirty = true;
    },
    clearErrors() {},
    setError(name, error) {
      fieldErrors.push({ name, ...error });
    },
    handleSubmit(submit) {
      return () => submit(values);
    },
  };
  const Form = load(
    root + file,
    {
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
              value: values[name],
              onChange: (value) => form.setValue(name, value),
            },
          };
        },
      },
      "react-dropzone": {
        useDropzone(options) {
          drop = options;
          return {
            getRootProps: () => ({}),
            getInputProps: () => ({}),
            isDragActive: false,
          };
        },
      },
      "@/hooks/useModal": {
        useModal() {
          const [isOpen, setOpen] = state.react.useState(false);
          return {
            isOpen,
            openModal: () => setOpen(true),
            closeModal: () => setOpen(false),
          };
        },
      },
      "./SeedConfirmDialog": { __esModule: true, default: "confirm" },
    },
    {
      URL: {
        createObjectURL: () => `blob:test-${++sequence}`,
        revokeObjectURL: (value) => revoked.push(value),
      },
      crypto: { randomUUID: () => `key-${sequence}` },
    },
  ).default;
  const render = (extra = {}) => {
    state.reset();
    return Form({
      seed: record,
      choices: {},
      selections: {},
      busy: false,
      canReview: true,
      onDirty() {},
      onSave: async (...args) => {
        calls.push(args);
        return respond(...args);
      },
      ...extra,
    });
  };
  render();
  return {
    render,
    rules,
    fieldErrors,
    calls,
    revoked,
    values: () => values,
    fill: (next) => Object.assign(values, next),
    drop: (accepted, rejected = []) => drop.onDrop(accepted, rejected),
    submit: () =>
      findAll(render(), (e) => e.type === "form")[0].props.onSubmit({
        preventDefault() {},
      }),
    cleanup: state.cleanup,
  };
}
test("basic form uses canonical default-language name, correct conditional units/decimals and null flags", async () => {
  const h = stepHarness("Step1BasicDetails.tsx");
  assert.equal(h.values().name, basic.name);
  assert.equal(h.values().is_f1_hybrid, null);
  assert.equal(h.values().germination_reference_pct, "0");
  assert.equal(h.rules.germination_reference_pct.validate("0"), true);
  assert.notEqual(h.rules.germination_reference_pct.validate("100.01"), true);
  assert.notEqual(h.rules.seeds_per_gram.validate("0"), true);
  assert.equal(h.rules.seeds_per_gram.validate("12.123"), true);
  assert.notEqual(h.rules.seeds_per_gram.validate("12.1234"), true);
  h.fill({ reference_pack_quantity: "1.2500", reference_pack_unit_code: "g" });
  assert.equal(h.rules.reference_pack_quantity.validate.paired("1.2500"), true);
  await h.submit();
  assert.equal(h.calls[0][0].reference_pack_quantity, "1.2500");
  h.fill({ material_type: "grafted_plant", default_unit_code: "plant" });
  h.render();
  assert.equal(h.rules.default_unit_code.validate("plant"), true);
  assert.notEqual(h.rules.default_unit_code.validate("kg"), true);
  await h.submit();
  assert.equal(h.calls[1][0].germination_reference_pct, null);
  assert.equal(h.calls[1][0].is_f1_hybrid, null);
  assert.equal(h.calls[1][0].is_organic, false);
});
test("crop change clears variety without changing other fields and basic server errors stay inline", async () => {
  const h = stepHarness("Step1BasicDetails.tsx", seed, async () => ({
    success: false,
    errors: { sku: ["Duplicate"], slug: ["Duplicate slug"] },
  }));
  h.fill({ crop_variety_id: "9" });
  const c = findAll(
    h.render(),
    (e) => e.type === "controller" && e.props.name === "crop_id",
  )[0];
  const binding = c.props.render({
    field: { value: "3", onChange: (value) => h.fill({ crop_id: value }) },
  });
  binding.props.onChange("4");
  assert.equal(h.values().crop_variety_id, "");
  assert.equal(h.values().name, basic.name);
  await h.submit();
  assert.deepEqual(h.fieldErrors.map((error) => error.name).sort(), [
    "sku",
    "slug",
  ]);
});
test("translation cards support additional configured RTL languages, prefill values and preserve omitted legacy languages", async () => {
  const record = {
    ...seed,
    translations: {
      ...seed.translations,
      ar: {
        name: "Arabic",
        description: "RTL",
        planting_instructions: "Saved",
      },
      old: { name: "Legacy", description: null, planting_instructions: null },
    },
  };
  const h = stepHarness("Step2Translations.tsx", record, async () => ({
    success: false,
    errors: { "translations.ar.name": ["Required"] },
  }));
  const tree = h.render();
  assert.equal(findAll(tree, (e) => e.type === "input").length, 4);
  assert.equal(
    findAll(tree, (e) => e.type === "textarea" && e.props.lang === "ar")[0]
      .props.dir,
    "rtl",
  );
  assert.equal(
    h.rules["translations.ar.name"].required.startsWith("validation.name"),
    true,
  );
  assert.equal(
    h.values().translations.hi.planting_instructions,
    "Instructions",
  );
  await h.submit();
  assert.equal(h.calls[0][0].ar.name, "Arabic");
  assert.equal("old" in h.calls[0][0], false);
  assert.equal(h.values().translations.old.name, "Legacy");
  assert.equal(h.fieldErrors[0].name, "translations.ar.name");
});
test("media accepts valid files, rejects invalid/count overflow, reorders stable IDs and keeps failed-upload drafts", async () => {
  const h = stepHarness("Step3MediaSource.tsx");
  const file = new File(["x"], "seed.webp", { type: "image/webp" });
  h.drop([file]);
  assert.equal(h.values().gallery.length, 3);
  assert.equal(h.values().gallery[2].token, "new:key-1");
  let tree = h.render(),
    items = findAll(tree, (e) => e.type === "li");
  items[2].props.onDragStart({ dataTransfer: { setData() {} } });
  items[0].props.onDrop({ preventDefault() {}, stopPropagation() {} });
  assert.equal(h.values().gallery[0].token, "new:key-1");
  await h.submit();
  const [values, uploads] = h.calls[0];
  assert.deepEqual(clone(values.image_order), ["new:key-1", "id:11", "id:12"]);
  assert.equal(uploads.get("images[key-1]"), file);
  assert.equal(h.values().gallery.length, 3);
  assert.equal(h.revoked.length, 0);
  h.drop([], [{ errors: [{ code: "file-too-large" }] }]);
  assert.equal(h.fieldErrors.at(-1).name, "gallery");
  h.drop(Array(6).fill(file));
  assert.equal(h.values().gallery.length, 3);
  assert.equal(h.fieldErrors.at(-1).name, "gallery");
  h.cleanup();
  assert.deepEqual(h.revoked, ["blob:test-1"]);
});
test("saved-image removal requires confirmation and remains local until step three saves; new preview removal revokes its URL", async () => {
  const h = stepHarness("Step3MediaSource.tsx");
  let tree = h.render();
  findAll(
    tree,
    (e) =>
      e.type === "button" &&
      e.props["aria-label"] === 'media.remove:{"number":1}',
  )[0].props.onClick();
  assert.equal(h.values().gallery.length, 2);
  assert.equal(h.calls.length, 0);
  tree = h.render();
  findAll(tree, (e) => e.type === "confirm")[0].props.onConfirm();
  assert.equal(h.values().gallery.length, 1);
  assert.equal(h.calls.length, 0);
  await h.submit();
  assert.deepEqual(clone(h.calls[0][0].remove_image_ids), [11]);
  assert.deepEqual(clone(h.calls[0][0].image_order), ["id:12"]);
  h.drop([new File(["x"], "new.png", { type: "image/png" })]);
  tree = h.render();
  findAll(
    tree,
    (e) =>
      e.type === "button" &&
      e.props["aria-label"] === 'media.remove:{"number":2}',
  )[0].props.onClick();
  assert.deepEqual(h.revoked, ["blob:test-1"]);
});
test("review uses saved backend readiness/counts, exposes edit targets and finalizes only eligible existing records", () => {
  let saved = 0;
  const targets = [];
  const Review = load(root + "Step4ReviewSave.tsx", ui).default;
  const render = (record) =>
    Review({
      seed: record,
      busy: false,
      canReview: true,
      viewOnly: false,
      errors: {},
      onEdit: (step) => targets.push(step),
      onSave: async () => saved++,
    });
  let tree = render(seed);
  tree.props.onSubmit({ preventDefault() {} });
  assert.equal(saved, 0);
  assert.equal(
    findAll(tree, (e) => e.props.children === "review.notReady").length,
    1,
  );
  assert.equal(findAll(tree, (e) => e.props.children === basic.name).length, 2);
  const ready = {
    ...seed,
    completed_step: 3,
    ready_to_finalize: true,
    readiness_errors: {},
  };
  tree = render(ready);
  tree.props.onSubmit({ preventDefault() {} });
  assert.equal(saved, 1);
  assert.equal(
    findAll(tree, (e) => e.props.children === 'review.imageCount:{"count":2}')
      .length,
    1,
  );
  findAll(
    tree.props.children[0].props.title,
    (e) => e.type === "button",
  )[0].props.onClick();
  assert.deepEqual(targets, [1]);
});

function wizardHarness(record, step, responses, throwNavigation = false) {
  const state = hooks(),
    calls = [],
    routes = [],
    successes = [];
  const action =
    (operation) =>
    async (...args) => {
      calls.push({ operation, args });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    };
  const Wizard = load(
    root + "SeedForm.tsx",
    {
      ...ui,
      react: state.react,
      "@/i18n/navigation": {
        useRouter: () => ({
          push: (href) => {
            routes.push({ method: "push", href });
            if (throwNavigation) throw new Error("Navigation failed");
          },
          replace: (href) => {
            routes.push({ method: "replace", href });
            if (throwNavigation) throw new Error("Navigation failed");
          },
        }),
      },
      "@/hooks/useModal": {
        useModal() {
          const [isOpen, setOpen] = state.react.useState(false);
          return {
            isOpen,
            openModal: () => setOpen(true),
            closeModal: () => setOpen(false),
          };
        },
      },
      "react-hot-toast": {
        success: (message) => successes.push(message),
        error() {},
      },
      "@/actions/admin/seeds": {
        saveSeedBasic: action("basic"),
        saveSeedTranslations: action("translations"),
        saveSeedMedia: action("media"),
        finalizeSeed: action("finalize"),
      },
      "./Step1BasicDetails": { __esModule: true, default: "basic" },
      "@/components/admin/common/ProductWizardSteps": {
        __esModule: true,
        default: "stepper",
      },
      "./Step2Translations": { __esModule: true, default: "translations" },
      "./Step3MediaSource": { __esModule: true, default: "media" },
      "./Step4ReviewSave": { __esModule: true, default: "review" },
      "./SeedConfirmDialog": { __esModule: true, default: "confirm" },
    },
    { window: { addEventListener() {}, removeEventListener() {} } },
  ).default;
  return {
    calls,
    routes,
    successes,
    render(extra = {}) {
      state.reset();
      return Wizard({
        initialSeed: record,
        step,
        choices: {},
        selections: {},
        canReview: true,
        viewOnly: false,
        ...extra,
      });
    },
  };
}
test("wizard retains a newly created ID across navigation failure and never creates another record on retry", async () => {
  const h = wizardHarness(
    null,
    1,
    [
      { success: true, data: seed },
      { success: false, message: "Retry" },
    ],
    true,
  );
  let form = findAll(h.render(), (e) => e.type === "basic")[0];
  const first = form.props.onSave(basic);
  const duplicate = await form.props.onSave(basic);
  assert.equal(duplicate.success, false);
  await first;
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].args[0], null);
  assert.equal(h.routes[0].href, "/admin/seeds/42/step/2");
  form = findAll(h.render(), (e) => e.type === "basic")[0];
  await form.props.onSave(basic);
  assert.equal(h.calls[1].args[0], 42);
});
test("wizard guards unsaved navigation, preserves saved drafts on cancel, and finalizes the existing seed only", async () => {
  const h = wizardHarness(seed, 2, []);
  let tree = h.render();
  findAll(tree, (e) => e.type === "translations")[0].props.onDirty(true);
  tree = h.render();
  findAll(
    tree,
    (e) => e.type === "button" && e.props.children === "cancel",
  )[0].props.onClick();
  assert.equal(h.routes.length, 0);
  tree = h.render();
  findAll(tree, (e) => e.type === "confirm")[0].props.onConfirm();
  assert.equal(h.routes[0].href, "/admin/seeds");
  assert.equal(h.calls.length, 0);
  const final = wizardHarness(
    { ...seed, completed_step: 3, ready_to_finalize: true },
    4,
    [
      {
        success: true,
        data: { ...seed, completed_step: 4, setup_status: "completed" },
      },
    ],
  );
  await findAll(final.render(), (e) => e.type === "review")[0].props.onSave();
  assert.deepEqual(final.calls, [{ operation: "finalize", args: [42] }]);
  assert.equal(final.routes[0].href, "/admin/seeds");
  assert.equal(final.successes.length, 1);
});
test("editor loads one saved record, uses review for step four, enforces progress and preserves 404/redirect control flow", async () => {
  const calls = [];
  let record = seed;
  const control = (message) => {
    throw Object.assign(new Error(message), { controlFlow: true });
  };
  const Editor = load(root + "SeedEditor.tsx", {
    "next-intl/server": {
      getTranslations: async () => (key) => key,
      getLocale: async () => "hi",
    },
    "next/navigation": { notFound: () => control("Not found") },
    "@/i18n/navigation": {
      redirect: (destination) => {
        throw Object.assign(new Error("Redirect"), {
          controlFlow: true,
          destination,
        });
      },
    },
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: false }) },
    "@/lib/apis/admin/seeds": {
      seedsAPI: {
        show: async (id) => {
          calls.push(["show", id]);
          if (record instanceof Error || record instanceof ApiError)
            throw record;
          return { status: true, data: record };
        },
        review: async (id) => {
          calls.push(["review", id]);
          return { status: true, data: record };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async () => ({ options: [] }),
      getTimelineSelections: async () => ({}),
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { message: "Safe failure" };
      },
    },
    "./SeedForm": { __esModule: true, default: "wizard" },
    "./SeedHeader": { __esModule: true, default: "header" },
  }).default;
  let tree = await Editor({ id: "42", step: "1" });
  assert.equal(
    findAll(tree, (e) => e.type === "wizard")[0].props.initialSeed,
    seed,
  );
  assert.deepEqual(calls, [["show", 42]]);
  await assert.rejects(
    Editor({ id: "42", step: "4" }),
    (error) => error.destination.href === "/admin/seeds/42/step/2",
  );
  assert.equal(calls.at(-1)[0], "review");
  record = { ...seed, completed_step: 3, ready_to_finalize: true };
  tree = await Editor({ id: "42", step: "4" });
  assert.equal(findAll(tree, (e) => e.type === "wizard")[0].props.step, 4);
  const before = calls.length;
  await assert.rejects(Editor({ id: "bad", step: "1" }), /Not found/);
  assert.equal(calls.length, before);
  record = new ApiError("Missing", 404);
  await assert.rejects(Editor({ id: "42", step: "1" }), /Not found/);
});
test("listing uses backend pagination/zero status and filters; invalid variety without a crop is cleared", async () => {
  const calls = [];
  const Content = load(root + "SeedsContent.tsx", {
    "next-intl/server": {
      getTranslations: async () => (key) => key,
      getLocale: async () => "en",
    },
    "@/i18n/navigation": {
      redirect: (destination) => {
        throw Object.assign(new Error("Redirect"), {
          controlFlow: true,
          destination,
        });
      },
    },
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
    "@/lib/apis/admin/seeds": {
      seedsAPI: {
        list: async (params) => {
          calls.push(clone(params));
          return {
            status: true,
            data: [seed],
            pagination: { ...pagination, current_page: params.page },
          };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async () => ({ options: [] }),
      getTimelineSelections: async () => ({}),
    },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        throw error;
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/types/admin/seed": domain,
    "./SeedsFilters": { __esModule: true, default: "filters" },
    "./SeedsList": { __esModule: true, default: "list" },
  }).default;
  await Content({
    searchParams: Promise.resolve({
      keyword: "  seed  ",
      crop_variety_id: "9",
      is_active: "0",
      setup_status: "draft",
      verification_status: "pending",
      material_type: "seed",
    }),
  });
  assert.equal(calls[0].keyword, "seed");
  assert.equal(calls[0].crop_variety_id, "");
  assert.equal(calls[0].is_active, "0");
  assert.equal(calls[0].setup_status, "draft");
  await assert.rejects(
    Content({
      searchParams: Promise.resolve({
        page: "10",
        is_active: "0",
        setup_status: "draft",
      }),
    }),
    (error) =>
      error.destination.href.query.page === 1 &&
      error.destination.href.query.is_active === "0",
  );
});
test("filter apply/reset preserve unrelated query parameters and inactive zero while crop changes clear variety", () => {
  const h = hooks(),
    routes = [];
  const Filter = load(root + "SeedsFilters.tsx", {
    ...ui,
    react: h.react,
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("page=3&keep=yes"),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (href) => routes.push(href) }),
    },
    "react-hook-form": {
      Controller: "controller",
      useForm: () => ({
        register: (name) => ({ name }),
        control: {},
        handleSubmit: (callback) => () => callback(values),
        setValue: (name, value) => {
          values[name] = value;
        },
        reset: (next) => {
          values = { ...next };
        },
      }),
      useWatch: ({ name }) => values[name],
    },
  }).default;
  let values = {
    keyword: "seed",
    crop_id: "3",
    crop_variety_id: "5",
    material_type: "seed",
    is_active: "0",
    verification_status: "pending",
    setup_status: "draft",
  };
  const render = () => {
    h.reset();
    return Filter({
      initialFilters: { ...values },
      choices: {},
      selections: {},
    });
  };
  let tree = render();
  const crop = findAll(
    tree,
    (e) => e.type === "controller" && e.props.name === "crop_id",
  )[0].props.render({
    field: {
      value: "3",
      onChange: (value) => {
        values.crop_id = value;
      },
    },
  });
  crop.props.onChange("6");
  assert.equal(values.crop_variety_id, "");
  tree.props.onSubmit();
  let query = new URL(routes[0], "http://localhost").searchParams;
  assert.equal(query.get("is_active"), "0");
  assert.equal(query.get("keep"), "yes");
  assert.equal(query.has("page"), false);
  tree = render();
  findAll(
    tree,
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  query = new URL(routes[1], "http://localhost").searchParams;
  assert.equal(query.size, 1);
  assert.equal(query.get("keep"), "yes");
});
test("seed table has the nine requested columns, thumbnail/SKU, draft distinction and preserved backend labels", () => {
  const List = load(root + "SeedsList.tsx", {
    ...ui,
    "@/components/admin/common/UrlPagination": {
      __esModule: true,
      default: "pagination",
    },
    "@/components/admin/ui/table": {
      Table: "table",
      TableHeader: "thead",
      TableBody: "tbody",
      TableRow: "tr",
      TableCell: "td",
    },
    "./SeedRowActions": { __esModule: true, default: "actions" },
  }).default;
  const tree = List({
    result: { data: [seed], pagination },
    filtered: false,
    canReview: false,
  });
  assert.equal(findAll(tree, (e) => e.props.isHeader).length, 9);
  assert.equal(
    findAll(tree, (e) => e.type === "image")[0].props.src,
    images[0].image_url,
  );
  assert.equal(
    findAll(tree, (e) => e.props.children === "Backend Hindi name").length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.props.children === "setup.draft").length,
    1,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "pagination")[0].props.totalPages,
    1,
  );
});
test("row actions respect draft/publication permissions and open confirmation before mutation", () => {
  const h = hooks();
  let calls = 0;
  const Row = load(root + "SeedRowActions.tsx", {
    ...ui,
    react: h.react,
    "@headlessui/react": {
      Menu: "menu",
      MenuButton: "button",
      MenuItem: "item",
      MenuItems: "items",
    },
    "@/hooks/useModal": {
      useModal() {
        const [isOpen, setOpen] = h.react.useState(false);
        return {
          isOpen,
          openModal: () => setOpen(true),
          closeModal: () => setOpen(false),
        };
      },
    },
    "react-hot-toast": { success() {}, error() {} },
    "@/actions/admin/seeds": {
      deleteSeed: async () => {
        calls++;
        return { success: false, message: "Referenced" };
      },
      updateSeedStatus: async () => {
        calls++;
        return { success: true };
      },
    },
    "./SeedConfirmDialog": { __esModule: true, default: "confirm" },
  }).default;
  const render = (record = seed, canReview = false) => {
    h.reset();
    return Row({ seed: record, canReview });
  };
  let tree = render();
  assert.equal(
    findAll(tree, (e) => e.props.children === "actions.activate").length,
    0,
  );
  assert.equal(
    findAll(tree, (e) => e.props.href === "/admin/seeds/42/step/2").length,
    1,
  );
  findAll(
    tree,
    (e) => e.type === "button" && e.props.children === "actions.delete",
  )[0].props.onClick();
  assert.equal(calls, 0);
  tree = render();
  assert.equal(findAll(tree, (e) => e.type === "confirm").length, 1);
  assert.equal(
    findAll(
      render({ ...seed, is_active: true, setup_status: "completed" }),
      (e) => e.props.children === "actions.delete",
    ).length,
    0,
  );
});
test("English/Hindi seed messages match and compile, all enums are labeled, and upload body limit covers eight 5 MB files", () => {
  const { createTranslator } = require("use-intl");
  const en = require("../src/messages/en.json").seeds,
    hi = require("../src/messages/hi.json").seeds;
  function compare(a, b) {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const key of Object.keys(a)) {
      if (typeof a[key] === "object") compare(a[key], b[key]);
      else {
        const args = (value) =>
          [...value.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]).sort();
        assert.deepEqual(args(a[key]), args(b[key]));
        assert.equal(/\?{2,}|\uFFFD/.test(b[key]), false);
      }
    }
  }
  compare(en, hi);
  assert.match(hi.title, /[\u0900-\u097f]/);
  for (const [locale, messages] of [
    ["en", en],
    ["hi", hi],
  ]) {
    const failures = [];
    const t = createTranslator({
      locale,
      messages: { seeds: messages },
      namespace: "seeds",
      onError: (error) => failures.push(error.message),
    });
    function visit(object, prefix = "") {
      for (const [key, value] of Object.entries(object)) {
        const name = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object") visit(value, name);
        else
          t(name, {
            count: 3,
            id: 42,
            sku: "SKU",
            from: 1,
            to: 3,
            total: 3,
            name: "Seed",
            language: "Arabic",
            number: 1,
            places: 2,
            max: 100,
          });
      }
    }
    visit(messages);
    assert.deepEqual(failures, []);
    for (const value of domain.materialTypes)
      assert.ok(messages.materials[value]);
  }
  assert.match(
    fs.readFileSync(path.join(__dirname, "../next.config.mjs"), "utf8"),
    /bodySizeLimit: "42mb"/,
  );
});
