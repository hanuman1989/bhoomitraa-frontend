const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const areaFixture = require("./helpers/areaUnits.cjs");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");
const { createTranslator } = require("next-intl");
const base =
  "src/app/[locale]/(account)/account/(protected)/profile/_components/";
const clone = (value) => JSON.parse(JSON.stringify(value));
const icons = new Proxy({}, { get: (_, key) => String(key) });
const tick = () => new Promise((resolve) => setImmediate(resolve));
const translations = new Map();
const intl = {
  useTranslations(namespace) {
    if (!translations.has(namespace))
      translations.set(
        namespace,
        createTranslator({
          locale: "en",
          messages: JSON.parse(fs.readFileSync("src/messages/en.json", "utf8")),
          namespace,
        }),
      );
    return translations.get(namespace);
  },
};
function load(file, dependencies = {}) {
  const moduleObject = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: moduleObject,
    exports: moduleObject.exports,
    require(name) {
      if (name === "server-only") return {};
      if (name === "react/jsx-runtime") return jsx;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (Object.hasOwn(areaFixture.dependencies, name))
        return areaFixture.dependencies[name];
      if (name === "react-hook-form")
        return { useWatch: ({ control, name }) => control.values[name] };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return moduleObject.exports;
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function textContent(tree) {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(textContent).join(" ");
  return tree && typeof tree === "object"
    ? textContent(tree.props?.children)
    : "";
}
function runtime() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = {
          value: typeof initial === "function" ? initial() : initial,
        };
      return [
        slots[index].value,
        (value) => {
          slots[index].value =
            typeof value === "function" ? value(slots[index].value) : value;
        },
      ];
    },
    useRef(value) {
      const index = cursor++;
      return (slots[index] ??= { current: value });
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const prior = slots[index];
      if (
        !prior ||
        dependencies.some(
          (value, position) => value !== prior.dependencies[position],
        )
      )
        effects.push(() => {
          prior?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
    },
  };
  return {
    react,
    render(Component, props) {
      cursor = 0;
      const tree = Component(props);
      const pending = effects;
      effects = [];
      pending.forEach((effect) => effect());
      return tree;
    },
    cleanup() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
function form(defaultValues) {
  const values = { ...defaultValues };
  const rules = {};
  const api = {
    values,
    rules,
    control: { values },
    formState: { errors: {}, isSubmitting: false },
    register(name, validation = {}) {
      rules[name] = validation;
      return {
        name,
        onChange(event) {
          values[name] = event.target.value;
          validation.onChange?.(event);
        },
      };
    },
    setValue(name, value) {
      values[name] = value;
    },
    getValues(name) {
      return name ? values[name] : { ...values };
    },
    clearErrors(name) {
      delete api.formState.errors[name];
    },
    setError(name, error) {
      api.formState.errors[name] = error;
    },
    handleSubmit(callback) {
      return async () => callback({ ...values });
    },
  };
  return api;
}
const user = {
  id: 7,
  first_name: "Mohan",
  last_name: "Singh",
  mobile: "9876543210",
  email: "farmer@example.test",
  email_verified_at: null,
  status: true,
  farmer_profile: {
    id: 8,
    profile_image: null,
    state_id: 10,
    district_id: 20,
    state: { id: 10, name: "Saved State" },
    district: { id: 20, name: "Saved District" },
    village: "Saved Village",
    address: "Saved address",
    pincode: "302001",
    preferred_language: "hi",
    preferred_units: "bigha_pakka",
  },
};
const personalValues = {
  first_name: "Mohan",
  last_name: "Singh",
  preferred_language: "hi",
  preferred_units: "bigha_pakka",
};
function dialogHarness(overrides = {}) {
  const hooks = runtime();
  const forms = [];
  const calls = {
    personal: [],
    location: [],
    auth: [],
    success: [],
    error: [],
    closed: 0,
  };
  let currentUser = clone(user);
  const Component = load(base + "UpdateProfileDialog.tsx", {
    react: hooks.react,
    "react-hook-form": {
      useForm(options) {
        return hooks.react.useState(() => {
          const value = form(options.defaultValues);
          forms.push(value);
          return value;
        })[0];
      },
    },
    "next-intl": intl,
    "react-hot-toast": {
      success: (message) => calls.success.push(message),
      error: (message) => calls.error.push(message),
    },
    "@headlessui/react": {
      Dialog: "Dialog",
      DialogBackdrop: "Backdrop",
      DialogPanel: "Panel",
      DialogTitle: "Title",
      Description: "Description",
    },
    "@/icons": icons,
    "@/hooks/useUserAuth": {
      useUserAuth: () => ({
        setAuth(value) {
          currentUser = value;
          calls.auth.push(value);
        },
      }),
    },
    "@/actions/account/users": {
      updatePersonalDetails: async (values) => {
        calls.personal.push(clone(values));
        return overrides.personal
          ? overrides.personal(values)
          : {
              success: true,
              data: {
                ...currentUser,
                first_name: values.first_name,
                last_name: values.last_name,
                farmer_profile: {
                  ...currentUser.farmer_profile,
                  preferred_units: values.preferred_units,
                  preferred_language: values.preferred_language,
                },
              },
            };
      },
      updateLocationDetails: async (values) => {
        calls.location.push(clone(values));
        return overrides.location
          ? overrides.location(values)
          : {
              success: true,
              data: {
                ...currentUser,
                farmer_profile: { ...currentUser.farmer_profile, ...values },
              },
            };
      },
    },
    "./PersonalDetailsStep": "Personal",
    "./LocationDetailsStep": "Location",
    "./ProfileStepIndicator": "Stepper",
  }).default;
  return {
    calls,
    forms,
    get user() {
      return currentUser;
    },
    render: () =>
      hooks.render(Component, {
        user: currentUser,
        initials: "MS",
        onClose: () => calls.closed++,
      }),
  };
}
const submit = (tree) =>
  nodes(tree)
    .find((node) => node.type === "form")
    .props.onSubmit({ preventDefault() {} });

test("profile mutations use the verified PATCH endpoints and Farmer cookie audience; public region queries are paginated", async () => {
  const calls = [];
  const api = load("src/lib/apis/account/users.ts", {
    "@/lib/api/request": {
      apiRequest: async (...args) => {
        calls.push(clone(args));
        return {};
      },
    },
  }).accountUsersAPI;
  await api.updatePersonalDetails(personalValues);
  await api.updateLocationDetails({
    state_id: 10,
    district_id: 20,
    village: "Village",
    address: null,
    pincode: null,
  });
  await api.profileRegions();
  await api.profileRegions(10, 2);
  assert.deepEqual(
    calls
      .slice(0, 2)
      .map(([path, options]) => [path, options.method, options.audience]),
    [
      ["/account/profile/personal", "PATCH", "web"],
      ["/account/profile/location", "PATCH", "web"],
    ],
  );
  assert.equal(calls[2][0], "/regions");
  assert.equal(calls[2][1].audience, "public");
  assert.deepEqual(calls[3][1].params, {
    region_type: "district",
    parent_id: 10,
    is_active: 1,
    per_page: 100,
    page: 2,
  });
});

function actionsHarness(overrides = {}) {
  const calls = { guard: 0, personal: [], location: [], regions: [] };
  const api = {
    updatePersonalDetails: async (values) => {
      calls.personal.push(clone(values));
      return { status: true, data: user };
    },
    updateLocationDetails: async (values) => {
      calls.location.push(clone(values));
      return { status: true, data: user };
    },
    profileRegions: async (stateId, page = 1) => {
      calls.regions.push([stateId, page]);
      return {
        status: true,
        data: [{ id: page }],
        pagination: { last_page: 2 },
      };
    },
    ...overrides.api,
  };
  const ApiError = load("src/lib/api/ApiError.ts").ApiError;
  const errorHandler = load("src/lib/api/handleActionError.ts", {
    "@/lib/api/ApiError": { ApiError },
    "next/navigation": {
      unstable_rethrow(error) {
        if (error?.message === "NEXT_REDIRECT") throw error;
      },
    },
    "next-intl/server": { getTranslations: async () => (key) => key },
  });
  const actions = load("src/actions/account/users.ts", {
    "next-intl/server": { getTranslations: async () => (key) => key },
    "@/lib/userAuth/dal": {
      requireUser: async () => {
        calls.guard++;
        if (overrides.denied) throw new Error("NEXT_REDIRECT");
        return user;
      },
    },
    "@/lib/api/handleActionError": errorHandler,
    "@/lib/userAuth/session": { clearUserToken() {} },
    "@/lib/apis/account/users": { accountUsersAPI: api },
  });
  return { calls, actions, ApiError, api };
}

test("both actions authenticate, allowlist writable fields and return the full authoritative user/profile", async () => {
  const h = actionsHarness();
  const personal = await h.actions.updatePersonalDetails({
    ...personalValues,
    email: "injected",
    mobile: "injected",
    user_id: 99,
    status: false,
  });
  assert.deepEqual(h.calls.personal, [personalValues]);
  assert.deepEqual(clone(personal.data), user);
  const values = {
    state_id: 10,
    district_id: 20,
    village: "Village",
    address: null,
    pincode: null,
  };
  await h.actions.updateLocationDetails({
    ...values,
    first_name: "injected",
    preferred_units: "injected",
    user_id: 99,
  });
  assert.deepEqual(h.calls.location, [values]);
  assert.equal(h.calls.guard, 2);
});

test("unauthorized actions preserve Next redirects and never call a mutation or region API", async () => {
  const h = actionsHarness({ denied: true });
  await assert.rejects(
    h.actions.updatePersonalDetails(personalValues),
    /NEXT_REDIRECT/,
  );
  await assert.rejects(h.actions.updateLocationDetails({}), /NEXT_REDIRECT/);
  await assert.rejects(h.actions.getProfileRegions(), /NEXT_REDIRECT/);
  assert.equal(
    h.calls.personal.length + h.calls.location.length + h.calls.regions.length,
    0,
  );
});

test("region lookup collects every backend page without using Admin endpoints", async () => {
  const h = actionsHarness();
  const result = await h.actions.getProfileRegions(10);
  assert.deepEqual(clone(result.data), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(h.calls.regions, [
    [10, 1],
    [10, 2],
  ]);
  assert.equal(h.calls.guard, 1);
});

test("profile actions keep 422 field errors, translate auth/rate/network failures and hide server details", async () => {
  const h = actionsHarness();
  for (const [status, expected] of [
    [401, "unauthenticated"],
    [403, "forbidden"],
    [429, "tooManyRequests"],
    [503, "unavailable"],
    [500, "saveFailed"],
  ]) {
    h.api.updatePersonalDetails = async () => {
      throw new h.ApiError("private backend failure", status);
    };
    assert.equal(
      (await h.actions.updatePersonalDetails(personalValues)).message,
      expected,
    );
  }
  h.api.updateLocationDetails = async () => {
    throw new h.ApiError("Validation failed", 422, {
      district_id: ["Wrong state"],
    });
  };
  assert.deepEqual(clone((await h.actions.updateLocationDetails({})).errors), {
    district_id: ["Wrong state"],
  });
  h.api.updatePersonalDetails = async () => {
    throw new Error("private network detail");
  };
  assert.equal(
    (await h.actions.updatePersonalDetails(personalValues)).message,
    "saveFailed",
  );
});

test("Step 1 persists before advancing and Cancel retains its saved user changes", async () => {
  const h = dialogHarness();
  let tree = h.render();
  h.forms[0].values.first_name = "  Updated  ";
  await submit(tree);
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Stepper").props.step,
    2,
  );
  assert.equal(h.calls.personal[0].first_name, "Updated");
  assert.equal(h.user.first_name, "Updated");
  assert.equal(h.calls.location.length, 0);
  assert.equal(
    nodes(tree).find((node) => node.type === "Stepper").props.personalSaved,
    true,
  );
  h.forms[1].values.village = "Unsaved village";
  tree.props.onClose();
  assert.equal(h.calls.closed, 1);
  assert.equal(h.user.farmer_profile.village, "Saved Village");
  assert.equal(h.user.first_name, "Updated");
});

test("Skip on Step 1 opens the saved location without validating or saving personal drafts", async () => {
  const h = dialogHarness();
  let tree = h.render();
  h.forms[0].values.first_name = "";
  h.forms[0].values.preferred_units = "";
  h.forms[0].setError("first_name", { message: "Required" });
  const skip = nodes(tree).find(
    (node) => node.type === "button" && textContent(node) === "Skip",
  );
  assert.equal(skip.props.type, "button");
  skip.props.onClick();
  tree = h.render();
  const progress = nodes(tree).find((node) => node.type === "Stepper");
  assert.equal(progress.props.step, 2);
  assert.equal(progress.props.personalSaved, false);
  assert.equal(h.forms[1].values.state_id, "10");
  assert.equal(h.forms[1].values.district_id, "20");
  assert.equal(h.calls.personal.length, 0);
  assert.equal(h.calls.auth.length, 0);
  h.forms[1].values.village = "Updated location only";
  await submit(tree);
  assert.equal(h.calls.location.length, 1);
  assert.equal(h.calls.personal.length, 0);
  assert.equal(h.user.first_name, user.first_name);
  assert.equal(h.user.farmer_profile.village, "Updated location only");
  assert.equal(h.calls.closed, 1);
});

test("Skip on both steps closes without mutations, Redux updates or success notifications", () => {
  const h = dialogHarness();
  let tree = h.render();
  nodes(tree)
    .find((node) => node.type === "button" && textContent(node) === "Skip")
    .props.onClick();
  tree = h.render();
  h.forms[1].values.village = "Unsaved location";
  nodes(tree)
    .find((node) => node.type === "button" && textContent(node) === "Skip")
    .props.onClick();
  assert.equal(h.calls.closed, 1);
  assert.equal(h.calls.personal.length, 0);
  assert.equal(h.calls.location.length, 0);
  assert.equal(h.calls.auth.length, 0);
  assert.equal(h.calls.success.length, 0);
  assert.equal(h.user.farmer_profile.village, "Saved Village");
});

test("Skip on Step 2 keeps saved personal details and discards the unsaved location draft", async () => {
  const h = dialogHarness();
  let tree = h.render();
  h.forms[0].values.first_name = "Saved name";
  await submit(tree);
  tree = h.render();
  h.forms[1].values.state_id = "11";
  h.forms[1].values.district_id = "21";
  h.forms[1].values.village = "Unsaved village";
  nodes(tree)
    .find((node) => node.type === "button" && textContent(node) === "Skip")
    .props.onClick();
  assert.equal(h.calls.closed, 1);
  assert.equal(h.calls.personal.length, 1);
  assert.equal(h.calls.location.length, 0);
  assert.equal(h.user.first_name, "Saved name");
  assert.equal(h.user.farmer_profile.state_id, 10);
  assert.equal(h.user.farmer_profile.district_id, 20);
  assert.equal(h.user.farmer_profile.village, "Saved Village");
});

test("failed Step 1 stays open with mapped errors and preserves every draft value", async () => {
  const h = dialogHarness({
    personal: async () => ({
      success: false,
      message: "Try again",
      errors: { first_name: ["Invalid name"] },
    }),
  });
  let tree = h.render();
  h.forms[0].values.first_name = "Draft";
  await submit(tree);
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Stepper").props.step,
    1,
  );
  assert.equal(h.forms[0].formState.errors.first_name.message, "Invalid name");
  assert.equal(h.forms[0].values.first_name, "Draft");
  assert.equal(h.calls.closed, 0);
  assert.equal(h.calls.auth.length, 0);
  assert.equal(h.calls.error.length, 1);
});

test("pending saves block duplicate requests and all dismissal paths", async () => {
  let resolve;
  const response = new Promise((done) => {
    resolve = done;
  });
  const h = dialogHarness({ personal: () => response });
  const tree = h.render();
  const first = submit(tree);
  await submit(tree);
  tree.props.onClose();
  nodes(tree)
    .find((node) => node.type === "button" && textContent(node) === "Skip")
    .props.onClick();
  assert.equal(h.calls.personal.length, 1);
  assert.equal(h.calls.closed, 0);
  assert.equal(
    nodes(h.render()).find((node) => node.type === "Stepper").props.step,
    1,
  );
  resolve({ success: true, data: user });
  await first;
});

test("Previous preserves both drafts; revised personal details save again; final location response refreshes Redux and closes", async () => {
  const h = dialogHarness();
  let tree = h.render();
  await submit(tree);
  tree = h.render();
  h.forms[1].values.village = "New Village";
  nodes(tree)
    .find(
      (node) =>
        node.type === "button" && textContent(node).includes("Previous"),
    )
    .props.onClick();
  tree = h.render();
  assert.equal(h.calls.personal.length, 1);
  assert.equal(h.calls.location.length, 0);
  h.forms[0].values.last_name = "Changed";
  await submit(tree);
  tree = h.render();
  assert.equal(h.calls.personal.length, 2);
  assert.equal(h.forms[1].values.village, "New Village");
  await submit(tree);
  assert.equal(h.calls.location.length, 1);
  assert.equal(h.user.last_name, "Changed");
  assert.equal(h.user.farmer_profile.village, "New Village");
  assert.equal(h.calls.closed, 1);
  assert.equal(h.calls.success.at(-1), "Profile updated successfully.");
});

test("failed location save remains on Step 2 and keeps Step 1 persisted for retry", async () => {
  const h = dialogHarness({
    location: async () => ({
      success: false,
      message: "Location failed",
      errors: { district_id: ["Wrong district"] },
    }),
  });
  let tree = h.render();
  h.forms[0].values.first_name = "Saved personal";
  await submit(tree);
  tree = h.render();
  h.forms[1].values.address = "Draft address";
  await submit(tree);
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.type === "Stepper").props.step,
    2,
  );
  assert.equal(h.forms[1].values.address, "Draft address");
  assert.equal(
    h.forms[1].formState.errors.district_id.message,
    "Wrong district",
  );
  assert.equal(h.user.first_name, "Saved personal");
  assert.equal(h.calls.closed, 0);
});

test("personal fields validate Unicode names and supported preferences while email/mobile remain unregistered and read-only", () => {
  const personal = form({ ...personalValues });
  const Component = load(base + "PersonalDetailsStep.tsx", {
    "next-intl": intl,
    "@/icons": icons,
    "@/i18n/routing": { routing: { locales: ["en", "hi"] } },
    "@/components/admin/form/input/InputField": "Input",
    "@/components/admin/form/Label": "Label",
  }).default;
  const tree = Component({ form: personal, user, disabled: false });
  assert.equal(
    personal.rules.first_name.validate("  "),
    "Enter your first name.",
  );
  assert.equal(personal.rules.last_name.validate("यादव"), true);
  assert.equal(personal.rules.first_name.maxLength.value, 100);
  assert.equal(
    personal.rules.preferred_language.validate("ar"),
    "Select a supported language.",
  );
  assert.equal(personal.rules.preferred_units.validate("hectare"), true);
  assert.equal(personal.rules.preferred_units.validate("sqm"), true);
  assert.equal(
    personal.rules.preferred_units.validate("bigha"),
    "Select a supported area unit.",
  );
  for (const id of ["profile-email", "profile-mobile"]) {
    const input = nodes(tree).find((node) => node.props?.id === id);
    assert.equal(input.props.readOnly, true);
    assert.equal(input.props.name, undefined);
  }
  assert.deepEqual(Object.keys(personal.rules), [
    "first_name",
    "last_name",
    "preferred_language",
    "preferred_units",
  ]);
});

function locationHarness(
  profile = user.farmer_profile,
  lookup = async () => ({ success: true, data: [] }),
) {
  const hooks = runtime();
  const fields = form({
    state_id: String(profile?.state_id ?? ""),
    district_id: String(profile?.district_id ?? ""),
    village: "Village",
    address: "",
    pincode: "",
  });
  const calls = [];
  const Component = load(base + "LocationDetailsStep.tsx", {
    react: hooks.react,
    "react-hook-form": {
      useWatch: ({ control, name }) => control.values[name],
    },
    "next-intl": intl,
    "@/icons": icons,
    "@/components/admin/form/input/InputField": "Input",
    "@/components/admin/form/Label": "Label",
    "@/actions/account/users": {
      getProfileRegions: async (stateId) => {
        calls.push(stateId);
        return lookup(stateId);
      },
    },
  }).default;
  return {
    hooks,
    fields,
    calls,
    render: () =>
      hooks.render(Component, { form: fields, profile, disabled: false }),
  };
}

test("saved State and District remain selected when asynchronous options replace the initial options", async () => {
  for (const profile of [
    user.farmer_profile,
    { ...user.farmer_profile, state: null, district: null },
  ]) {
    let resolveStates;
    let resolveDistricts;
    const states = new Promise((resolve) => {
      resolveStates = resolve;
    });
    const districts = new Promise((resolve) => {
      resolveDistricts = resolve;
    });
    const h = locationHarness(profile, (stateId) =>
      stateId === undefined ? states : districts,
    );
    let tree = h.render();
    if (profile.state) {
      assert.match(
        renderToStaticMarkup(
          nodes(tree).find((node) => node.props?.id === "profile-state"),
        ),
        /<option value="10" selected="">Saved State<\/option>/,
      );
      assert.match(
        renderToStaticMarkup(
          nodes(tree).find((node) => node.props?.id === "profile-district"),
        ),
        /<option value="20" selected="">Saved District<\/option>/,
      );
    }
    resolveStates({
      success: true,
      data: [
        { id: 11, name: "Another state" },
        { id: 10, name: "Loaded saved state" },
      ],
    });
    resolveDistricts({
      success: true,
      data: [
        { id: 21, parent_id: 10, name: "Another district" },
        { id: 20, parent_id: 10, name: "Loaded saved district" },
      ],
    });
    await tick();
    tree = h.render();
    assert.match(
      renderToStaticMarkup(
        nodes(tree).find((node) => node.props?.id === "profile-state"),
      ),
      /<option value="10" selected="">Loaded saved state<\/option>/,
    );
    assert.match(
      renderToStaticMarkup(
        nodes(tree).find((node) => node.props?.id === "profile-district"),
      ),
      /<option value="20" selected="">Loaded saved district<\/option>/,
    );
    assert.equal(h.fields.values.state_id, "10");
    assert.equal(h.fields.values.district_id, "20");
    h.hooks.cleanup();
  }
});

test("location validation requires the matching district, preserves saved inactive selections and uses text PIN input", async () => {
  const h = locationHarness();
  h.render();
  await tick();
  const tree = h.render();
  assert.equal(h.fields.rules.state_id.validate("10"), true);
  assert.equal(h.fields.rules.district_id.validate("20"), true);
  assert.notEqual(h.fields.rules.district_id.validate("999"), true);
  assert.notEqual(h.fields.rules.village.validate("   "), true);
  assert.equal(h.fields.rules.village.maxLength.value, 150);
  assert.equal(h.fields.rules.address.maxLength.value, 500);
  for (const value of ["", "302001"])
    assert.equal(h.fields.rules.pincode.validate(value), true);
  for (const value of ["012345", "12345", "1234567", "ABC123"])
    assert.notEqual(h.fields.rules.pincode.validate(value), true);
  const pin = nodes(tree).find((node) => node.props?.id === "profile-pincode");
  assert.equal(pin.props.type, "text");
  assert.equal(pin.props.inputMode, "numeric");
  h.hooks.cleanup();
});

test("changing state clears its district, ignores stale responses and accepts only districts under the new state", async () => {
  let resolveOld;
  let resolveNew;
  const old = new Promise((resolve) => {
    resolveOld = resolve;
  });
  const next = new Promise((resolve) => {
    resolveNew = resolve;
  });
  const h = locationHarness(user.farmer_profile, (id) =>
    id === undefined
      ? Promise.resolve({
          success: true,
          data: [
            { id: 10, name: "Old" },
            { id: 11, name: "New" },
          ],
        })
      : id === 10
        ? old
        : next,
  );
  h.render();
  await tick();
  let tree = h.render();
  nodes(tree)
    .find((node) => node.props?.id === "profile-state")
    .props.onChange({ target: { value: "11" } });
  assert.equal(h.fields.values.district_id, "");
  tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.props?.id === "profile-district").props
      .disabled,
    true,
  );
  resolveOld({
    success: true,
    data: [{ id: 20, parent_id: 10, name: "Stale district" }],
  });
  resolveNew({
    success: true,
    data: [{ id: 21, parent_id: 11, name: "New district" }],
  });
  await tick();
  tree = h.render();
  assert.equal(
    nodes(tree).some((node) => node.props?.children === "Stale district"),
    false,
  );
  assert.equal(h.fields.rules.district_id.validate("21"), true);
  assert.notEqual(h.fields.rules.district_id.validate("20"), true);
  h.hooks.cleanup();
});

test("region errors offer retry without losing the location draft; district is disabled until a state exists", async () => {
  let failed = true;
  const h = locationHarness(null, async () =>
    failed
      ? { success: false, message: "Region outage" }
      : { success: true, data: [] },
  );
  h.render();
  await tick();
  let tree = h.render();
  assert.equal(
    nodes(tree).find((node) => node.props?.id === "profile-district").props
      .disabled,
    true,
  );
  assert.ok(
    nodes(tree).some((node) => node.props?.children === "Region outage"),
  );
  h.fields.values.village = "Keep this draft";
  failed = false;
  nodes(tree)
    .find((node) => node.type === "button")
    .props.onClick();
  h.render();
  await tick();
  tree = h.render();
  assert.equal(h.calls.length, 2);
  assert.equal(h.fields.values.village, "Keep this draft");
  assert.equal(
    nodes(tree).some((node) => node.props?.children === "Region outage"),
    false,
  );
  h.hooks.cleanup();
});

test("profile reads Redux data, derives initials, omits unverified badges and opens the dialog without navigation", () => {
  const hooks = runtime();
  let current = clone(user);
  const Component = load(base + "ProfileDetails.tsx", {
    "next-intl": intl,
    "@/icons": icons,
    "@/hooks/useUserAuth": { useUserAuth: () => ({ user: current }) },
    "@/hooks/useModal": {
      useModal() {
        const [isOpen, setOpen] = hooks.react.useState(false);
        return {
          isOpen,
          openModal: () => setOpen(true),
          closeModal: () => setOpen(false),
        };
      },
    },
    "./UpdateProfileDialog": "UpdateDialog",
  }).default;
  let tree = hooks.render(Component, {});
  assert.equal(nodes(tree).filter((node) => node.type === "dl").length, 3);
  for (const value of [
    "MS",
    "Mohan Singh",
    "Saved State",
    "Saved District",
    "Saved Village",
    "Bigha",
    "Hindi",
  ])
    assert.ok(textContent(tree).includes(value));
  assert.equal(
    nodes(tree).some((node) => node.props?.children === "Email verified"),
    false,
  );
  nodes(tree)
    .find((node) => node.type === "button")
    .props.onClick();
  tree = hooks.render(Component, {});
  assert.equal(
    nodes(tree).find((node) => node.type === "UpdateDialog").props.user.id,
    user.id,
  );
  current = {
    ...current,
    first_name: "Changed",
    last_name: "Name",
    status: false,
    email_verified_at: "2026-01-01",
    farmer_profile: null,
  };
  tree = hooks.render(Component, {});
  for (const value of ["CN", "Inactive", "Email verified", "Not provided"])
    assert.ok(textContent(tree).includes(value));
  assert.equal(
    nodes(tree).some((node) => node.type === "img"),
    false,
  );
});

test("stepper marks personal details complete only after saving; Profile messages match English/Hindi structures", () => {
  const Component = load(base + "ProfileStepIndicator.tsx", {
    "next-intl": intl,
    "@/icons": icons,
  }).default;
  for (const [step, personalSaved] of [
    [1, false],
    [2, false],
    [2, true],
    [1, true],
  ]) {
    const tree = Component({ step, personalSaved });
    assert.equal(
      nodes(tree).filter((node) => node.props?.["aria-current"] === "step")
        .length,
      1,
    );
    assert.equal(
      nodes(tree).some((node) => node.type === "CheckLineIcon"),
      step === 2 && personalSaved,
    );
  }
  const en = JSON.parse(
    fs.readFileSync("src/messages/en.json", "utf8"),
  ).farmerProfile;
  const hi = JSON.parse(
    fs.readFileSync("src/messages/hi.json", "utf8"),
  ).farmerProfile;
  const keys = (value, prefix = "") =>
    Object.entries(value).flatMap(([key, item]) =>
      typeof item === "object" ? keys(item, prefix + key + ".") : prefix + key,
    );
  assert.deepEqual(keys(en), keys(hi));
  assert.match(hi.feedback.saved, /प्रोफ़ाइल/);
});
