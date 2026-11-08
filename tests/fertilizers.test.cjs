const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/fertilizers/_components/";
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

const seedDomain = load("src/types/admin/seed.ts");
const domain = load("src/types/admin/fertilizer.ts", {
  "@/types/admin/seed": seedDomain,
});
const ApiError = load("src/lib/api/ApiError.ts").ApiError;
const basic = {
  name: "Urea",
  slug: "urea",
  fertilizer_code: "FRT-001",
  fertilizer_type: "straight",
  form: "granular",
  grade: "46-0-0",
  brand_name: "IFFCO",
  manufacturer_name: null,
  default_unit_code: "kg",
  reference_pack_quantity: "50.0000",
  reference_pack_unit_code: "kg",
  application_method: null,
};
const images = [
  { id: 11, image_url: "/image-11.jpg", alt_text: "First", sort_order: 1 },
  { id: 12, image_url: "/image-12.jpg", alt_text: null, sort_order: 2 },
];
const nutrients = [
  {
    id: 8,
    nutrient_code: "N",
    content_value: "46.0000",
    content_unit_code: "percent_ww",
  },
  {
    id: 9,
    nutrient_code: "S",
    content_value: "0.0000",
    content_unit_code: "percent_ww",
  },
];
const fertilizer = {
  ...basic,
  id: 42,
  fertilizer_id: 42,
  name: "यूरिया",
  source_id: null,
  source: null,
  description: null,
  usage_instructions: null,
  composition_notes: "Label values",
  nutrients,
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
      usage_instructions: null,
    },
    hi: {
      name: "यूरिया",
      description: null,
      usage_instructions: "Instructions",
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
  const service = load("src/lib/apis/admin/fertilizers.ts", {
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
  const actions = load("src/actions/admin/fertilizers.ts", {
    "next/cache": { revalidatePath: (path) => invalidations.push(path) },
    "next-intl/server": translations,
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new ApiError("Sign in", 401);
        return admin;
      },
    },
    "@/lib/apis/admin/fertilizers": service,
    "@/lib/api/handleActionError": errorHandler,
    "@/i18n/languages": { languages },
    "@/types/admin/fertilizer": domain,
    "@/types/admin/seed": seedDomain,
  });
  return { service: service.fertilizersAPI, actions, calls, invalidations };
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
    useLocale: () => "en-IN",
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
  "@/types/admin/fertilizer": domain,
  "@/types/admin/seed": seedDomain,
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
  record = fertilizer,
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
    file.startsWith("src/") ? file : root + file,
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
        useFieldArray({ name, rules: rule }) {
          rules[name] = rule;
          return {
            fields: values[name].map((row, index) => ({
              ...row,
              id: "row-" + index,
            })),
            append: (row) => {
              values[name].push(row);
              form.formState.isDirty = true;
            },
            remove: (index) => {
              values[name].splice(index, 1);
              form.formState.isDirty = true;
            },
          };
        },
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
      "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
        { __esModule: true, default: "confirm" },
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
      fertilizer: record,
      seed: record,
      namespace: "fertilizers",
      instructionsField: "usage_instructions",
      requireSourceWhenVerified: false,
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

test("fertilizer client uses eleven verified routes and empty finalize/delete bodies", async () => {
  const h = serviceHarness();
  await h.service.list({
    fertilizer_type: "straight",
    form: "granular",
    verification_status: "pending",
    is_active: "0",
    page: 2,
  });
  await h.service.show(42);
  await h.service.createStepOne(basic);
  await h.service.updateStepOne(42, basic);
  await h.service.saveNutrients(42, { nutrients: [], composition_notes: null });
  await h.service.saveTranslations(42, fertilizer.translations);
  await h.service.saveMedia(42, new FormData());
  await h.service.review(42);
  await h.service.finalize(42);
  await h.service.updateStatus(42, false);
  await h.service.delete(42);
  assert.deepEqual(
    h.calls.map((c) => [c.url, c.options.method ?? "GET"]),
    [
      ["/admin/fertilizers", "GET"],
      ["/admin/fertilizers/42", "GET"],
      ["/admin/fertilizers/step-1", "POST"],
      ["/admin/fertilizers/42/step-1", "PATCH"],
      ["/admin/fertilizers/42/step-2", "PATCH"],
      ["/admin/fertilizers/42/step-3", "PATCH"],
      ["/admin/fertilizers/42/step-4", "POST"],
      ["/admin/fertilizers/42/review", "GET"],
      ["/admin/fertilizers/42/finalize", "POST"],
      ["/admin/fertilizers/42/status", "PATCH"],
      ["/admin/fertilizers/42", "DELETE"],
    ],
  );
  assert.equal(h.calls[0].options.params.is_active, "0");
  assert.equal(h.calls[8].options.data, undefined);
  assert.equal(h.calls[10].options.data, undefined);
  assert.deepEqual(clone(h.calls[9].options.data), { is_active: false });
});
test("basic and nutrient saves allowlist actual fields, retain strings and update the existing ID", async () => {
  const h = serviceHarness(Array(3).fill({ status: true, data: fertilizer }));
  await h.actions.saveFertilizerBasic(null, {
    ...basic,
    is_active: true,
    verification_status: "verified",
    translations: {},
    crop_id: 3,
  });
  assert.deepEqual(clone(h.calls[0].options.data), basic);
  await h.actions.saveFertilizerBasic(42, basic);
  assert.equal(h.calls[1].url, "/admin/fertilizers/42/step-1");
  await h.actions.saveFertilizerNutrients(42, {
    nutrients: [{ ...nutrients[1], is_primary: true }],
    composition_notes: "Saved",
  });
  assert.deepEqual(clone(h.calls[2].options.data), {
    nutrients: [
      {
        nutrient_code: "S",
        content_value: "0.0000",
        content_unit_code: "percent_ww",
      },
    ],
    composition_notes: "Saved",
  });
  assert.equal(h.invalidations.length, 9);
});
test("translations derive all configured locales and writable fields while omitted stored languages stay untouched", async () => {
  const h = serviceHarness([{ status: true, data: fertilizer }]);
  await h.actions.saveFertilizerTranslations(42, {
    ...fertilizer.translations,
    ar: {
      name: "Arabic fertilizer",
      description: null,
      usage_instructions: "RTL instructions",
      id: 9,
    },
    legacy: { name: "Preserve" },
  });
  const sent = h.calls[0].options.data.translations;
  assert.deepEqual(Object.keys(sent), ["en", "hi", "ar"]);
  assert.equal("id" in sent.ar, false);
  assert.equal(sent.ar.usage_instructions, "RTL instructions");
  assert.equal(
    (
      await serviceHarness().actions.saveFertilizerTranslations(
        42,
        fertilizer.translations,
      )
    ).success,
    false,
  );
});
test("multipart mixed-gallery ordering sends retained IDs and new tokens without re-uploading existing images", async () => {
  const h = serviceHarness([{ status: true, data: fertilizer }]);
  const uploads = new FormData();
  uploads.append(
    "images[k1]",
    new File(["image"], "fertilizer.webp", { type: "image/webp" }),
  );
  const result = await h.actions.saveFertilizerMedia(
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
  const h = serviceHarness(Array(2).fill({ status: true, data: fertilizer }));
  await h.actions.saveFertilizerMedia(
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
  await h.actions.saveFertilizerMedia(
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
    new File([], "fertilizer.jpg", { type: "image/jpeg" }),
    new File(["x"], "fertilizer.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    }),
  ]) {
    const h = serviceHarness();
    const data = new FormData();
    data.append("images[k1]", file);
    assert.equal(
      (await h.actions.saveFertilizerMedia(42, values, data)).success,
      false,
    );
    assert.equal(h.calls.length, 0);
  }
  const h = serviceHarness();
  const tooMany = new FormData();
  for (let i = 0; i < 9; i++)
    tooMany.append(
      `images[k${i}]`,
      new File(["x"], "fertilizer.jpg", { type: "image/jpeg" }),
    );
  assert.equal(
    (await h.actions.saveFertilizerMedia(42, values, tooMany)).success,
    false,
  );
  const ordinary = serviceHarness([{ status: true, data: fertilizer }], {
    is_super_user: false,
  });
  assert.equal(
    (
      await ordinary.actions.saveFertilizerMedia(
        42,
        { ...values, verification_status: "verified" },
        new FormData(),
      )
    ).success,
    false,
  );
  assert.equal(
    (await ordinary.actions.updateFertilizerStatus(42, true)).success,
    false,
  );
  assert.equal(
    (await ordinary.actions.updateFertilizerStatus(42, false)).success,
    true,
  );
});

test("mutations authenticate, preserve 422/409 errors, hide 5xx details and never invalidate failures", async () => {
  const anon = serviceHarness([], null);
  await anon.actions.saveFertilizerBasic(null, basic);
  await anon.actions.saveFertilizerNutrients(42, {
    nutrients: [],
    composition_notes: null,
  });
  await anon.actions.finalizeFertilizer(42);
  assert.equal(anon.calls.length, 0);
  const fields = {
    "nutrients.0.content_value": ["Too high"],
    "translations.hi.name": ["Required"],
  };
  const h = serviceHarness([
    new ApiError("Invalid", 422, fields),
    new ApiError("Referenced", 409),
    new ApiError("Private database", 503),
  ]);
  assert.deepEqual(
    clone(
      (
        await h.actions.saveFertilizerNutrients(42, {
          nutrients: [],
          composition_notes: null,
        })
      ).errors,
    ),
    fields,
  );
  assert.match((await h.actions.deleteFertilizer(42)).message, /Referenced/);
  assert.doesNotMatch(
    (await h.actions.finalizeFertilizer(42)).message,
    /Private/,
  );
  assert.equal(h.invalidations.length, 0);
  const flow = Object.assign(Error("REDIRECT"), { controlFlow: true });
  await assert.rejects(
    serviceHarness([flow]).actions.finalizeFertilizer(42),
    /REDIRECT/,
  );
});
test("basic fields use the primary language, approved enums and exact paired mass/volume packaging", async () => {
  const h = stepHarness("Step1BasicDetails.tsx");
  assert.equal(h.values().name, "Urea");
  assert.equal(h.values().reference_pack_quantity, "50.0000");
  assert.equal(h.rules.name.validate("   "), "validation.required");
  assert.equal(h.rules.slug.pattern.value.test("urea-46"), true);
  assert.equal(h.rules.slug.pattern.value.test("Urea_46"), false);
  for (const value of ["0.0001", "9999999999.9999"])
    assert.equal(h.rules.reference_pack_quantity.validate.decimal(value), true);
  for (const value of ["0", "-1", "1e2", "1.00001", "10000000000"])
    assert.notEqual(
      h.rules.reference_pack_quantity.validate.decimal(value),
      true,
    );
  assert.notEqual(
    h.rules.reference_pack_unit_code.validate.dimension("l"),
    true,
  );
  h.fill({ default_unit_code: "l" });
  assert.equal(h.rules.reference_pack_unit_code.validate.dimension("ml"), true);
  h.fill({ reference_pack_quantity: "", reference_pack_unit_code: "kg" });
  assert.notEqual(h.rules.reference_pack_quantity.validate.pair(""), true);
  h.fill({ reference_pack_quantity: "50", reference_pack_unit_code: "" });
  assert.notEqual(h.rules.reference_pack_unit_code.validate.required(""), true);
  await h.submit();
  assert.equal(h.calls[0][0].reference_pack_quantity, "50");
  assert.equal(h.calls[0][0].description, undefined);
  assert.equal(h.calls[0][0].verification_status, undefined);
});
test("duplicate slug and code errors remain inline without losing basic draft values", async () => {
  const h = stepHarness("Step1BasicDetails.tsx", fertilizer, async () => ({
    success: false,
    errors: { slug: ["Taken"], fertilizer_code: ["Taken"] },
  }));
  h.fill({ brand_name: "Keep me" });
  await h.submit();
  assert.deepEqual(
    h.fieldErrors.map((e) => e.name),
    ["slug", "fertilizer_code"],
  );
  assert.equal(h.values().brand_name, "Keep me");
});
test("nutrient rows preserve explicit zero and four decimals, reject percentages above 100 and duplicate pairs", () => {
  const h = stepHarness("Step2NutrientComposition.tsx");
  assert.equal(h.values().nutrients[1].content_value, "0.0000");
  const value = h.rules["nutrients.0.content_value"].validate;
  assert.equal(value.decimal("99999999.9999"), true);
  assert.equal(value.decimal("0.0000"), true);
  for (const input of ["-1", "1.00001", "100000000", "1e2"])
    assert.notEqual(value.decimal(input), true);
  assert.notEqual(value.percentage("100.0001"), true);
  h.values().nutrients[0].content_unit_code = "g_per_l";
  assert.equal(value.percentage("1000"), true);
  h.values().nutrients.push({ ...h.values().nutrients[0] });
  assert.notEqual(
    h.rules["nutrients.0.nutrient_code"].validate.unique("N"),
    true,
  );
  h.values().nutrients[2].content_unit_code = "percent_wv";
  assert.equal(h.rules["nutrients.0.nutrient_code"].validate.unique("N"), true);
  assert.notEqual(h.rules.nutrients.validate([]), true);
  const organic = stepHarness("Step2NutrientComposition.tsx", {
    ...fertilizer,
    fertilizer_type: "organic",
    nutrients: [],
  });
  assert.equal(organic.rules.nutrients.validate([]), true);
  assert.equal(organic.values().nutrients.length, 0);
});
test("nutrient add/remove uses one field array, confirms populated removals and maps indexed errors", async () => {
  const h = stepHarness(
    "Step2NutrientComposition.tsx",
    fertilizer,
    async () => ({
      success: false,
      errors: {
        "nutrients.0.content_value": ["Too high"],
        nutrients: ["Invalid composition"],
      },
    }),
  );
  const button = () =>
    findAll(
      h.render(),
      (e) =>
        e.type === "button" && e.props.children?.includes?.("composition.add"),
    )[0];
  button().props.onClick();
  assert.equal(h.values().nutrients.length, 3);
  findAll(
    h.render(),
    (e) =>
      e.type === "button" &&
      e.props["aria-label"]?.startsWith("composition.removeRow"),
  )[0].props.onClick();
  assert.equal(h.values().nutrients.length, 3);
  findAll(h.render(), (e) => e.type === "confirm")[0].props.onConfirm();
  assert.equal(h.values().nutrients.length, 2);
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(
    h.fieldErrors.map((e) => e.name),
    ["nutrients.0.content_value", "nutrients"],
  );
  assert.equal(h.values().composition_notes, "Label values");
});
test("shared translation step handles configured RTL languages, usage fields, legacy preservation and server errors", async () => {
  const file =
    "src/app/[locale]/(admin)/admin/(pages)/seeds/_components/Step2Translations.tsx";
  const record = {
    ...fertilizer,
    translations: {
      ...fertilizer.translations,
      ar: {
        name: "Arabic name",
        description: null,
        usage_instructions: "RTL usage",
      },
      old: {
        name: "Legacy",
        description: "Preserve",
        usage_instructions: null,
      },
    },
  };
  const h = stepHarness(file, record, async () => ({
    success: false,
    errors: { "translations.ar.usage_instructions": ["Fix usage"] },
  }));
  assert.equal(h.values().translations.ar.usage_instructions, "RTL usage");
  const arabic = findAll(
    h.render(),
    (e) => e.type === "input" && e.props.lang === "ar",
  )[0];
  assert.equal(arabic.props.dir, "rtl");
  const old = findAll(
    h.render(),
    (e) => e.type === "input" && e.props.lang === "old",
  )[0];
  assert.equal(old.props.readOnly, true);
  await h.submit();
  assert.equal(h.calls[0][0].ar.usage_instructions, "RTL usage");
  assert.equal(h.calls[0][0].ar.planting_instructions, undefined);
  assert.equal(h.calls[0][0].old, undefined);
  assert.equal(h.fieldErrors[0].name, "translations.ar.usage_instructions");
});
test("shared gallery supports optional verified source, new previews, mixed order and local confirmed removal", async () => {
  const file =
    "src/app/[locale]/(admin)/admin/(pages)/seeds/_components/Step3MediaSource.tsx";
  const h = stepHarness(file, {
    ...fertilizer,
    verification_status: "verified",
  });
  const source = findAll(
    h.render(),
    (e) => e.type === "controller" && e.props.name === "source_id",
  )[0];
  assert.equal(source.props.rules.validate(""), true);
  h.drop([new File(["png"], "new.png", { type: "image/png" })]);
  assert.equal(h.values().gallery.length, 3);
  const li = findAll(h.render(), (e) => e.type === "li")[2];
  li.props.onDragStart({ dataTransfer: { setData() {} } });
  findAll(h.render(), (e) => e.type === "li")[0].props.onDrop({
    preventDefault() {},
    stopPropagation() {},
  });
  assert.ok(h.values().gallery[0].token.startsWith("new:"));
  await h.submit();
  assert.ok(h.calls[0][0].image_order[0].startsWith("new:"));
  assert.deepEqual(clone(h.calls[0][0].retain_image_ids), [11, 12]);
  assert.equal([...h.calls[0][1].keys()].length, 1);
  const remove = findAll(
    h.render(),
    (e) =>
      e.type === "button" && e.props["aria-label"]?.startsWith("media.remove"),
  )[1];
  remove.props.onClick();
  assert.equal(h.values().gallery.length, 3);
  findAll(h.render(), (e) => e.type === "confirm")[0].props.onConfirm();
  assert.equal(h.values().gallery.length, 2);
});
test("both products use one stepper with four/five steps, completed checks and locked upcoming steps", () => {
  const Stepper = load("src/components/admin/common/ProductWizardSteps.tsx", {
    "@/icons": ui["@/icons"],
  }).default;
  for (const steps of [
    [1, 2, 3, 4],
    [1, 2, 3, 4, 5],
  ]) {
    const chosen = [];
    const tree = Stepper({
      steps,
      step: 2,
      completedStep: 1,
      maximumStep: 2,
      hasRecord: true,
      busy: false,
      label: "Setup",
      stepLabel: (n) => "Step " + n,
      onSelect: (n) => chosen.push(n),
    });
    const buttons = findAll(tree, (e) => e.type === "button");
    assert.equal(buttons.length, steps.length);
    assert.equal(buttons[0].props.disabled, false);
    assert.equal(buttons[1].props["aria-current"], "step");
    assert.equal(buttons[2].props.disabled, true);
    buttons[0].props.onClick();
    assert.deepEqual(chosen, [1]);
  }
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
    root + "FertilizerForm.tsx",
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
      "@/actions/admin/fertilizers": {
        saveFertilizerBasic: action("basic"),
        saveFertilizerNutrients: action("nutrients"),
        saveFertilizerTranslations: action("translations"),
        saveFertilizerMedia: action("media"),
        finalizeFertilizer: action("finalize"),
      },
      "./Step1BasicDetails": { __esModule: true, default: "basic" },
      "@/components/admin/common/ProductWizardSteps": {
        __esModule: true,
        default: "stepper",
      },
      "./Step2NutrientComposition": { __esModule: true, default: "nutrients" },
      "./Step3Translations": { __esModule: true, default: "translations" },
      "./Step4MediaSource": { __esModule: true, default: "media" },
      "./Step5ReviewSave": { __esModule: true, default: "review" },
      "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
        { __esModule: true, default: "confirm" },
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
        initialFertilizer: record,
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

test("five-step wizard saves each step before navigating, retains new ID on navigation failure and prevents duplicate creates", async () => {
  const h = wizardHarness(
    null,
    1,
    [
      { success: true, data: fertilizer },
      { success: false, message: "Retry" },
    ],
    true,
  );
  let form = findAll(h.render(), (e) => e.type === "basic")[0];
  const first = form.props.onSave(basic),
    duplicate = await form.props.onSave(basic);
  assert.equal(duplicate.success, false);
  await first;
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].args[0], null);
  assert.equal(h.routes[0].href, "/admin/fertilizers/42/step/2");
  form = findAll(h.render(), (e) => e.type === "basic")[0];
  await form.props.onSave(basic);
  assert.equal(h.calls[1].args[0], 42);
  for (const [step, type, operation] of [
    [2, "nutrients", "nutrients"],
    [3, "translations", "translations"],
    [4, "media", "media"],
  ]) {
    const flow = wizardHarness({ ...fertilizer, completed_step: 4 }, step, [
      { success: false, message: "Keep values" },
      { success: true, data: { ...fertilizer, completed_step: step } },
    ]);
    let node = findAll(flow.render(), (e) => e.type === type)[0];
    await node.props.onSave({}, new FormData());
    assert.equal(flow.routes.length, 0);
    node = findAll(flow.render(), (e) => e.type === type)[0];
    await node.props.onSave({}, new FormData());
    assert.equal(flow.calls[1].operation, operation);
    assert.equal(flow.calls[1].args[0], 42);
    assert.equal(
      flow.routes[0].href,
      "/admin/fertilizers/42/step/" + (step + 1),
    );
  }
});
test("wizard confirms unsaved cancellation and finalizes only the saved record", async () => {
  const h = wizardHarness(fertilizer, 3, []);
  findAll(h.render(), (e) => e.type === "translations")[0].props.onDirty(true);
  findAll(
    h.render(),
    (e) => e.type === "button" && e.props.children === "cancel",
  )[0].props.onClick();
  assert.equal(h.routes.length, 0);
  findAll(h.render(), (e) => e.type === "confirm")[0].props.onConfirm();
  assert.equal(h.routes[0].href, "/admin/fertilizers");
  assert.equal(h.calls.length, 0);
  const final = wizardHarness(
    { ...fertilizer, completed_step: 4, ready_to_finalize: true },
    5,
    [
      {
        success: true,
        data: { ...fertilizer, setup_status: "completed", completed_step: 5 },
      },
    ],
  );
  await findAll(final.render(), (e) => e.type === "review")[0].props.onSave();
  assert.deepEqual(final.calls, [{ operation: "finalize", args: [42] }]);
  assert.equal(final.routes[0].href, "/admin/fertilizers");
});
test("review uses saved counts and readiness, supports all four edit targets and points errors to affected steps", () => {
  const Review = load(root + "Step5ReviewSave.tsx", ui).default,
    edits = [],
    calls = [];
  const render = (extra = {}) =>
    Review({
      fertilizer: {
        ...fertilizer,
        completed_step: 4,
        ready_to_finalize: true,
        readiness_errors: {},
      },
      busy: false,
      canReview: true,
      viewOnly: false,
      errors: {},
      onEdit: (n) => edits.push(n),
      onSave: async () => {
        calls.push(42);
        return { success: true };
      },
      ...extra,
    });
  const tree = render();
  assert.ok(JSON.stringify(tree).includes("review.nutrientCount"));
  assert.ok(JSON.stringify(tree).includes("0.0000"));
  const cards = findAll(tree, (e) => e.type === "card");
  for (const card of cards)
    findAll(card.props.title, (e) => e.type === "button")[0].props.onClick();
  assert.deepEqual(edits, [1, 2, 3, 4]);
  tree.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls, [42]);
  render({
    fertilizer: { ...fertilizer, ready_to_finalize: false },
  }).props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1);
  const invalid = render({
    errors: {
      "nutrients.0.content_value": ["Invalid"],
      "translations.hi.name": ["Required"],
      source_id: ["Source"],
    },
  });
  const fixes = findAll(
    invalid,
    (e) =>
      e.type === "button" && e.props.children?.startsWith?.("review.fixStep"),
  );
  fixes.forEach((b) => b.props.onClick());
  assert.deepEqual(edits.slice(4), [2, 3, 4]);
});
test("editor loads one saved product and source choices only for media, and enforces saved progress", async () => {
  const calls = [];
  let record = { ...fertilizer, completed_step: 4 };
  const flow = Object.assign(Error("REDIRECT"), { controlFlow: true });
  const Editor = load(root + "FertilizerEditor.tsx", {
    "next-intl/server": {
      getTranslations: async () => (key) => key,
      getLocale: async () => "hi",
    },
    "next/navigation": {
      notFound() {
        throw Object.assign(Error("NOT_FOUND"), { controlFlow: true });
      },
    },
    "@/i18n/navigation": {
      redirect(value) {
        calls.push(["redirect", value]);
        throw flow;
      },
    },
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: true }) },
    "@/lib/apis/admin/fertilizers": {
      fertilizersAPI: {
        show: async (id) => {
          calls.push(["show", id]);
          return { status: true, data: record };
        },
        review: async (id) => {
          calls.push(["review", id]);
          return { status: true, data: record };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async () => {
        calls.push(["options"]);
        return {};
      },
      getTimelineSelections: async () => ({}),
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        if (error.controlFlow) throw error;
        return { message: "Failed" };
      },
    },
    "./FertilizerForm": { __esModule: true, default: "wizard" },
    "./FertilizerHeader": { __esModule: true, default: "header" },
  }).default;
  await Editor({ id: "42", step: "5" });
  assert.deepEqual(calls, [["review", 42]]);
  calls.length = 0;
  await Editor({ id: "42", step: "4" });
  assert.deepEqual(calls, [["show", 42], ["options"]]);
  calls.length = 0;
  record = { ...fertilizer, completed_step: 1 };
  await assert.rejects(Editor({ id: "42", step: "5" }), /REDIRECT/);
  assert.ok(calls.find((c) => c[0] === "redirect")[1].href.endsWith("/step/2"));
  await assert.rejects(Editor({ id: "bad" }), /NOT_FOUND/);
});
test("filters apply/reset all five values, preserve inactive zero and unrelated URL parameters", () => {
  const state = hooks(),
    routes = [];
  let values;
  const Filters = load(root + "FertilizersFilters.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      useForm: (options) => {
        values ??= options.defaultValues;
        return {
          register: (name) => ({ name }),
          handleSubmit: (fn) => () => fn(values),
          reset: (next) => {
            values = next;
          },
        };
      },
    },
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("page=9&extra=keep"),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (href) => routes.push(href) }),
    },
  }).default;
  const render = () => {
    state.reset();
    return Filters({
      initialFilters: {
        keyword: " urea ",
        fertilizer_type: "straight",
        form: "granular",
        verification_status: "pending",
        is_active: "0",
      },
    });
  };
  findAll(render(), (e) => e.type === "form")[0].props.onSubmit();
  const query = new URLSearchParams(routes[0].split("?")[1]);
  assert.equal(query.get("is_active"), "0");
  assert.equal(query.get("fertilizer_type"), "straight");
  assert.equal(query.get("form"), "granular");
  assert.equal(query.get("page"), null);
  assert.equal(query.get("keyword"), "urea");
  findAll(
    render(),
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  assert.equal(routes[1], "/admin/fertilizers?extra=keep");
});
test("listing has ten columns, backend names, primary thumbnails, nutrient units and draft state", () => {
  const List = load(root + "FertilizersList.tsx", {
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
    "./FertilizerRowActions": { __esModule: true, default: "actions" },
  }).default;
  const tree = List({
    result: {
      data: [
        fertilizer,
        {
          ...fertilizer,
          id: 43,
          grade: null,
          nutrients: [],
          primary_image: null,
          setup_status: "completed",
          is_active: true,
        },
      ],
      pagination,
    },
    filtered: false,
    canReview: false,
  });
  const rows = findAll(
    findAll(tree, (e) => e.type === "tbody")[0],
    (e) => e.type === "tr",
  );
  assert.equal(rows[0].props.children.length, 10);
  assert.ok(JSON.stringify(tree).includes("यूरिया"));
  assert.ok(JSON.stringify(tree).includes("percent_ww"));
  assert.ok(JSON.stringify(tree).includes("setup.draft"));
  assert.ok(JSON.stringify(tree).includes("active"));
  assert.equal(
    findAll(tree, (e) => e.type === "image")[0].props.src,
    "/image-11.jpg",
  );
  assert.ok(
    JSON.stringify(
      List({
        result: { data: [], pagination },
        filtered: true,
        canReview: false,
      }),
    ).includes("emptyFiltered"),
  );
});
test("English/Hindi fertilizer messages compile, match interpolations and cover all approved options", () => {
  const en = JSON.parse(
      fs.readFileSync("src/messages/en.json", "utf8"),
    ).fertilizers,
    hi = JSON.parse(
      fs.readFileSync("src/messages/hi.json", "utf8"),
    ).fertilizers;
  const { IntlMessageFormat } = require("intl-messageformat");
  function flatten(object, prefix = "") {
    return Object.entries(object).flatMap(([key, value]) =>
      typeof value === "object"
        ? flatten(value, prefix + key + ".")
        : [[prefix + key, value]],
    );
  }
  const translated = new Map(flatten(hi));
  for (const [key, value] of flatten(en)) {
    assert.equal(typeof translated.get(key), "string", key);
    assert.deepEqual(
      translated
        .get(key)
        .match(/\{\w+\}/g)
        ?.sort(),
      value.match(/\{\w+\}/g)?.sort(),
      key,
    );
    new IntlMessageFormat(value, "en");
    new IntlMessageFormat(translated.get(key), "hi");
    assert.doesNotMatch(translated.get(key), /\?\?|\uFFFD/);
  }
  for (const key of domain.fertilizerTypes)
    assert.ok(en.types[key] && hi.types[key]);
  for (const key of domain.nutrientCodes)
    assert.ok(en.nutrients[key] && hi.nutrients[key]);
  assert.match(hi.title, /[\u0900-\u097f]/);
});
