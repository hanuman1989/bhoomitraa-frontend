const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Test action orchestration against the verified contracts without credentials
// or a database. The real API service is loaded; its shared HTTP transport is mocked.
function harness(
  responses,
  authenticated = true,
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
        require(name) {
          if (name === "server-only") return {};
          if (name === "@/i18n/languages") return { languages };
          if (name === "next/cache")
            return {
              revalidatePath: (route, type) =>
                invalidations.push({ route, type }),
            };
          if (name === "next-intl/server")
            return {
              getTranslations: async () => (key, values) =>
                values ? `${key}: ${values.message}` : key,
            };
          if (name === "@/lib/auth/dal")
            return {
              requireAdmin: async () => {
                if (!authenticated) throw new Error("unauthorized");
                return { id: 1 };
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
          if (name === "@/lib/apis/admin/cropCategories")
            return { cropCategoriesAPI: api };
          if (name === "@/lib/api/request")
            return {
              apiRequest: async (url, options = {}) => {
                requests.push({ url, options });
                if (responses.length === 0)
                  throw new Error("Unexpected request");
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
  api = load("src/lib/apis/admin/cropCategories.ts").cropCategoriesAPI;
  return {
    api,
    actions: load("src/actions/admin/cropCategories.ts"),
    requests,
    invalidations,
  };
}

const category = {
  id: 42,
  slug: "cereals",
  name: "Cereals",
  is_active: false,
  translations: {
    en: { locale: "en", name: "Cereals", description: null },
    hi: { locale: "hi", name: "Hindi name", description: null },
  },
  added_at: "4 Nov 2026 02:30 PM",
  created_at: null,
  updated_at: null,
};
const payload = {
  slug: "cereals",
  translations: {
    en: { name: "Cereals", description: null },
    hi: { name: "Hindi name", description: "Description" },
  },
};
const success = (data) => ({ status: true, data, message: "Saved" });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("list preserves the requested locale and inactive filter", async () => {
  const { api, requests } = harness([success([])]);
  await api.list({ keyword: "grain", is_active: "0", locale: "hi", page: 2 });
  assert.equal(requests[0].url, "/admin/crop-categories");
  assert.deepEqual(plain(requests[0].options.params), {
    keyword: "grain",
    is_active: "0",
    locale: "hi",
    page: 2,
  });
});

test("create sends both translations together and allowlists all metadata fields", async () => {
  const { actions, requests, invalidations } = harness([success(category)]);
  const result = await actions.saveCropCategory(
    null,
    {
      ...payload,
      id: 99,
      is_active: true,
      translations: {
        ...payload.translations,
        en: { ...payload.translations.en, id: 77 },
        fr: { name: "Legacy" },
      },
    },
    false,
  );
  assert.equal(result.success, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, "POST");
  assert.deepEqual(plain(requests[0].options.data), payload);
  assert.ok(invalidations.length > 0);
});

test("configured extra category translations reach create and update without read-only fields", async () => {
  const { actions, requests } = harness(
    [success(category), success(category)],
    true,
    [{ id: "en" }, { id: "hi" }, { id: "ar" }],
  );
  const values = {
    ...payload,
    translations: {
      ...payload.translations,
      ar: { name: "Arabic category", description: "Description", id: 99 },
      fr: { name: "Legacy" },
    },
  };
  for (const id of [null, 42])
    assert.equal(
      (await actions.saveCropCategory(id, values, false)).success,
      true,
    );
  for (const request of requests) {
    assert.deepEqual(plain(request.options.data.translations.ar), {
      name: "Arabic category",
      description: "Description",
    });
    assert.equal("fr" in request.options.data.translations, false);
  }
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[1].options.method, "PATCH");
  assert.equal(
    (await actions.saveCropCategory(null, payload, false)).success,
    false,
  );
  assert.equal(requests.length, 2);
});

test("activation follows metadata persistence through the dedicated status endpoint", async () => {
  const { actions, requests } = harness([
    success(category),
    success({ ...category, is_active: true }),
  ]);
  const result = await actions.saveCropCategory(null, payload, true);
  assert.equal(result.success, true);
  assert.equal(result.data.is_active, true);
  assert.equal(requests[1].url, "/admin/crop-categories/42/status");
  assert.equal(requests[1].options.method, "PATCH");
  assert.deepEqual(plain(requests[1].options.data), { is_active: true });
  assert.equal("is_active" in requests[0].options.data, false);
});

test("failed publication retains the committed ID so a retry updates instead of creating", async () => {
  const conflict = Object.assign(new Error("Activation conflict"), {
    errors: { is_active: ["English name required"] },
  });
  const { actions, requests } = harness([
    success(category),
    conflict,
    success(category),
    success({ ...category, is_active: true }),
  ]);
  const failed = await actions.saveCropCategory(null, payload, true);
  assert.equal(failed.success, false);
  assert.equal(failed.data.id, 42);
  assert.equal(failed.errors.is_active[0], "English name required");
  assert.match(failed.message, /statusSaveFailed/);
  const retried = await actions.saveCropCategory(failed.data.id, payload, true);
  assert.equal(retried.success, true);
  assert.equal(requests[2].url, "/admin/crop-categories/42");
  assert.equal(requests[2].options.method, "PATCH");
  assert.equal(
    requests.filter((request) => request.options.method === "POST").length,
    1,
  );
});

test("business failure in publication also retains metadata without claiming success", async () => {
  const { actions } = harness([
    success(category),
    { status: false, data: null, message: "Not allowed" },
  ]);
  const result = await actions.saveCropCategory(null, payload, true);
  assert.equal(result.success, false);
  assert.equal(result.data.id, 42);
  assert.match(result.message, /Not allowed/);
});

test("nested 422 errors survive failed metadata saves without revalidation or status requests", async () => {
  const validation = Object.assign(new Error("Validation failed"), {
    errors: { "translations.hi.name": ["Hindi name required"] },
  });
  const { actions, requests, invalidations } = harness([validation]);
  const result = await actions.saveCropCategory(null, payload, true);
  assert.equal(result.success, false);
  assert.equal(result.errors["translations.hi.name"][0], "Hindi name required");
  assert.equal(result.data, undefined);
  assert.equal(requests.length, 1);
  assert.equal(invalidations.length, 0);
});

test("metadata business failures cannot proceed to publication", async () => {
  const { actions, requests, invalidations } = harness([
    { status: false, data: null, message: "Save rejected" },
  ]);
  const result = await actions.saveCropCategory(null, payload, true);
  assert.equal(result.success, false);
  assert.equal(requests.length, 1);
  assert.equal(invalidations.length, 0);
});

test("status updates send only the publication boolean", async () => {
  const { actions, requests } = harness([
    success({ ...category, is_active: true }),
  ]);
  assert.equal(
    (await actions.updateCropCategoryStatus(42, true)).success,
    true,
  );
  assert.deepEqual(plain(requests[0].options.data), { is_active: true });
});

test("conflicting deletions preserve the server failure and do not revalidate", async () => {
  const { actions, requests, invalidations } = harness([
    new Error("Referenced category cannot be deleted"),
  ]);
  const result = await actions.deleteCropCategory(42);
  assert.equal(result.success, false);
  assert.match(result.message, /Referenced/);
  assert.equal(requests[0].options.method, "DELETE");
  assert.equal(requests[0].options.data, undefined);
  assert.equal(invalidations.length, 0);
});

test("untrusted IDs and missing authentication cannot trigger mutations", async () => {
  const unauthenticated = harness([], false);
  assert.equal(
    (await unauthenticated.actions.saveCropCategory(null, payload, false))
      .success,
    false,
  );
  assert.equal(
    (await unauthenticated.actions.deleteCropCategory(42)).success,
    false,
  );
  assert.equal(
    (await unauthenticated.actions.updateCropCategoryStatus(42, true)).success,
    false,
  );
  assert.equal(unauthenticated.requests.length, 0);
  const invalid = harness([]);
  assert.equal((await invalid.actions.deleteCropCategory(-1)).success, false);
  assert.equal(
    (await invalid.actions.updateCropCategoryStatus(42, "1")).success,
    false,
  );
  assert.equal(invalid.requests.length, 0);
});
