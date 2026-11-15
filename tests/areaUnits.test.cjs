const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { createTranslator } = require("next-intl");
const { config, utils, metadata } = require("./helpers/areaUnits.cjs");
const clone = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setImmediate(resolve));
function load(file, dependencies = {}) {
  const moduleObject = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module: moduleObject,
      exports: moduleObject.exports,
      require(name) {
        if (name === "server-only") return {};
        if (name === "react/jsx-runtime") return jsx;
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        throw Error(`Unexpected dependency ${name}`);
      },
    },
  );
  return moduleObject.exports;
}
function intl(locale = "en") {
  return {
    useLocale: () => locale,
    useTranslations: (namespace) =>
      createTranslator({
        locale,
        messages: JSON.parse(
          fs.readFileSync(`src/messages/${locale}.json`, "utf8"),
        ),
        namespace,
      }),
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return Array.isArray(tree)
    ? tree.flatMap(nodes)
    : [tree, ...nodes(tree.props?.children)];
}

test("all configured decimal factors convert through square metres without a hardcoded production unit list", () => {
  for (const unit of config.units) {
    assert.equal(
      utils.toSquareMeters("2", unit.value, config),
      Number(unit.square_meter_factor) * 2,
    );
    assert.equal(
      utils.fromSquareMeters(
        Number(unit.square_meter_factor) * 2,
        unit.value,
        config,
      ),
      2,
    );
  }
  assert.equal(
    utils.convertArea(4, "bigha_pakka", "hectare", config),
    1.011714192,
  );
  assert.equal(utils.toSquareMeters(4, "bigha_kaccha", config), 6474.97027584);
  const extended = {
    ...config,
    units: [
      ...config.units,
      { value: "future_unit", label: "Future", square_meter_factor: "2.125" },
    ],
  };
  assert.equal(utils.isSupportedAreaUnit("future_unit", extended), true);
  assert.equal(utils.toSquareMeters(4, "future_unit", extended), 8.5);
});

test("invalid measurements and factors remain unresolved while actual zero values survive", () => {
  for (const value of [
    null,
    undefined,
    "",
    "  ",
    NaN,
    Infinity,
    -Infinity,
    -1,
    "-1",
    "NaN",
    "Infinity",
    "0x10",
    true,
    {},
    [],
  ]) {
    assert.equal(
      utils.toSquareMeters(value, "hectare", config),
      null,
      String(value),
    );
    assert.equal(
      utils.fromSquareMeters(value, "hectare", config),
      null,
      String(value),
    );
  }
  for (const value of [0, "0", "0.000"]) {
    assert.equal(utils.toSquareMeters(value, "acre", config), 0);
    assert.equal(utils.fromSquareMeters(value, "acre", config), 0);
  }
  for (const factor of ["", "0", "-1", "NaN", "Infinity"]) {
    const bad = {
      default_unit: "bad",
      units: [{ value: "bad", square_meter_factor: factor }],
    };
    assert.equal(utils.getSquareMeterFactor("bad", bad), null);
    assert.equal(utils.isSupportedAreaUnit("bad", bad), false);
  }
  assert.equal(utils.toSquareMeters(Number.MAX_VALUE, "hectare", config), null);
  assert.equal(utils.fromSquareMeters(10, "unknown", config), null);
  assert.equal(utils.fromSquareMeters(10, "bigha", config), null);
  assert.equal(utils.fromSquareMeters(10, "acre", null), null);
});

test("conversion preserves calculation precision; localized display rounds only at its final boundary", () => {
  const sqm = 8000.123456789;
  const preview = utils.fromSquareMeters(sqm, "bigha_pakka", config);
  assert.ok(
    Math.abs(utils.toSquareMeters(preview, "bigha_pakka", config) - sqm) <
      1e-10,
  );
  assert.ok(preview.toString().split(".")[1].length > 3);
  assert.equal(utils.formatArea(0, "en"), "0.000");
  assert.equal(
    utils.formatArea("12345.6789", "hi"),
    new Intl.NumberFormat("hi", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(12345.6789),
  );
  assert.equal(utils.formatArea(null, "en"), null);
  assert.equal(utils.fromSquareMeters(sqm, "hectare", config), sqm / 10000);
});

test("labels use backend English/Hindi data and only the verified ha alias is resolved", () => {
  assert.equal(
    utils.getAreaUnitLabel("bigha_pakka", config, "en"),
    "Pakka Bigha",
  );
  assert.equal(
    utils.getAreaUnitLabel("bigha_kaccha", config, "hi"),
    "कच्चा बीघा",
  );
  assert.equal(utils.getAreaUnitLabel("ha", config, "en"), "Hectare");
  assert.equal(utils.resolvePreferredAreaUnit("ha", config), "hectare");
  assert.equal(utils.resolvePreferredAreaUnit(null, config), "hectare");
  assert.equal(
    utils.resolvePreferredAreaUnit("bigha_pakka", config),
    "bigha_pakka",
  );
  for (const legacy of ["bigha", "metric", "imperial", "unknown"]) {
    assert.equal(utils.resolvePreferredAreaUnit(legacy, config), null);
    assert.equal(utils.convertArea(4, legacy, "hectare", config), null);
  }
  assert.equal(
    utils.isSupportedAreaUnit("ha", config),
    false,
    "new writes use configured codes",
  );
});

function cacheHarness(lookup) {
  const effects = [],
    unsubscriptions = [];
  let calls = 0,
    notifications = 0;
  const Hook = load("src/hooks/useAreaUnits.ts", {
    react: {
      useCallback: (fn) => fn,
      useEffect: (fn) => effects.push(fn),
      useSyncExternalStore: (subscribe, snapshot) => {
        unsubscriptions.push(subscribe(() => notifications++));
        return snapshot();
      },
      startTransition: (fn) => fn(),
    },
    "next-intl": intl(),
    "@/lib/areaUnits": utils,
    "@/actions/account/users": {
      getAreaUnits: () => {
        calls++;
        return lookup(calls);
      },
    },
  }).default;
  return {
    render() {
      const result = Hook();
      effects.splice(0).forEach((fn) => fn());
      return result;
    },
    get calls() {
      return calls;
    },
    get notifications() {
      return notifications;
    },
    cleanup() {
      unsubscriptions.forEach((fn) => fn());
    },
  };
}

test("concurrent metadata consumers and later Account navigation reuse one successful request", async () => {
  let resolve;
  const h = cacheHarness(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  assert.equal(h.render().status, "idle");
  assert.equal(h.render().status, "loading");
  assert.equal(h.calls, 1);
  resolve({ success: true, data: config });
  await tick();
  assert.deepEqual(clone(h.render().config), config);
  h.render();
  h.render();
  assert.equal(h.calls, 1);
  assert.ok(h.notifications > 0);
  h.cleanup();
});

test("metadata failure supports explicit retry and retains the last valid configuration on refresh failure", async () => {
  const h = cacheHarness(async (call) =>
    call === 2 ? { success: true, data: config } : { success: false },
  );
  h.render();
  await tick();
  assert.equal(h.render().status, "error");
  assert.equal(h.render().config, null);
  assert.equal(h.calls, 1, "rerenders do not create a failure loop");
  h.render().retry();
  await tick();
  assert.equal(h.render().status, "ready");
  h.render().retry();
  await tick();
  assert.equal(h.render().status, "error");
  assert.deepEqual(clone(h.render().config), config);
  assert.equal(h.calls, 3);
  h.cleanup();
});

test("metadata thrown failures remain retryable without fabricating default factors", async () => {
  const h = cacheHarness(async () => {
    throw Error("offline");
  });
  h.render();
  await tick();
  assert.equal(h.render().status, "error");
  assert.equal(h.render().config, null);
  assert.equal(
    utils.fromSquareMeters(10000, "hectare", h.render().config),
    null,
  );
  h.cleanup();
});

test("shared controlled selector shows all configured standards and backend definitions in both locales", () => {
  for (const locale of ["en", "hi"]) {
    const Component = load("src/components/common/AreaUnitSelect.tsx", {
      "next-intl": intl(locale),
      "@/components/admin/form/Select": "Select",
      "@/hooks/useAreaUnits": { __esModule: true, default: () => metadata },
      "@/lib/areaUnits": utils,
    }).default;
    let selected;
    const tree = Component({
      id: "unit",
      value: "bigha_pakka",
      onChange: (value) => (selected = value),
    });
    const select = nodes(tree).find((node) => node.type === "Select");
    assert.equal(select.props.value, "bigha_pakka");
    assert.equal(select.props.options.length, config.units.length);
    assert.equal(
      select.props.options.some((entry) => entry.value === "bigha"),
      false,
    );
    assert.match(select.props.options[0].label, /17424 square feet/);
    assert.match(
      select.props.options[1].label,
      locale === "hi" ? /पक्का बीघा/ : /Pakka Bigha/,
    );
    select.props.onChange("guntha");
    assert.equal(selected, "guntha");
    const legacy = nodes(
      Component({
        id: "legacy",
        value: "bigha",
        onChange() {},
        error: "Choose a standard",
      }),
    );
    assert.equal(
      legacy.find((node) => node.type === "Select").props.options[0].disabled,
      true,
    );
    assert.equal(
      legacy.find((node) => node.props?.id === "legacy-error").props.role,
      "alert",
    );
  }
});

test("selector loading/error retains its value and offers retry without enabling unknown writes", () => {
  let retries = 0;
  const Component = load("src/components/common/AreaUnitSelect.tsx", {
    "next-intl": intl(),
    "@/components/admin/form/Select": "Select",
    "@/hooks/useAreaUnits": {
      __esModule: true,
      default: () => ({
        config: null,
        status: "error",
        label: metadata.label,
        retry: () => retries++,
      }),
    },
    "@/lib/areaUnits": utils,
  }).default;
  const tree = nodes(Component({ id: "unit", value: "acre", onChange() {} }));
  const select = tree.find((node) => node.type === "Select");
  assert.equal(select.props.disabled, true);
  assert.equal(select.props.value, "acre");
  tree.find((node) => node.type === "button").props.onClick();
  assert.equal(retries, 1);
});

test("area metadata uses the authenticated apiRequest path and an authenticated action with shared error handling", async () => {
  const calls = [];
  const api = load("src/lib/apis/account/users.ts", {
    "@/lib/api/request": {
      apiRequest: async (...args) => {
        calls.push(clone(args));
        return { status: true, data: config };
      },
    },
  }).accountUsersAPI;
  let guards = 0,
    caught;
  const actions = load("src/actions/account/users.ts", {
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/userAuth/dal": {
      requireUser: async () => {
        guards++;
      },
    },
    "@/lib/apis/account/users": { accountUsersAPI: api },
    "@/lib/userAuth/session": {},
    "@/lib/api/handleActionError": {
      handleActionError: async (error) => {
        caught = error;
        return { success: false };
      },
    },
  });
  const result = await actions.getAreaUnits();
  assert.equal(guards, 1);
  assert.equal(result.success, true);
  assert.deepEqual(calls, [["/account/area-units", { audience: "web" }]]);
  api.areaUnits = async () => {
    throw Error("offline");
  };
  assert.equal((await actions.getAreaUnits()).success, false);
  assert.equal(caught.message, "offline");
});

test("all area interface messages and interpolations match in English and Hindi", () => {
  const en = JSON.parse(
    fs.readFileSync("src/messages/en.json", "utf8"),
  ).areaUnits;
  const hi = JSON.parse(
    fs.readFileSync("src/messages/hi.json", "utf8"),
  ).areaUnits;
  assert.deepEqual(Object.keys(en), Object.keys(hi));
  for (const key of Object.keys(en)) {
    assert.deepEqual(en[key].match(/\{\w+\}/g), hi[key].match(/\{\w+\}/g), key);
    assert.match(hi[key], /[\u0900-\u097f]/, key);
  }
});
