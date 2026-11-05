const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the real server-only client without contacting Laravel or reading
// session/environment secrets. Only its Next.js runtime dependencies are mocked.
function client(fetchResponse, token = "test-session") {
  const requests = [];
  let ApiError;
  function load(relativePath) {
    const filename = path.join(__dirname, "..", relativePath);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const compiledModule = { exports: {} };
    const context = {
      module: compiledModule,
      exports: compiledModule.exports,
      Headers,
      FormData,
      Blob,
      File,
      URL,
      AbortSignal,
      process: { env: { API_BASE_URL: "https://backend.example/api" } },
      fetch: async (url, options) => {
        requests.push({ url, options });
        if (fetchResponse instanceof Error) throw fetchResponse;
        return fetchResponse;
      },
      require: (name) => {
        if (name === "server-only") return {};
        if (name === "next/headers")
          return {
            cookies: async () => ({
              get: () => (token ? { value: token } : undefined),
            }),
          };
        if (name === "next-intl/server")
          return {
            getLocale: async () => "hi",
            getTranslations: async () => (key) => key,
          };
        if (name === "./ApiError") return { ApiError };
        throw new Error(`Unexpected module ${name}`);
      },
    };
    vm.runInNewContext(compiled, context, { filename });
    return compiledModule.exports;
  }
  ApiError = load("src/lib/api/ApiError.ts").ApiError;
  return {
    apiRequest: load("src/lib/api/request.ts").apiRequest,
    requests,
    ApiError,
  };
}

test("JSON requests retain authentication, locale, query values, and no-store", async () => {
  const { apiRequest, requests } = client(
    Response.json({ status: true, data: [] }),
  );
  const result = await apiRequest("/admin/knowledge-sources", {
    params: { keyword: "wheat", is_active: 0, page: 2, empty: "" },
  });
  assert.equal(result.status, true);
  const { url, options } = requests[0];
  assert.equal(url.searchParams.get("is_active"), "0");
  assert.equal(url.searchParams.has("empty"), false);
  assert.equal(options.headers.get("Authorization"), "Bearer test-session");
  assert.equal(options.headers.get("Accept"), "application/json");
  assert.equal(options.headers.get("X-Locale"), "hi");
  assert.equal(options.cache, "no-store");
});

test("opt-in binary mode preserves arbitrary document bytes", async () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 0, 255]);
  const { apiRequest } = client(new Response(bytes));
  const result = await apiRequest("/admin/knowledge-sources/1/attachments/2", {
    responseType: "binary",
  });
  assert.ok(result instanceof Blob);
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), bytes);
});

test("binary errors still use JSON status and field validation handling", async () => {
  const { apiRequest, ApiError } = client(
    Response.json(
      {
        message: "Invalid file",
        errors: { attachments: "Unsupported format" },
      },
      { status: 422 },
    ),
  );
  await assert.rejects(
    apiRequest("/admin/knowledge-sources/1/attachments/2", {
      responseType: "binary",
    }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 422);
      assert.equal(error.message, "Invalid file");
      assert.equal(error.errors.attachments[0], "Unsupported format");
      return true;
    },
  );
});

test("private downloads fail before fetching when the token is absent", async () => {
  const { apiRequest, requests } = client(new Response("document"), null);
  await assert.rejects(
    apiRequest("/admin/knowledge-sources/1/attachments/2", {
      responseType: "binary",
    }),
    (error) => error.status === 401,
  );
  assert.equal(requests.length, 0);
});

test("multipart bodies keep their native boundaries and file bytes", async () => {
  const { apiRequest, requests } = client(
    Response.json({ status: true, data: [] }),
  );
  const data = new FormData();
  data.append(
    "attachments[]",
    new File(["%PDF"], "report.pdf", { type: "application/pdf" }),
  );
  await apiRequest("/admin/knowledge-sources/1/attachments", {
    method: "POST",
    data,
  });
  assert.equal(requests[0].options.body, data);
  assert.equal(requests[0].options.headers.has("Content-Type"), false);
});

test("empty JSON responses and internal error masking are preserved", async () => {
  const empty = client(new Response(null, { status: 204 }));
  assert.equal(
    await empty.apiRequest("/admin/knowledge-sources/1", { method: "DELETE" }),
    null,
  );
  const failed = client(
    Response.json({ message: "Internal database details" }, { status: 500 }),
  );
  await assert.rejects(
    failed.apiRequest("/admin/knowledge-sources/1/attachments/2", {
      responseType: "binary",
    }),
    (error) =>
      error.status === 500 && error.message === "Backend request failed",
  );
});

test("path and GET/DELETE body restrictions apply to binary mode too", async () => {
  const { apiRequest, requests } = client(new Response("unused"));
  await assert.rejects(
    apiRequest("https://untrusted.example/file", { responseType: "binary" }),
    /Invalid API path/,
  );
  await assert.rejects(
    apiRequest("/admin/knowledge-sources/1", {
      responseType: "binary",
      data: {},
    }),
    /must not include a body/,
  );
  await assert.rejects(
    apiRequest("/admin/knowledge-sources/1", { method: "DELETE", data: {} }),
    /must not include a body/,
  );
  assert.equal(requests.length, 0);
});
