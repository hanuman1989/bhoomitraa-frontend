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
          if (name === "@/lib/apis/admin/cropVarieties") return { cropVarietiesAPI: api };
          if (name === "@/types/admin/cropVariety") return { requiredVarietyLocales: ["en", "hi"] };
          if (name === "@/lib/apis/admin/crops" || name === "@/lib/apis/admin/knowledgeSources") return { [name.endsWith("crops") ? "cropsAPI" : "knowledgeSourcesAPI"]: { list: async params => { requests.push({ url: name.endsWith("crops") ? "/admin/crops" : "/admin/knowledge-sources", options: { params } }); return responses.shift(); } } };
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
  api = load("src/lib/apis/admin/cropVarieties.ts").cropVarietiesAPI;
  return {
    api,
    actions: load("src/actions/admin/cropVarieties.ts"),
    requests,
    invalidations,
  };
}

const payload = {
  crop_id: 3, slug: "hd-2967", variety_code: null,
  maturity_days_min: null, maturity_days_max: null, source_id: null, is_active: false,
  translations: {
    en: { name: "HD 2967", description: null, region_notes: null },
    hi: { name: "Hindi variety", description: "Description", region_notes: "Region notes" },
  },
};
const variety = { id: 42, ...payload, name: "HD 2967", crop_name: "Wheat", source_title: null };
const success = data => ({ status: true, data, message: "Saved" });
const plain = value => JSON.parse(JSON.stringify(value));

test("variety list uses the real status and source filters and preserves inactive zero", async () => {
  const { api, requests } = harness([success([])]);
  await api.list({ keyword: "hd", crop_id: 3, source_id: 12, status: "0", page: 2, per_page: 15 });
  assert.equal(requests[0].url, "/admin/crop-varieties");
  assert.deepEqual(plain(requests[0].options.params), { keyword: "hd", crop_id: 3, source_id: 12, status: "0", page: 2, per_page: 15 });
});

test("a variety and all selected translations save together with nullable maturity and source", async () => {
  const { actions, requests } = harness([success(variety)]);
  assert.equal((await actions.saveCropVariety(null, { ...payload, review_status: "verified", id: 999 })).success, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, "POST");
  assert.deepEqual(plain(requests[0].options.data), payload);
});

test("variety edits retain configured extra translations and allowlist their writable fields", async () => {
  const { actions, requests } = harness([success(variety)], undefined, [{ id: "en" }, { id: "hi" }, { id: "ar" }]);
  const values = { ...payload, maturity_days_min: 135, source_id: 12, translations: { ...payload.translations, ar: { name: "Arabic name", description: "Description", region_notes: "Notes", id: 12 }, fr: { name: "Saved legacy" } } };
  assert.equal((await actions.saveCropVariety(42, values)).success, true);
  assert.equal(requests[0].url, "/admin/crop-varieties/42");
  assert.equal(requests[0].options.method, "PATCH");
  const sent = requests[0].options.data;
  assert.deepEqual(plain(sent.translations.ar), { name: "Arabic name", description: "Description", region_notes: "Notes" });
  assert.equal("fr" in sent.translations, false);
  assert.equal(sent.maturity_days_max, null);
  assert.equal(sent.source_id, 12);
});

test("invalid IDs and non-finite or non-integer maturity values cannot reach Laravel", async () => {
  const { actions, requests } = harness([]);
  for (const maturity_days_min of [NaN, Infinity, 0, -1, 1.5]) assert.equal((await actions.saveCropVariety(null, { ...payload, maturity_days_min })).success, false);
  for (const source_id of [NaN, 0, -1]) assert.equal((await actions.saveCropVariety(null, { ...payload, source_id })).success, false);
  assert.equal((await actions.saveCropVariety(-1, payload)).success, false);
  assert.equal(requests.length, 0);
});

test("nested 422 errors and source eligibility errors survive without cache invalidation", async () => {
  const validation = Object.assign(new Error("Validation failed"), { errors: { "translations.hi.region_notes": ["Too long"], source_id: ["Verified source required"] } });
  const { actions, invalidations } = harness([validation]);
  const result = await actions.saveCropVariety(42, payload);
  assert.equal(result.success, false);
  assert.equal(result.errors["translations.hi.region_notes"][0], "Too long");
  assert.equal(result.errors.source_id[0], "Verified source required");
  assert.equal(invalidations.length, 0);
});

test("status changes send only a boolean and deletion conflicts remain recoverable", async () => {
  const { actions, requests, invalidations } = harness([success(variety), new Error("Referenced variety cannot be deleted")]);
  assert.equal((await actions.updateCropVarietyStatus(42, false)).success, true);
  assert.equal(requests[0].url, "/admin/crop-varieties/42/status");
  assert.deepEqual(plain(requests[0].options.data), { is_active: false });
  const count = invalidations.length;
  assert.equal((await actions.deleteCropVariety(42)).success, false);
  assert.equal(invalidations.length, count);
  assert.equal(requests[1].options.method, "DELETE");
});

test("relation searches are paginated and prefer active verified sources only when requested", async () => {
  const page = { ...success([]), pagination: { current_page: 2, last_page: 3 } };
  const { actions, requests } = harness([page, page, page]);
  await actions.searchVarietyRelations("crop", " wheat ", 2, true);
  await actions.searchVarietyRelations("source", "ICAR", 2, true);
  await actions.searchVarietyRelations("source", "ICAR", 1, false);
  assert.equal(requests[0].options.params.per_page, 20);
  assert.equal(requests[0].options.params.page, 2);
  assert.equal(requests[0].options.params.keyword, "wheat");
  assert.equal(requests[1].options.params.verification_status, "verified");
  assert.equal(requests[1].options.params.is_active, 1);
  assert.equal("is_active" in requests[2].options.params, false);
  assert.equal("verification_status" in requests[2].options.params, false);
});

test("business failures and missing authentication cannot be treated as saved varieties", async () => {
  const failure = harness([{ status: false, data: null, message: "Not saved" }]);
  assert.equal((await failure.actions.saveCropVariety(null, payload)).success, false);
  assert.equal(failure.invalidations.length, 0);
  const unauthenticated = harness([], null);
  assert.equal((await unauthenticated.actions.saveCropVariety(null, payload)).success, false);
  assert.equal((await unauthenticated.actions.deleteCropVariety(42)).success, false);
  assert.equal((await unauthenticated.actions.updateCropVarietyStatus(42, true)).success, false);
  assert.equal((await unauthenticated.actions.searchVarietyRelations("source", "", 1, true)).success, false);
  assert.equal(unauthenticated.requests.length, 0);
});

