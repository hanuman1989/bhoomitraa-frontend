const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness(
  responses,
  admin = { id: 1, is_super_user: true },
  languages = [{ id: "en" }, { id: "hi" }],
) {
  const requests = [];
  const invalidations = [];
  let api;
  function load(file) {
    const compiledModule = { exports: {} };
    const source = ts.transpileModule(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    vm.runInNewContext(
      source,
      {
        module: compiledModule,
        exports: compiledModule.exports,
        FormData,
        File,
        require(name) {
          if (name === "server-only") return {};
          if (name === "@/i18n/languages") return { languages };
          if (name === "next/cache")
            return { revalidatePath: (route) => invalidations.push(route) };
          if (name === "next-intl/server")
            return { getTranslations: async () => (key) => key };
          if (name === "@/lib/auth/dal")
            return {
              requireAdmin: async () => {
                if (!admin) throw new Error("Sign in required");
                return admin;
              },
            };
          if (name === "@/lib/api/handleActionError")
            return {
              handleActionError: async (error) => ({
                success: false,
                message: error.message,
                errors: error.errors,
              }),
            };
          if (name === "@/lib/apis/admin/crops") return { cropsAPI: api };
          if (name === "@/lib/api/ApiError") return { ApiError: Error };
          if (name === "@/lib/apis/admin/cropCategories")
            return {
              cropCategoriesAPI: {
                list: async (params) => {
                  requests.push({
                    url: "/admin/crop-categories",
                    options: { params },
                  });
                  const response = responses.shift();
                  if (response instanceof Error) throw response;
                  return response;
                },
              },
            };
          if (name === "@/lib/api/request")
            return {
              apiRequest: async (url, options = {}) => {
                requests.push({ url, options });
                if (!responses.length) throw new Error("Unexpected request");
                const response = responses.shift();
                if (response instanceof Error) throw response;
                return response;
              },
            };
          throw new Error(`Unexpected dependency ${name}`);
        },
      },
      { filename: file },
    );
    return compiledModule.exports;
  }
  api = load("src/lib/apis/admin/crops.ts").cropsAPI;
  return {
    api,
    actions: load("src/actions/admin/crops.ts"),
    categories: () =>
      load(
        "src/app/[locale]/(admin)/admin/(pages)/crops/_components/loadCropCategories.ts",
      ).default,
    requests,
    invalidations,
  };
}

const crop = {
  id: 42,
  category_id: 3,
  category_name: "Cereals",
  slug: "wheat",
  scientific_name: null,
  crop_code: null,
  image_url: null,
  name: "Wheat",
  is_active: false,
  ai_diagnosis_enabled: false,
  translations: {
    en: { locale: "en", name: "Wheat", description: null },
    hi: { locale: "hi", name: "Hindi name", description: null },
  },
  added_at: "4 Nov 2026 02:30 PM",
  created_at: null,
  updated_at: null,
};
const payload = {
  category_id: 3,
  slug: "wheat",
  scientific_name: null,
  crop_code: null,
  is_active: false,
  translations: {
    en: { name: "Wheat", description: null },
    hi: { name: "Hindi name", description: null },
  },
};
const success = (data) => ({ status: true, data, message: "Saved" });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("crop list preserves requested locale, category, inactive, and search filters", async () => {
  const { api, requests } = harness([success([])]);
  await api.list({
    locale: "hi",
    keyword: "wheat",
    category_id: 3,
    is_active: "0",
    page: 2,
  });
  assert.equal(requests[0].url, "/admin/crops");
  assert.deepEqual(plain(requests[0].options.params), {
    locale: "hi",
    keyword: "wheat",
    category_id: 3,
    is_active: "0",
    page: 2,
  });
});

test("crop metadata allowlists fields and sends both translations in one JSON request", async () => {
  const { actions, requests } = harness([success(crop)]);
  const result = await actions.saveCrop(null, {
    ...payload,
    image: "/private/file.jpg",
    created_at: "unexpected",
    translations: {
      ...payload.translations,
      en: { ...payload.translations.en, id: 9 },
      fr: { name: "Legacy" },
    },
  });
  assert.equal(result.success, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, "POST");
  assert.deepEqual(plain(requests[0].options.data), payload);
});

test("crop creates and updates include additional configured languages and strip read-only translation fields", async () => {
  const { actions, requests } = harness(
    [success(crop), success(crop)],
    undefined,
    [{ id: "en" }, { id: "hi" }, { id: "ar" }],
  );
  const values = {
    ...payload,
    translations: {
      ...payload.translations,
      ar: { name: "Arabic crop name", description: "Description", id: 99 },
    },
  };
  for (const id of [null, 42]) {
    assert.equal((await actions.saveCrop(id, values)).success, true);
  }
  assert.deepEqual(plain(requests[0].options.data.translations.ar), {
    name: "Arabic crop name",
    description: "Description",
  });
  assert.deepEqual(
    plain(requests[1].options.data.translations),
    plain(requests[0].options.data.translations),
  );
  assert.equal(requests[1].options.method, "PATCH");
  assert.equal((await actions.saveCrop(null, payload)).success, false);
  assert.equal(requests.length, 2);
});

test("ordinary admins can preserve AI configuration but cannot change it through crafted requests", async () => {
  const { actions, requests } = harness(
    [success({ ...crop, ai_diagnosis_enabled: true })],
    { id: 1, is_super_user: false },
  );
  assert.equal((await actions.saveCrop(42, payload)).success, true);
  assert.equal("ai_diagnosis_enabled" in requests[0].options.data, false);
  assert.equal(
    (await actions.saveCrop(42, { ...payload, ai_diagnosis_enabled: false }))
      .success,
    false,
  );
  assert.equal(
    (await actions.saveCrop(null, { ...payload, ai_diagnosis_enabled: true }))
      .success,
    false,
  );
  assert.equal(requests.length, 1);
});

test("super admin AI configuration is sent and backend validation remains authoritative", async () => {
  const unavailable = Object.assign(
    new Error("AI diagnosis is not available"),
    { errors: { ai_diagnosis_enabled: ["AI diagnosis is not available"] } },
  );
  const { actions, requests, invalidations } = harness([unavailable]);
  const result = await actions.saveCrop(null, {
    ...payload,
    ai_diagnosis_enabled: true,
  });
  assert.equal(requests[0].options.data.ai_diagnosis_enabled, true);
  assert.equal(result.success, false);
  assert.equal(
    result.errors.ai_diagnosis_enabled[0],
    "AI diagnosis is not available",
  );
  assert.equal(invalidations.length, 0);
});

test("nested translation and inactive-category validation errors are preserved", async () => {
  const validation = Object.assign(new Error("Validation failed"), {
    errors: {
      "translations.hi.name": ["Required"],
      category_id: ["Active category required"],
    },
  });
  const { actions, invalidations } = harness([validation]);
  const result = await actions.saveCrop(42, payload);
  assert.equal(result.success, false);
  assert.equal(result.errors["translations.hi.name"][0], "Required");
  assert.equal(result.errors.category_id[0], "Active category required");
  assert.equal(invalidations.length, 0);
});

test("crop creation sends image, metadata and nested translations in one multipart request", async () => {
  const updated = {
    ...crop,
    image_url: "https://example.com/storage/crops/42/image.jpg",
  };
  const { actions, requests } = harness([success(updated)]);
  const data = new FormData();
  data.append(
    "image",
    new File(["image"], "wheat.jpg", { type: "image/jpeg" }),
  );
  data.append("image_path", "untrusted");
  const result = await actions.saveCrop(null, payload, data);
  assert.equal(result.success, true);
  assert.equal(result.data.image_url, updated.image_url);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/admin/crops");
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[0].options.data.get("slug"), "wheat");
  assert.equal(requests[0].options.data.get("category_id"), "3");
  assert.equal(requests[0].options.data.get("is_active"), "0");
  assert.equal(requests[0].options.data.get("scientific_name"), "");
  assert.equal(requests[0].options.data.get("translations[en][name]"), "Wheat");
  assert.equal(
    requests[0].options.data.get("translations[hi][description]"),
    "",
  );
  assert.equal(requests[0].options.data.has("_method"), false);
  assert.equal(requests[0].options.data.has("ai_diagnosis_enabled"), false);
  assert.equal(requests[0].options.data.get("image").name, "wheat.jpg");
  assert.equal(requests[0].options.data.has("image_path"), false);
});

test("multipart edits use POST with a PATCH override and configured translations", async () => {
  const { actions, requests } = harness([success(crop)], undefined, [
    { id: "en" },
    { id: "hi" },
    { id: "ar" },
  ]);
  const data = new FormData();
  const image = new File(["image bytes"], "replacement.webp", {
    type: "image/webp",
  });
  data.append("image", image);
  data.append("_method", "DELETE");
  const result = await actions.saveCrop(
    42,
    {
      ...payload,
      ai_diagnosis_enabled: false,
      translations: {
        ...payload.translations,
        ar: { name: "Arabic crop", description: null },
      },
    },
    data,
  );
  assert.equal(result.success, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/admin/crops/42");
  assert.equal(requests[0].options.method, "POST");
  const sent = requests[0].options.data;
  assert.equal(sent.get("_method"), "PATCH");
  assert.equal(sent.get("ai_diagnosis_enabled"), "0");
  assert.equal(sent.get("translations[ar][name]"), "Arabic crop");
  assert.equal(await sent.get("image").text(), "image bytes");
});

test("saving without a selected file omits image and preserves the existing image", async () => {
  const { actions, requests } = harness([success(crop)]);
  assert.equal(
    (await actions.saveCrop(42, payload, new FormData())).success,
    true,
  );
  assert.equal(requests[0].options.method, "PATCH");
  assert.equal("image" in requests[0].options.data, false);
});

test("unsupported, empty, oversized, and multiple images are rejected before upload", async () => {
  const { actions, requests } = harness([]);
  for (const files of [
    [new File(["svg"], "crop.svg", { type: "image/svg+xml" })],
    [new File([], "empty.png", { type: "image/png" })],
    [
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
        type: "image/jpeg",
      }),
    ],
    [
      new File(["one"], "one.png", { type: "image/png" }),
      new File(["two"], "two.png", { type: "image/png" }),
    ],
  ]) {
    const data = new FormData();
    files.forEach((file) => data.append("image", file));
    const result = await actions.saveCrop(42, payload, data);
    assert.equal(result.success, false);
    assert.ok(result.errors.image);
  }
  assert.equal(requests.length, 0);
});

test("image removal is submitted with all crop changes through the normal save action", async () => {
  const { actions, requests } = harness([success(crop)]);
  assert.equal(
    (await actions.saveCrop(42, { ...payload, image: null })).success,
    true,
  );
  assert.equal(requests[0].url, "/admin/crops/42");
  assert.equal(requests[0].options.method, "PATCH");
  assert.deepEqual(plain(requests[0].options.data), {
    ...payload,
    image: null,
  });
  assert.equal(requests.length, 1);
});

test("status actions cannot alter AI settings and deletion conflicts do not revalidate", async () => {
  const { actions, requests, invalidations } = harness([
    success({ ...crop, is_active: true }),
    new Error("Referenced crop cannot be deleted"),
  ]);
  assert.equal((await actions.updateCropStatus(42, true)).success, true);
  assert.deepEqual(plain(requests[0].options.data), { is_active: true });
  const beforeDelete = invalidations.length;
  assert.equal((await actions.deleteCrop(42)).success, false);
  assert.equal(invalidations.length, beforeDelete);
});

test("business failures cannot be reported as persisted or revalidated", async () => {
  const { actions, invalidations } = harness([
    { status: false, data: null, message: "Not saved" },
  ]);
  assert.equal((await actions.saveCrop(null, payload)).success, false);
  assert.equal(invalidations.length, 0);
});

test("category options load all pages using the requested active-only policy", async () => {
  const first = {
    status: true,
    data: [{ id: 1, name: "Cereals" }],
    pagination: { last_page: 2 },
  };
  const second = {
    status: true,
    data: [{ id: 2, name: "Pulses" }],
    pagination: { last_page: 2 },
  };
  const { categories, requests } = harness([first, second]);
  const options = await categories()(true);
  assert.equal(options.length, 2);
  assert.deepEqual(
    requests.map((request) => request.options.params.page),
    [1, 2],
  );
  assert.ok(
    requests.every(
      (request) =>
        request.options.params.is_active === "1" &&
        request.options.params.per_page === 100,
    ),
  );
});

test("every mutation authenticates and rejects invalid IDs without issuing backend requests", async () => {
  const { actions, requests } = harness([], null);
  assert.equal((await actions.saveCrop(null, payload)).success, false);
  assert.equal((await actions.updateCropStatus(42, false)).success, false);
  assert.equal((await actions.deleteCrop(42)).success, false);
  assert.equal(
    (await actions.saveCrop(42, payload, new FormData())).success,
    false,
  );
  assert.equal(
    (await actions.saveCrop(42, { ...payload, image: null })).success,
    false,
  );
  assert.equal(requests.length, 0);
  const invalid = harness([]);
  assert.equal((await invalid.actions.deleteCrop(-1)).success, false);
  assert.equal(
    (await invalid.actions.updateCropStatus(42, "1")).success,
    false,
  );
  assert.equal(invalid.requests.length, 0);
});
