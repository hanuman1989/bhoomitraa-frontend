const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsxRuntime = require("react/jsx-runtime");

const clone = (value) => JSON.parse(JSON.stringify(value));
const base = "src/app/[locale]/(admin)/admin/(pages)/";
const defaultLanguages = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "hi", name: "Hindi", dir: "ltr" },
];

// Preserve the actual form component's hook state between renders to reproduce
// revisiting an Activity page. Mock only UI children, routing, and server actions.
function formHarness(component, props, actions, languages = defaultLanguages) {
  const hooks = [];
  const placeholders = new Map();
  const navigations = [];
  const fieldErrors = [];
  const errors = {};
  const rules = new Map();
  let cursor = 0;
  let defaults;
  let values;
  let isSubmitting = false;
  let submission;
  let transition;
  const noop = () => null;
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
    useId: () => "test-form",
    useEffect: noop,
  };
  const compiledModule = { exports: {} };
  const filename = path.join(
    __dirname,
    "..",
    component.startsWith("src/") ? component : path.join(base, component),
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
      File,
      FormData,
      require(name) {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "react-hook-form")
          return {
            Controller: noop,
            useWatch: ({ name }) => values[name],
            useForm(options) {
              if (!defaults) {
                defaults = clone(options.defaultValues);
                values = clone(defaults);
              }
              return {
                register: (name, validation) => {
                  rules.set(name, validation);
                  return {};
                },
                control: {},
                getValues: (name) => (name ? name.split(".").reduce((value, key) => value?.[key], values) : values),
                formState: {
                  errors,
                  get isSubmitting() {
                    return isSubmitting;
                  },
                  get isDirty() {
                    return JSON.stringify(values) !== JSON.stringify(defaults);
                  },
                },
                setError: (field, error) => {
                  fieldErrors.push({ field, ...error });
                  errors[field] = error;
                },
                setValue: (field, value, options) => {
                  const parts = field.split(".");
                  const key = parts.pop();
                  const parent = parts.reduce((value, part) => value[part] ??= {}, values);
                  parent[key] = value;
                  if (options?.shouldValidate && rules.get(field)?.validate) {
                    const result = rules.get(field).validate(value);
                    if (result === true) delete errors[field];
                    else errors[field] = { message: result };
                  }
                },
                clearErrors: noop,
                unregister: (name) => {
                  const parts = name.split(".");
                  const key = parts.pop();
                  const parent = parts.reduce((value, part) => value?.[part], values);
                  if (parent) delete parent[key];
                },
                reset: (next) => {
                  if (next) defaults = clone(next);
                  values = clone(defaults);
                  for (const field of Object.keys(errors)) delete errors[field];
                },
                handleSubmit: (submit) => () => {
                  isSubmitting = true;
                  submission = Promise.resolve(submit(clone(values))).finally(
                    () => {
                      isSubmitting = false;
                    },
                  );
                  return submission;
                },
              };
            },
          };
        if (name === "next-intl")
          return { useTranslations: () => (key) => key };
        if (name === "@/i18n/languages")
          return {
            languages,
            getLanguage: (id) =>
              languages.find((language) => language.id === id),
          };
        if (name === "react-hot-toast") return { success: noop, error: noop };
        if (name === "@/i18n/navigation")
          return {
            Link: noop,
            useRouter: () => ({ push: (route) => navigations.push(route) }),
          };
        if (name.startsWith("@/actions/admin/")) return actions;
        if (name === "@/hooks/useModal") return { useModal: () => {
          const [isOpen, setOpen] = react.useState(false);
          return { isOpen, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
        } };
        if (name === "@/types/admin/cropStage") return { requiredStageLocales: ["en", "hi"] };
        if (name === "@/types/admin/knowledgeSource")
          return { sourceTypes: ["manual"], identifierTypes: ["doi"] };
        if (name === "@/icons" || name === "@headlessui/react")
          return new Proxy({}, { get: () => noop });
        if (!placeholders.has(name))
          placeholders.set(
            name,
            Object.assign(() => null, { displayName: name }),
          );
        return { __esModule: true, default: placeholders.get(name) };
      },
    },
    { filename },
  );
  function render() {
    cursor = 0;
    return compiledModule.exports.default(props);
  }
  function find(element, predicate) {
    if (element && predicate(element)) return element;
    for (const child of [element?.props?.children ?? []].flat(Infinity)) {
      const match = find(child, predicate);
      if (match) return match;
    }
  }
  async function settle() {
    await submission;
    await transition;
  }
  return {
    navigations,
    fieldErrors,
    render,
    values: () => clone(values),
    fill(next) {
      values = clone(next);
    },
    find: (predicate) => find(render(), predicate),
    async submit() {
      find(render(), (element) => element.type === "form").props.onSubmit({
        preventDefault() {},
      });
      await settle();
    },
    async act(callback) {
      callback();
      await settle();
    },
  };
}

const regionValues = {
  region_type: "country",
  parent_id: "",
  code: "IN",
  latitude: "20",
  longitude: "77",
  is_active: "1",
  translations: { en: { name: "India" }, hi: { name: "Hindi name" } },
};
const sourceValues = {
  title: "Wheat manual",
  publisher: "ICAR",
  source_type: "manual",
  language: "en",
  source_url: "https://example.com/source",
  published_at: "",
  publication_year: "2024",
  identifier_type: "",
  reference_identifier: "",
  description: "Description",
  license_notes: "",
};
const sourceRecord = {
  id: 42,
  ...sourceValues,
  attachments: [],
  verification_status: "pending",
  is_active: false,
};
const attachment = (form) =>
  form.find(
    (element) => element.type?.displayName === "./KnowledgeSourceAttachments",
  );
const enabled = (form) =>
  assert.equal(
    form.find((element) => element.type === "form").props["aria-busy"],
    false,
  );

test("Regions create returns empty and enabled after saving, and the next save creates another record", async () => {
  const ids = [];
  const form = formHarness(
    "regions/_components/RegionForm.tsx",
    {},
    {
      saveRegion: async (id) => {
        ids.push(id);
        return { success: true, message: "Saved" };
      },
    },
  );
  form.render();
  form.fill(regionValues);
  await form.submit();
  assert.equal(form.values().translations.en.name, "");
  assert.equal(form.values().region_type, "");
  enabled(form);
  form.fill({ ...regionValues, code: "NP" });
  await form.submit();
  assert.deepEqual(ids, [null, null]);
});

const cropValues = {
  image: [],
  category_id: "3",
  slug: "wheat",
  scientific_name: "Triticum aestivum",
  crop_code: "WHEAT001",
  is_active: false,
  ai_diagnosis_enabled: false,
  translations: {
    en: { name: "Wheat", description: "Grain crop" },
    hi: { name: "Hindi name", description: "Description" },
  },
};
const cropRecord = {
  id: 42,
  ...cropValues,
  category_id: 3,
  name: "Wheat",
  category_name: "Cereals",
  image_url: null,
};
const cropProps = {
  crop: null,
  categories: [{ id: 3, name: "Cereals", is_active: true }],
  canManageAI: true,
};
const cropImage = (form) =>
  form.find(
    (element) =>
      element.type?.displayName === "@/components/admin/common/ImageUpload",
  );

test("the shared uploader preserves dropped files on blur, clears native selections and blocks disabled changes", () => {
  const changes = [];
  const blurs = [];
  const props = {
    id: "example-image",
    label: "Example image",
    existingImageUrl: "https://example.com/image.jpg",
    selectedFile: null,
    inputProps: {
      name: "image",
      ref() {},
      onBlur: (event) => blurs.push(event.target.value),
    },
    onChange: (files) => {
      changes.push(files);
      return true;
    },
  };
  const upload = formHarness(
    "src/components/admin/common/ImageUpload.tsx",
    props,
    {},
  );
  const image = upload.find(
    (element) =>
      element.type?.displayName === "@/components/common/ImagePreview",
  );
  assert.equal(image.props.src, props.existingImageUrl);
  const input = upload.find((element) => element.type === "input");
  const nativeInput = { value: "selected.jpg" };
  input.props.ref(nativeInput);
  const file = new File(["image"], "image.jpg", { type: "image/jpeg" });
  upload
    .find((element) => !!element.props?.onDrop)
    .props.onDrop({ preventDefault() {}, dataTransfer: { files: [file] } });
  assert.equal(changes[0][0], file);
  input.props.onBlur();
  assert.equal(blurs[0][0], file);
  assert.equal(nativeInput.value, "");
  props.selectedFile = file;
  upload.find((element) => element.type === "button").props.onClick();
  assert.deepEqual(Array.from(changes[1]), []);
  props.disabled = true;
  const disabledInput = upload.find((element) => element.type === "input");
  assert.equal(disabledInput.props.disabled, true);
  disabledInput.props.onChange({ target: { files: [file] } });
  upload
    .find((element) => !!element.props?.onDrop)
    .props.onDrop({ preventDefault() {}, dataTransfer: { files: [file] } });
  assert.equal(changes.length, 2);
});

test("invalid crop image selection leaves the prior selection and exposes a correctable error", () => {
  const form = formHarness("crops/_components/CropForm.tsx", cropProps, {});
  form.render();
  const valid = new File(["image"], "wheat.png", { type: "image/png" });
  assert.equal(cropImage(form).props.onChange([valid]), true);
  assert.equal(
    cropImage(form).props.onChange([
      new File(["svg"], "bad.svg", { type: "image/svg+xml" }),
    ]),
    false,
  );
  assert.equal(cropImage(form).props.selectedFile, valid);
  assert.equal(cropImage(form).props.error, "feedback.invalidImage");
  cropImage(form).props.onChange([]);
  assert.equal(cropImage(form).props.selectedFile, null);
  assert.equal(cropImage(form).props.error, undefined);
});

const extendedLanguages = [
  ...defaultLanguages,
  { id: "ar", name: "Arabic", dir: "rtl" },
];

for (const feature of ["category", "region"]) {
  const directory = feature === "category" ? "crop-categories" : "regions";
  const component = feature === "category" ? "CropCategoryForm" : "RegionForm";
  const values =
    feature === "category"
      ? {
          slug: "cereals",
          is_active: false,
          translations: {
            en: { name: "Cereals", description: "" },
            hi: { name: "Hindi name", description: "Description" },
            ar: { name: "Arabic name", description: "" },
          },
        }
      : {
          ...regionValues,
          is_active: "0",
          translations: {
            ...regionValues.translations,
            ar: { name: "Arabic name" },
          },
        };

  test(`${feature} fields include configured languages, RTL input, required names and backend limits`, () => {
    const registered = [];
    const fieldComponent =
      feature === "category"
        ? "CropCategoryTranslationFields"
        : "RegionNameFields";
    const fields = formHarness(
      `${directory}/_components/${fieldComponent}.tsx`,
      {
        form: {
          register: (name, rules) => {
            registered.push({ name, rules });
            return { name };
          },
          formState: {
            errors: {
              translations: { ar: { name: { message: "Invalid name" } } },
            },
          },
        },
        children: null,
      },
      {},
      extendedLanguages,
    );
    const id = feature === "category" ? "category-ar-name" : "region-name-ar";
    const input = fields.find((element) => element.props?.id === id);
    assert.equal(input.props.name, "translations.ar.name");
    assert.equal(input.props.dir, "rtl");
    assert.equal(input.props.lang, "ar");
    assert.equal(input.props["aria-describedby"], `${id}-error`);
    assert.equal(
      fields.find((element) => element.props?.id === `${id}-error`).props
        .children,
      "Invalid name",
    );
    const name = registered.find(
      (field) => field.name === "translations.ar.name",
    );
    assert.equal(name.rules.validate("  "), "nameRequired");
    assert.equal(
      name.rules.maxLength.value,
      feature === "category" ? 255 : 150,
    );
    if (feature === "category")
      assert.equal(
        registered.find((field) => field.name === "translations.ar.description")
          .rules.maxLength.value,
        65535,
      );
  });

  test(`${feature} creates submit all configured translations and reset every language after saving`, async () => {
    const saves = [];
    const action = async (id, payload, active) => {
      saves.push({ id, payload, active });
      return { success: true, data: { id: 42 } };
    };
    const form = formHarness(
      `${directory}/_components/${component}.tsx`,
      {},
      { saveCropCategory: action, saveRegion: action },
      extendedLanguages,
    );
    form.render();
    assert.equal(form.values().translations.ar.name, "");
    form.fill(values);
    await form.submit();
    assert.equal(saves[0].id, null);
    assert.equal(saves[0].payload.translations.ar.name, "Arabic name");
    if (feature === "category") {
      assert.equal(saves[0].payload.translations.ar.description, null);
      assert.equal(saves[0].active, false);
    } else {
      assert.equal(saves[0].payload.parent_id, null);
      assert.equal(saves[0].payload.is_active, false);
    }
    assert.equal(form.values().translations.ar.name, "");
    enabled(form);
    form.fill(values);
    await form.submit();
    assert.deepEqual(
      saves.map((save) => save.id),
      [null, null],
    );
  });

  test(`${feature} edits load translations and preserve drafts with dynamic validation errors`, async () => {
    const current = {
      ...values,
      id: 42,
      is_active: false,
      translations: { ...values.translations, fr: { name: "Legacy" } },
    };
    const props =
      feature === "category" ? { category: current } : { region: current };
    const action = async (id, payload) => {
      assert.equal(id, 42);
      assert.equal(payload.translations.ar.name, "Arabic name");
      assert.equal("fr" in payload.translations, false);
      return {
        success: false,
        errors: {
          "translations.ar.name": ["Invalid name"],
          ...(feature === "category" && {
            "translations.ar.description": ["Too long"],
          }),
        },
      };
    };
    const form = formHarness(
      `${directory}/_components/${component}.tsx`,
      props,
      { saveCropCategory: action, saveRegion: action },
      extendedLanguages,
    );
    form.render();
    assert.equal(form.values().translations.ar.name, "Arabic name");
    await form.submit();
    assert.equal(form.fieldErrors[0].field, "translations.ar.name");
    assert.equal(form.fieldErrors[0].message, "Invalid name");
    if (feature === "category")
      assert.equal(form.fieldErrors[1].field, "translations.ar.description");
    assert.equal(form.values().translations.ar.name, "Arabic name");
    assert.equal(form.navigations.length, 0);
    enabled(form);
  });
}

test("Crop translations render additional languages with required names, direction and associated errors", () => {
  const registrations = [];
  const fields = formHarness(
    "crops/_components/CropTranslationFields.tsx",
    {
      form: {
        register: (name, rules) => {
          registrations.push({ name, rules });
          return { name };
        },
        formState: {
          errors: {
            translations: { ar: { name: { message: "Invalid name" } } },
          },
        },
      },
    },
    {},
    extendedLanguages,
  );
  const name = fields.find((element) => element.props?.id === "crop-ar-name");
  assert.equal(name.props.name, "translations.ar.name");
  assert.equal(name.props.dir, "rtl");
  assert.equal(name.props.lang, "ar");
  assert.equal(name.props["aria-invalid"], true);
  assert.equal(name.props["aria-describedby"], "crop-ar-name-error");
  assert.equal(
    fields.find((element) => element.props?.id === "crop-ar-name-error").props
      .children,
    "Invalid name",
  );
  assert.equal(
    registrations
      .find((field) => field.name === "translations.ar.name")
      .rules.validate("  "),
    "validation.required",
  );
  const description = fields.find(
    (element) => element.props?.id === "crop-ar-description",
  );
  assert.equal(description.props.name, "translations.ar.description");
  assert.equal(description.props.dir, "rtl");
});

test("Crop creates initialize, submit and reset every configured language", async () => {
  let submitted;
  const form = formHarness(
    "crops/_components/CropForm.tsx",
    cropProps,
    {
      saveCrop: async (id, payload) => {
        submitted = payload;
        return { success: true, data: cropRecord };
      },
    },
    extendedLanguages,
  );
  form.render();
  assert.deepEqual(form.values().translations.ar, {
    name: "",
    description: "",
  });
  form.fill({
    ...cropValues,
    translations: {
      ...cropValues.translations,
      ar: { name: " Arabic crop name ", description: "  " },
    },
  });
  await form.submit();
  assert.deepEqual(clone(submitted.translations.ar), {
    name: "Arabic crop name",
    description: null,
  });
  assert.deepEqual(form.values().translations.ar, {
    name: "",
    description: "",
  });
  enabled(form);
});

test("Crop edits load additional translations and map backend validation to their fields", async () => {
  const current = {
    ...cropRecord,
    translations: {
      ...cropRecord.translations,
      ar: { name: "Arabic crop name", description: "Description" },
    },
  };
  const form = formHarness(
    "crops/_components/CropForm.tsx",
    { ...cropProps, crop: current },
    {
      saveCrop: async () => ({
        success: false,
        message: "Validation failed",
        errors: {
          "translations.ar.name": ["Invalid name"],
          "translations.ar.description": ["Too long"],
        },
      }),
    },
    extendedLanguages,
  );
  form.render();
  assert.equal(form.values().translations.ar.name, "Arabic crop name");
  await form.submit();
  assert.deepEqual(form.fieldErrors, [
    { field: "translations.ar.name", type: "server", message: "Invalid name" },
    {
      field: "translations.ar.description",
      type: "server",
      message: "Too long",
    },
  ]);
  assert.equal(form.navigations.length, 0);
  assert.equal(form.values().translations.ar.description, "Description");
  enabled(form);
});

test("Crop Manager resets completed creates, flags, selected image and ID before another visit", async () => {
  const ids = [];
  const form = formHarness("crops/_components/CropForm.tsx", cropProps, {
    saveCrop: async (id) => {
      ids.push(id);
      return { success: true, message: "Saved", data: cropRecord };
    },
  });
  form.render();
  form.fill(cropValues);
  await form.submit();
  assert.equal(form.values().slug, "");
  assert.equal(form.values().is_active, false);
  assert.equal(form.values().ai_diagnosis_enabled, false);
  assert.equal(cropImage(form).props.existingImageUrl, undefined);
  assert.equal(cropImage(form).props.selectedFile, null);
  enabled(form);
  form.fill({ ...cropValues, slug: "rice" });
  await form.submit();
  assert.deepEqual(ids, [null, null]);
});

test("a failed combined crop save retains metadata and image, then retries the full create", async () => {
  const ids = [];
  const saves = [];
  let attempt = 0;
  const form = formHarness("crops/_components/CropForm.tsx", cropProps, {
    saveCrop: async (id, payload, data) => {
      ids.push(id);
      saves.push({ payload, name: data.get("image").name });
      attempt++;
      return attempt === 1
        ? {
            success: false,
            message: "Save failed",
            errors: { image: ["Invalid image"] },
          }
        : {
            success: true,
            message: "Saved",
            data: { ...cropRecord, image_url: "https://example.com/crop.jpg" },
          };
    },
  });
  form.render();
  form.fill(cropValues);
  cropImage(form).props.onChange([
    new File(["image"], "wheat.jpg", { type: "image/jpeg" }),
  ]);
  await form.submit();
  assert.equal(form.navigations.length, 0);
  assert.equal(cropImage(form).props.selectedFile.name, "wheat.jpg");
  assert.ok(cropImage(form).props.error);
  assert.equal(form.values().slug, "wheat");
  enabled(form);
  form.fill({ ...form.values(), scientific_name: "Updated name" });
  await form.submit();
  assert.deepEqual(ids, [null, null]);
  assert.deepEqual(
    saves.map((save) => save.name),
    ["wheat.jpg", "wheat.jpg"],
  );
  assert.equal(saves[1].payload.scientific_name, "Updated name");
  assert.equal(form.navigations[0], "/admin/crops");
  assert.equal(form.values().slug, "");
  assert.equal(cropImage(form).props.selectedFile, null);
  enabled(form);
});

test("discarding a replacement restores the existing crop image without a request", () => {
  const current = {
    ...cropRecord,
    image_url: "https://example.com/existing.jpg",
  };
  const form = formHarness(
    "crops/_components/CropForm.tsx",
    { ...cropProps, crop: current },
    {},
  );
  form.render();
  cropImage(form).props.onChange([
    new File(["image"], "wheat.jpg", { type: "image/jpeg" }),
  ]);
  assert.equal(cropImage(form).props.selectedFile.name, "wheat.jpg");
  cropImage(form).props.onChange([]);
  assert.equal(form.navigations.length, 0);
  assert.equal(cropImage(form).props.selectedFile, null);
  assert.equal(cropImage(form).props.existingImageUrl, current.image_url);
  assert.deepEqual(form.values().image, []);
});

function stageImageRemoval(form) {
  cropImage(form).props.onRemoveExisting();
  const dialog = form.find(
    (element) => element.type?.displayName === "./CropConfirmDialog",
  );
  dialog.props.onConfirm();
  dialog.props.onClose();
}

test("discarding a stored image waits for form submission and failed saves preserve the removal draft", async () => {
  const saves = [];
  const current = {
    ...cropRecord,
    image_url: "https://example.com/existing.jpg",
  };
  const form = formHarness(
    "crops/_components/CropForm.tsx",
    { ...cropProps, crop: current },
    {
      saveCrop: async (id, payload, data) => {
        saves.push({ id, payload, data });
        return saves.length === 1
          ? { success: false, message: "Validation failed" }
          : { success: true, data: { ...current, image_url: null } };
      },
    },
  );
  form.render();
  stageImageRemoval(form);
  assert.equal(saves.length, 0);
  assert.equal(cropImage(form).props.removalPending, true);
  form.fill({ ...form.values(), scientific_name: "Updated name" });
  await form.submit();
  assert.equal(saves.length, 1);
  assert.equal(saves[0].id, 42);
  assert.equal(saves[0].payload.image, null);
  assert.equal(saves[0].payload.scientific_name, "Updated name");
  assert.equal(saves[0].data.has("image"), false);
  assert.equal(cropImage(form).props.removalPending, true);
  assert.equal(cropImage(form).props.existingImageUrl, current.image_url);
  enabled(form);
  await form.submit();
  assert.equal(saves.length, 2);
  assert.equal(saves[1].payload.image, null);
  assert.equal(cropImage(form).props.removalPending, false);
  assert.equal(cropImage(form).props.existingImageUrl, null);
});

test("undoing a staged image removal preserves the stored image on save", async () => {
  const saves = [];
  const current = {
    ...cropRecord,
    image_url: "https://example.com/existing.jpg",
  };
  const form = formHarness(
    "crops/_components/CropForm.tsx",
    { ...cropProps, crop: current },
    {
      saveCrop: async (id, payload) => {
        saves.push(payload);
        return { success: true, data: current };
      },
    },
  );
  form.render();
  stageImageRemoval(form);
  cropImage(form).props.onUndoRemove();
  assert.equal(cropImage(form).props.removalPending, false);
  await form.submit();
  assert.equal("image" in saves[0], false);
  assert.equal(cropImage(form).props.existingImageUrl, current.image_url);
});

test("replacing an image supersedes a staged removal and cancel sends no request", () => {
  const current = {
    ...cropRecord,
    image_url: "https://example.com/existing.jpg",
  };
  const form = formHarness(
    "crops/_components/CropForm.tsx",
    { ...cropProps, crop: current },
    {},
  );
  form.render();
  stageImageRemoval(form);
  cropImage(form).props.onChange([
    new File(["image"], "new.png", { type: "image/png" }),
  ]);
  assert.equal(cropImage(form).props.removalPending, false);
  assert.equal(cropImage(form).props.selectedFile.name, "new.png");
  form
    .find(
      (element) =>
        element.type === "button" && element.props.children === "form.cancel",
    )
    .props.onClick();
  assert.deepEqual(form.navigations, ["/admin/crops"]);
});

test("image removal confirmation only stages the change without calling a mutation", () => {
  let staged = 0;
  let closed = 0;
  const dialog = formHarness(
    "crops/_components/CropConfirmDialog.tsx",
    {
      crop: cropRecord,
      operation: "removeImage",
      onConfirm: () => staged++,
      onClose: () => closed++,
    },
    {},
  );
  dialog
    .find(
      (element) =>
        element.type === "button" &&
        element.props.children === "actions.removeImage",
    )
    .props.onClick();
  assert.equal(staged, 1);
  assert.equal(closed, 1);
});

test("the shared uploader hides images pending removal and offers Undo", () => {
  let undos = 0;
  const upload = formHarness(
    "src/components/admin/common/ImageUpload.tsx",
    {
      id: "pending-image",
      label: "Image",
      existingImageUrl: "https://example.com/existing.jpg",
      selectedFile: null,
      removalPending: true,
      onUndoRemove: () => undos++,
      onChange: () => true,
      inputProps: { ref() {} },
    },
    {},
  );
  assert.equal(
    upload.find(
      (element) =>
        element.type?.displayName === "@/components/common/ImagePreview",
    ),
    undefined,
  );
  assert.equal(
    upload.find((element) => element.props?.role === "status").props.children,
    "removalPending",
  );
  upload
    .find(
      (element) =>
        element.type === "button" && element.props.children === "undoRemoval",
    )
    .props.onClick();
  assert.equal(undos, 1);
});

test("ordinary-admin crop edits omit AI settings and preserve existing images without uploading", async () => {
  const payloads = [];
  const current = {
    ...cropRecord,
    image_url: "https://example.com/existing.jpg",
    ai_diagnosis_enabled: true,
  };
  const form = formHarness(
    "crops/_components/CropForm.tsx",
    { ...cropProps, crop: current, canManageAI: false },
    {
      saveCrop: async (id, payload, data) => {
        payloads.push({ id, payload, data });
        return { success: true, message: "Saved", data: current };
      },
    },
  );
  form.render();
  await form.submit();
  assert.equal(payloads[0].id, 42);
  assert.equal("ai_diagnosis_enabled" in payloads[0].payload, false);
  assert.equal(payloads[0].data.has("image"), false);
  assert.equal(cropImage(form).props.existingImageUrl, current.image_url);
  assert.equal(form.values().slug, "wheat");
  enabled(form);
});

test("Regions edit retains its record and values, while failures keep the draft for retry", async () => {
  const ids = [];
  let success = false;
  const form = formHarness(
    "regions/_components/RegionForm.tsx",
    { region: { id: 7, ...regionValues, is_active: true } },
    {
      saveRegion: async (id) => {
        ids.push(id);
        return { success, message: "Result" };
      },
    },
  );
  form.render();
  form.fill(regionValues);
  await form.submit();
  assert.deepEqual(form.values(), regionValues);
  enabled(form);
  success = true;
  await form.submit();
  enabled(form);
  assert.equal(form.values().code, "IN");
  assert.deepEqual(ids, [7, 7]);
});

test("Knowledge Sources clears the completed source ID, metadata, and attachment UI on return", async () => {
  const ids = [];
  const form = formHarness(
    "knowledge-sources/_components/KnowledgeSourceForm.tsx",
    { source: null, canReview: true, maxYear: 2027 },
    {
      saveKnowledgeSource: async (id) => {
        ids.push(id);
        return { success: true, message: "Saved", data: sourceRecord };
      },
    },
  );
  form.render();
  const pickerKey = attachment(form).key;
  form.fill(sourceValues);
  await form.submit();
  assert.equal(form.values().title, "");
  enabled(form);
  assert.equal(attachment(form).props.sourceId, undefined);
  assert.notEqual(attachment(form).key, pickerKey);
  assert.equal(attachment(form).props.files.length, 0);
  assert.equal(attachment(form).props.attachments.length, 0);
  form.fill({ ...sourceValues, title: "Rice manual" });
  await form.submit();
  assert.deepEqual(ids, [null, null]);
});

test("Knowledge Sources retains failed uploads and ID, then resets only after retry completes", async () => {
  let saves = 0;
  let attempts = 0;
  const uploads = [];
  const form = formHarness(
    "knowledge-sources/_components/KnowledgeSourceForm.tsx",
    { source: null, canReview: true, maxYear: 2027 },
    {
      saveKnowledgeSource: async () => {
        saves++;
        return { success: true, message: "Saved", data: sourceRecord };
      },
      uploadKnowledgeSourceAttachment: async (id, data) => {
        uploads.push({ id, name: data.get("attachments[]").name });
        attempts++;
        return attempts === 2
          ? { success: false, message: "Upload failed" }
          : {
              success: true,
              message: "Uploaded",
              data: [
                { id: attempts, file_name: data.get("attachments[]").name },
              ],
            };
      },
    },
  );
  form.render();
  form.fill(sourceValues);
  attachment(form).props.onFilesChange([
    new File(["%PDF"], "first.pdf"),
    new File(["%PDF"], "second.pdf"),
  ]);
  await form.submit();
  assert.equal(form.navigations.length, 0);
  assert.equal(attachment(form).props.sourceId, 42);
  assert.equal(attachment(form).props.files.length, 1);
  assert.equal(attachment(form).props.files[0].name, "second.pdf");
  assert.equal(attachment(form).props.attachments.length, 1);
  assert.equal(form.values().title, sourceValues.title);
  enabled(form);
  await form.act(attachment(form).props.onRetry);
  assert.equal(saves, 1);
  assert.deepEqual(uploads, [
    { id: 42, name: "first.pdf" },
    { id: 42, name: "second.pdf" },
    { id: 42, name: "second.pdf" },
  ]);
  assert.equal(form.values().title, "");
  assert.equal(attachment(form).props.sourceId, undefined);
  assert.equal(attachment(form).props.uploadError, "");
  enabled(form);
});

test("Knowledge Sources metadata failures preserve entered values and edit saves retain their ID", async () => {
  const ids = [];
  let success = false;
  const form = formHarness(
    "knowledge-sources/_components/KnowledgeSourceForm.tsx",
    { source: sourceRecord, canReview: true, maxYear: 2027 },
    {
      saveKnowledgeSource: async (id) => {
        ids.push(id);
        return {
          success,
          message: "Result",
          ...(success && { data: sourceRecord }),
        };
      },
    },
  );
  form.render();
  form.fill(sourceValues);
  await form.submit();
  assert.deepEqual(form.values(), sourceValues);
  enabled(form);
  success = true;
  await form.submit();
  enabled(form);
  assert.equal(form.values().title, sourceValues.title);
  assert.deepEqual(ids, [42, 42]);
});

test("Admin Users and password forms close on success and release their submission state", async () => {
  let closed = 0;
  const user = {
    id: 7,
    first_name: "Test",
    last_name: "Admin",
    email: "test@example.com",
    status: 1,
  };
  const admin = formHarness(
    "admin-users/_components/AdminUserForm.jsx",
    { user: null, onClose: () => closed++ },
    { saveAdminUser: async () => ({ success: true, message: "Saved" }) },
  );
  admin.render();
  await admin.submit();
  assert.equal(closed, 1);
  assert.equal(admin.render().props["aria-busy"], false);
  const password = formHarness(
    "admin-users/_components/UpdatePassword.tsx",
    { user, onClose: () => closed++ },
    {
      changeAdminUserPassword: async () => ({
        success: true,
        message: "Saved",
      }),
    },
  );
  password.render();
  password.fill({
    password: "test-only-value",
    password_confirmation: "test-only-value",
  });
  await password.submit();
  assert.equal(closed, 2);
  assert.equal(password.values().password, "");
  assert.equal(password.render().props["aria-busy"], false);
});

const seasonValues = {
  slug: "rabi", is_active: false,
  translations: {
    en: { name: "Rabi", description: "Season category" },
    hi: { name: "रबी", description: "" },
  },
};
const seasonRecord = { id: 42, ...seasonValues };
const seasonPanels = (form) => form.find(
  (element) => element.type?.displayName === "./SeasonTranslations",
);

test("Seasons default to inactive and render every configured language without language selection controls", () => {
  const languages = [...defaultLanguages, { id: "ar", name: "Arabic", dir: "rtl" }];
  const form = formHarness("seasons/_components/SeasonForm.tsx", { season: null }, {}, languages);
  form.render();
  assert.equal(form.values().is_active, false);
  assert.deepEqual(Object.keys(form.values().translations), ["en", "hi", "ar"]);
  assert.deepEqual([...seasonPanels(form).props.locales], ["en", "hi", "ar"]);
  assert.deepEqual(form.values().translations.ar, { name: "", description: "" });
  assert.equal("onAdd" in seasonPanels(form).props, false);
  assert.equal("onRemove" in seasonPanels(form).props, false);
});

test("Seasons edit loads and preserves all saved languages and submits only configured translations", async () => {
  const languages = [...defaultLanguages, { id: "ar", name: "Arabic", dir: "rtl" }];
  const record = { ...seasonRecord, translations: {
    ...seasonValues.translations,
    ar: { name: "ربيع", description: "محفوظ" },
    old: { name: "Archived name", description: "Retain on server" },
  } };
  let sent;
  const form = formHarness("seasons/_components/SeasonForm.tsx", { season: record }, {
    saveSeason: async (id, payload, active) => {
      sent = { id, payload, active };
      return { success: true, message: "Saved", data: record };
    },
  }, languages);
  form.render();
  assert.equal(form.values().translations.ar.description, "محفوظ");
  assert.deepEqual([...seasonPanels(form).props.locales], ["en", "hi", "ar", "old"]);
  assert.ok(form.values().translations.ar);
  assert.ok(form.values().translations.old);
  await form.submit();
  assert.equal(sent.id, 42);
  assert.equal(sent.payload.translations.ar.name, "ربيع");
  assert.equal("old" in sent.payload.translations, false);
  assert.equal("is_active" in sent.payload, false);
  assert.equal(sent.active, false);
  assert.equal(form.values().translations.old.name, "Archived name");
  enabled(form);
});

test("Seasons partial status failures retain the committed ID, all draft values and field errors for retry", async () => {
  const ids = [];
  const languages = [...defaultLanguages, { id: "ar", name: "Arabic", dir: "rtl" }];
  const draft = { ...seasonValues, is_active: true, translations: {
    ...seasonValues.translations, ar: { name: "ربيع", description: "Draft" },
  } };
  const persisted = { ...seasonRecord, translations: draft.translations };
  const form = formHarness("seasons/_components/SeasonForm.tsx", { season: null }, {
    saveSeason: async (id) => {
      ids.push(id);
      return ids.length === 1 ? {
        success: false, message: "Metadata saved, activation failed", data: persisted,
        errors: { "translations.ar.name": ["Check this name"] },
      } : { success: true, message: "Saved", data: { ...persisted, is_active: true } };
    },
  }, languages);
  form.render();
  form.fill(draft);
  await form.submit();
  assert.deepEqual(form.values(), draft);
  assert.equal(form.navigations.length, 0);
  assert.ok(form.fieldErrors.some((error) => error.field === "translations.ar.name"));
  assert.ok(form.values().translations.ar);
  enabled(form);
  await form.submit();
  assert.deepEqual(ids, [null, 42]);
  assert.deepEqual([...seasonPanels(form).props.locales], ["en", "hi", "ar"]);
  assert.equal(form.values().is_active, false);
  assert.equal(form.values().slug, "");
  assert.deepEqual(form.values().translations.ar, { name: "", description: "" });
  assert.equal(form.navigations[0], "/admin/seasons");
  enabled(form);
});

test("Crop Variety configured translations preserve create reset, edit defaults, field errors and retry without a language picker", async () => {
  const languages = [...defaultLanguages, { id: "ar", name: "Arabic", dir: "rtl" }];
  const varietyValues = {
    crop_id: "3", slug: "wheat-variety", variety_code: "", maturity_days_min: "", maturity_days_max: "",
    source_id: "", is_active: false,
    translations: Object.fromEntries(languages.map(({ id }) => [id, { name: `${id} name`, description: "Description", region_notes: "Notes" }])),
  };
  const record = {
    ...varietyValues, id: 42, crop_id: 3, variety_code: null,
    maturity_days_min: null, maturity_days_max: null, source_id: null,
  };
  const props = { variety: null, cropOptions: {}, sourceOptions: {}, initialCrop: null, initialSource: null };
  const panels = (form) => form.find((element) => element.type?.displayName === "./CropVarietyTranslations");
  let sent;
  const create = formHarness("crop-varieties/_components/CropVarietyForm.tsx", props, {
    saveCropVariety: async (id, payload) => {
      sent = { id, payload };
      return { success: true, message: "Saved", data: record };
    },
  }, languages);
  create.render();
  assert.deepEqual(Object.keys(create.values().translations), ["en", "hi", "ar"]);
  assert.equal("onAdd" in panels(create).props, false);
  assert.equal("onRemove" in panels(create).props, false);
  create.fill(varietyValues);
  await create.submit();
  assert.equal(sent.id, null);
  assert.equal(sent.payload.translations.ar.region_notes, "Notes");
  assert.deepEqual(create.values().translations.ar, { name: "", description: "", region_notes: "" });
  enabled(create);

  let success = false;
  const withLegacy = { ...record, translations: { ...record.translations, old: { name: "Archived", description: null, region_notes: null } } };
  const edit = formHarness("crop-varieties/_components/CropVarietyForm.tsx", { ...props, variety: withLegacy }, {
    saveCropVariety: async (id, payload) => {
      sent = { id, payload };
      return success ? { success: true, message: "Saved", data: withLegacy } : {
        success: false, message: "Check names", errors: { "translations.ar.name": ["Correct this name"] },
      };
    },
  }, languages);
  edit.render();
  assert.equal(edit.values().translations.ar.name, "ar name");
  assert.equal(edit.values().translations.old.name, "Archived");
  await edit.submit();
  assert.ok(edit.fieldErrors.some((error) => error.field === "translations.ar.name"));
  assert.equal(edit.values().translations.ar.region_notes, "Notes");
  assert.equal("old" in sent.payload.translations, false);
  assert.equal(edit.navigations.length, 0);
  enabled(edit);
  success = true;
  await edit.submit();
  assert.equal(sent.id, 42);
  assert.equal(edit.values().translations.old.name, "Archived");
  enabled(edit);
});

const stageValues = {
  crop_id: "3", code: "flowering", sequence: "4", is_active: false,
  translations: { en: { name: "Flowering", description: "" }, hi: { name: "पुष्पन", description: "" }, ar: { name: "", description: "" } },
};
const stageRecord = { id: 42, ...stageValues, crop_id: 3, crop_name: "Wheat", sequence: 4 };
const stageLanguages = [...defaultLanguages, { id: "ar", name: "Arabic", dir: "rtl" }];

test("Growth stages render configured languages automatically, omit blank optional translations and reset after create", async () => {
  let sent;
  const form = formHarness("crop-stages/_components/CropStageForm.tsx", { stage: null, crops: [{ id: 3, name: "Wheat" }] }, {
    saveCropStage: async (id, payload, active) => { sent = { id, payload, active }; return { success: true, message: "Saved", data: stageRecord }; },
  }, stageLanguages);
  form.render();
  assert.equal(form.values().is_active, false);
  assert.deepEqual(Object.keys(form.values().translations), ["en", "hi", "ar"]);
  form.fill(stageValues);
  await form.submit();
  assert.equal(sent.id, null);
  assert.equal(sent.payload.crop_id, 3);
  assert.equal(sent.payload.sequence, 4);
  assert.equal("ar" in sent.payload.translations, false);
  assert.equal("is_active" in sent.payload, false);
  assert.equal(form.values().code, "");
  assert.deepEqual(form.values().translations.ar, { name: "", description: "" });
  assert.equal(form.navigations[0], "/admin/crop-stages");
  enabled(form);
});

test("Growth stage partial activation retains the created ID, locks the parent, maps sequence and translation errors and retries", async () => {
  const ids = [];
  const draft = { ...stageValues, is_active: true, translations: { ...stageValues.translations, ar: { name: "  إزهار  ", description: "  Description  " } } };
  const persisted = { ...stageRecord, translations: draft.translations };
  let sent;
  const form = formHarness("crop-stages/_components/CropStageForm.tsx", { stage: null, crops: [{ id: 3, name: "Wheat" }] }, {
    saveCropStage: async (id, payload) => {
      ids.push(id); sent = payload;
      return ids.length === 1 ? { success: false, message: "Metadata saved, status failed", data: persisted, errors: { sequence: ["Already used"], "translations.ar.name": ["Correct name"] } } : { success: true, message: "Saved", data: { ...persisted, is_active: true } };
    },
  }, stageLanguages);
  form.render(); form.fill(draft);
  await form.submit();
  assert.deepEqual(form.values(), draft);
  assert.equal(sent.translations.ar.name, "إزهار");
  assert.equal(sent.translations.ar.description, "Description");
  assert.ok(form.fieldErrors.some((error) => error.field === "sequence"));
  assert.ok(form.fieldErrors.some((error) => error.field === "translations.ar.name"));
  assert.equal(form.find((element) => element.type?.displayName === "./CropStageBasicFields").props.stage.id, 42);
  assert.equal(form.navigations.length, 0);
  enabled(form);
  await form.submit();
  assert.deepEqual(ids, [null, 42]);
  assert.equal(form.values().code, "");
  enabled(form);
});

test("Growth stage edits retain saved optional and legacy locales and preserve drafts after validation failures", async () => {
  const saved = { ...stageRecord, translations: { ...stageValues.translations, ar: { name: "إزهار", description: null }, old: { name: "Archived", description: "Keep" } } };
  let sent;
  const form = formHarness("crop-stages/_components/CropStageForm.tsx", { stage: saved, crops: [] }, {
    saveCropStage: async (id, payload) => { sent = { id, payload }; return { success: false, message: "Duplicate code", errors: { code: ["Already used"] } }; },
  }, stageLanguages);
  form.render();
  assert.equal(form.values().translations.old.name, "Archived");
  assert.equal(form.values().translations.ar.description, "");
  await form.submit();
  assert.equal(sent.id, 42);
  assert.equal(sent.payload.translations.ar.name, "إزهار");
  assert.equal("old" in sent.payload.translations, false);
  assert.equal(form.values().translations.old.description, "Keep");
  assert.equal(form.values().code, "flowering");
  enabled(form);
});

const timelineValues = {
  crop_id: "3", crop_stage_id: "4", crop_variety_id: "", season_id: "", source_id: "9",
  days_after_sowing_min: "0", days_after_sowing_max: "10", region_scope: "all", region_ids: [101, 102],
};
const timelineRecord = {
  id: 42, crop_id: 3, crop_stage_id: 4, crop_variety_id: null, season_id: null, source_id: 9,
  days_after_sowing_min: 0, days_after_sowing_max: 10, region_scope: "specific", region_ids: [101, 102], regions: [], is_active: false,
};

test("Timeline creates omit UI-only crop/status fields, preserve zero days and optional null IDs, clear all-region IDs and reset after saving", async () => {
  let sent;
  const form = formHarness("crop-stage-timelines/_components/StageTimelineForm.tsx", { timeline: null, choices: {}, selections: {}, states: [] }, {
    saveStageTimeline: async (id, payload) => { sent = { id, payload }; return { success: true, message: "Saved", data: timelineRecord }; },
  });
  form.render(); form.fill(timelineValues);
  await form.submit();
  assert.equal(sent.id, null);
  assert.equal(sent.payload.days_after_sowing_min, 0);
  assert.equal(sent.payload.crop_variety_id, null); assert.equal(sent.payload.season_id, null);
  assert.deepEqual(clone(sent.payload.region_ids), []);
  assert.equal("crop_id" in sent.payload, false); assert.equal("is_active" in sent.payload, false);
  assert.equal("description" in sent.payload, false); assert.equal("remarks" in sent.payload, false);
  assert.equal(form.values().crop_id, ""); assert.equal(form.values().region_scope, "all");
  assert.equal(form.navigations[0], "/admin/crop-stage-timelines"); enabled(form);
});

test("Timeline edit keeps saved district IDs and nullable relations, maps indexed region errors and preserves values for retry", async () => {
  let success = false;
  let sent;
  const form = formHarness("crop-stage-timelines/_components/StageTimelineForm.tsx", { timeline: timelineRecord, choices: {}, selections: {}, states: [] }, {
    saveStageTimeline: async (id, payload) => {
      sent = { id, payload };
      return success ? { success: true, message: "Saved", data: timelineRecord } : { success: false, message: "Invalid district", errors: { "region_ids.0": ["Inactive district"], days_after_sowing_max: ["Check range"] } };
    },
  });
  form.render();
  assert.deepEqual(form.values().region_ids, [101, 102]); assert.equal(form.values().crop_variety_id, "");
  const draft = { ...timelineValues, region_scope: "specific", crop_variety_id: "6", season_id: "7" };
  form.fill(draft); await form.submit();
  assert.equal(sent.id, 42); assert.deepEqual(clone(sent.payload.region_ids), [101, 102]);
  assert.ok(form.fieldErrors.some((error) => error.field === "region_ids" && error.message === "Inactive district"));
  assert.ok(form.fieldErrors.some((error) => error.field === "days_after_sowing_max"));
  assert.deepEqual(form.values(), draft); assert.equal(form.navigations.length, 0); enabled(form);
  success = true; await form.submit(); assert.equal(sent.id, 42); assert.deepEqual(form.values(), draft); enabled(form);
});
