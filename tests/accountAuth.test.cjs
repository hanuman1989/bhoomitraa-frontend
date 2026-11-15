const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const toolkit = require("@reduxjs/toolkit");
const root = "src/app/[locale]/(account)/account/";
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(file, dependencies = {}, globals = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    URL,
    URLSearchParams,
    Date,
    ...globals,
    require(name) {
      if (name === "server-only") return {};
      if (name === "react/jsx-runtime") return jsx;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected dependency ${name} in ${file}`);
    },
  });
  return mod.exports;
}
const ApiError = load("src/lib/api/ApiError.ts").ApiError;
const t = (key) => key;
t.rich = (key) => key;
const intl = { useTranslations: () => t };
const serverIntl = {
  getTranslations: async () => t,
  getLocale: async () => "hi",
  setRequestLocale() {},
};
const user = {
  id: 4,
  first_name: "Farmer",
  last_name: "Test",
  mobile: "9876543210",
  email: null,
  status: true,
};
const loginData = {
  user,
  access_token: "test-server-token",
  token_type: "Bearer",
  expires_at: "2099-01-01T00:00:00Z",
};
const response = (data = null) => ({
  status: true,
  data,
  message: "Backend message",
});
const errorHandler = {
  handleActionError: async (error, fallback) => ({
    success: false,
    message: fallback,
    ...(error.errors && { errors: error.errors }),
  }),
};

test("all six APIs use only apiRequest, the verified paths and the correct cookie audience", async () => {
  const calls = [];
  const dependencies = {
    "@/lib/api/request": {
      apiRequest: async (...args) => {
        calls.push(clone(args));
        return response();
      },
    },
  };
  const auth = load(
    "src/lib/apis/account/auth.ts",
    dependencies,
  ).accountAuthAPI;
  const users = load(
    "src/lib/apis/account/users.ts",
    dependencies,
  ).accountUsersAPI;
  await auth.login({ login: user.mobile, password: "legacy" });
  await auth.me();
  await auth.logout();
  await users.register({ first_name: "A" });
  await users.forgotPassword({ email: "a@example.test" });
  await users.resetPassword({ token: "link-token" });
  assert.deepEqual(
    calls.map(([path, options]) => [
      path,
      options.method || "GET",
      options.audience,
    ]),
    [
      ["/account/login", "POST", "public"],
      ["/account/me", "GET", "web"],
      ["/account/logout", "POST", "web"],
      ["/account/register", "POST", "public"],
      ["/account/forgot-password", "POST", "public"],
      ["/account/reset-password", "POST", "public"],
    ],
  );
  assert.equal(calls[1][1].data, undefined);
  assert.equal(calls[2][1].data, undefined);
  assert.deepEqual(calls[0][1].data, {
    login: user.mobile,
    password: "legacy",
  });
});

function sessionHarness(env = "production") {
  const values = new Map([
    ["admin_access_token", "admin-token"],
    ["web_access_token", "farmer-token"],
  ]);
  const written = [];
  const session = load(
    "src/lib/userAuth/session.ts",
    {
      "next/headers": {
        cookies: async () => ({
          get: (name) =>
            values.has(name) ? { value: values.get(name) } : undefined,
          set: (...args) => {
            written.push(args);
            values.set(args[0], args[1]);
          },
          delete: (name) => values.delete(name),
        }),
      },
      "@/lib/api/ApiError": { ApiError },
      "./constants": { USER_COOKIE: "web_access_token" },
    },
    { process: { env: { NODE_ENV: env } } },
  );
  return { session, written, values };
}
test("Farmer cookie is HttpOnly, Secure in production, Lax and expires with Laravel", async () => {
  const { session, written } = sessionHarness();
  await session.setUserToken("new-token", loginData.expires_at);
  const [name, token, options] = written[0];
  assert.equal(name, "web_access_token");
  assert.equal(token, "new-token");
  assert.equal(
    options.expires.toISOString(),
    new Date(loginData.expires_at).toISOString(),
  );
  assert.deepEqual(
    { ...options, expires: null },
    { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: null },
  );
  assert.equal(options.maxAge, undefined);
});
test("Farmer cookie works on local HTTP and never reads or clears the Admin cookie", async () => {
  const { session, values, written } = sessionHarness("development");
  assert.equal(await session.readUserToken(), "farmer-token");
  await session.setUserToken("new-token", loginData.expires_at);
  assert.equal(written[0][2].secure, false);
  await session.clearUserToken();
  assert.equal(await session.readUserToken(), null);
  assert.equal(values.get("admin_access_token"), "admin-token");
});
test("malformed or expired token responses cannot set a cookie", async () => {
  const { session, written } = sessionHarness();
  for (const [token, expiry] of [
    ["", loginData.expires_at],
    ["x", "invalid"],
    ["x", "2000-01-01"],
  ])
    await assert.rejects(
      session.setUserToken(token, expiry),
      (error) => error.status === 502,
    );
  assert.equal(written.length, 0);
});

function authHarness(overrides = {}) {
  const calls = { cookies: [], login: [], logout: 0, handled: [] };
  const deps = {
    "next-intl/server": serverIntl,
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": {
      handleActionError: async (...args) => {
        calls.handled.push(args);
        return (overrides.errorHandler || errorHandler).handleActionError(
          ...args,
        );
      },
    },
    "@/lib/apis/account/auth": {
      accountAuthAPI: {
        login: async (data) => {
          calls.login.push(clone(data));
          return response(loginData);
        },
        logout: async () => {
          calls.logout++;
          return response();
        },
        ...overrides.api,
      },
    },
    "@/lib/userAuth/session": {
      readUserToken: async () => "farmer-token",
      setUserToken: async (...args) => calls.cookies.push(["set", ...args]),
      clearUserToken: async () => calls.cookies.push(["clear"]),
      ...overrides.session,
    },
    "@/lib/userAuth/dal": {
      getCurrentUser: async () => user,
      ...overrides.dal,
    },
  };
  return { calls, actions: load("src/actions/account/auth.ts", deps) };
}
test("login allowlists credentials, sets only server cookie and returns only Farmer data", async () => {
  const { actions, calls } = authHarness();
  const result = await actions.loginUser({
    login: user.mobile,
    mobile: "8765432109",
    email: "ignored@example.test",
    password: "legacy",
    country_code: "+91",
    remember: true,
    status: true,
  });
  assert.deepEqual(calls.login, [{ login: user.mobile, password: "legacy" }]);
  assert.deepEqual(calls.cookies, [
    ["set", loginData.access_token, loginData.expires_at],
  ]);
  assert.deepEqual(clone(result), {
    success: true,
    message: "loggedIn",
    data: user,
  });
  assert.equal(JSON.stringify(result).includes("test-server-token"), false);
});
test("invalid credentials and inactive accounts cannot populate Farmer state or cookies", async () => {
  for (const status of [401, 403]) {
    const { actions, calls } = authHarness({
      api: {
        login: async () => {
          throw new ApiError("Sensitive", status);
        },
      },
    });
    assert.equal((await actions.loginUser({})).message, "credentials");
    assert.equal(calls.cookies.length, 0);
  }
  const { actions, calls } = authHarness({
    api: {
      login: async () =>
        response({ ...loginData, user: { ...user, status: false } }),
    },
  });
  assert.equal((await actions.loginUser({})).success, false);
  assert.equal(calls.cookies.length, 0);
});
test("login validation failures use the shared handler and preserve field errors", async () => {
  const errors = { login: ["Invalid identifier"], password: ["Required"] };
  const { actions, calls } = authHarness({
    api: {
      login: async () => {
        throw new ApiError("Validation", 422, errors);
      },
    },
  });
  const result = await actions.loginUser({});
  assert.deepEqual(clone(result.errors), errors);
  assert.equal(calls.handled.length, 1);
});
test("login keeps shared translated rate-limit/network errors and hides server details", async () => {
  const sharedHandler = load("src/lib/api/handleActionError.ts", {
    "next/navigation": { unstable_rethrow() {} },
    "next-intl/server": serverIntl,
    "@/lib/api/ApiError": { ApiError },
  });
  for (const [error, expected] of [
    [new ApiError("Internal throttle details", 429), "tooManyRequests"],
    [new ApiError("Internal server details", 500), "loginFailed"],
    [new ApiError("Internal service details", 503), "unavailable"],
    [new Error("Internal network details"), "loginFailed"],
  ]) {
    const { actions, calls } = authHarness({
      errorHandler: sharedHandler,
      api: {
        login: async () => {
          throw error;
        },
      },
    });
    const result = await actions.loginUser({
      login: "farmer@example.test",
      password: "legacy",
    });
    assert.equal(result.success, false);
    assert.equal(result.message, expected);
    assert.equal(calls.cookies.length, 0);
    assert.equal(JSON.stringify(result).includes("Internal"), false);
  }
});
test("Me returns Farmer data; expired Me clears only the Farmer session", async () => {
  const valid = authHarness();
  assert.deepEqual(
    clone((await valid.actions.getAuthenticatedUser()).data),
    user,
  );
  assert.equal(valid.calls.cookies.length, 0);
  const expired = authHarness({ dal: { getCurrentUser: async () => null } });
  assert.deepEqual(clone(await expired.actions.getAuthenticatedUser()), {
    success: true,
    message: "",
    data: null,
  });
  assert.deepEqual(expired.calls.cookies, [["clear"]]);
});
test("Me infrastructure failures preserve the local session for retry", async () => {
  const { actions, calls } = authHarness({
    dal: {
      getCurrentUser: async () => {
        throw new ApiError("Internal", 503);
      },
    },
  });
  assert.equal((await actions.getAuthenticatedUser()).success, false);
  assert.equal(calls.cookies.length, 0);
});
test("logout calls the verified revoke endpoint and clears local Farmer session", async () => {
  const { actions, calls } = authHarness();
  assert.equal((await actions.logoutUser()).success, true);
  assert.equal(calls.logout, 1);
  assert.deepEqual(calls.cookies, [["clear"]]);
});
test("logout handles already-expired tokens and reports outages while clearing local Farmer cookie", async () => {
  for (const status of [401, 403, 419, 503]) {
    const { actions, calls } = authHarness({
      api: {
        logout: async () => {
          throw new ApiError("Internal", status);
        },
      },
    });
    assert.equal((await actions.logoutUser()).success, status !== 503);
    assert.deepEqual(calls.cookies, [["clear"]]);
  }
  const guest = authHarness({ session: { readUserToken: async () => null } });
  await guest.actions.logoutUser();
  assert.equal(guest.calls.logout, 0);
});

function usersHarness(api = {}) {
  const calls = { register: [], forgot: [], reset: [], clear: 0 };
  const actions = load("src/actions/account/users.ts", {
    "next-intl/server": serverIntl,
    "@/lib/api/handleActionError": errorHandler,
    "@/lib/userAuth/session": { clearUserToken: async () => calls.clear++ },
    "@/lib/userAuth/dal": { requireUser: async () => user },
    "@/lib/apis/account/users": {
      accountUsersAPI: {
        register: async (data) => {
          calls.register.push(clone(data));
          return response(user);
        },
        forgotPassword: async (data) => {
          calls.forgot.push(clone(data));
          return response();
        },
        resetPassword: async (data) => {
          calls.reset.push(clone(data));
          return response();
        },
        ...api,
      },
    },
  });
  return { calls, actions };
}
test("registration allowlists writable fields, keeps optional email null and never authenticates", async () => {
  const { actions, calls } = usersHarness();
  const data = {
    first_name: "Farmer",
    last_name: "Test",
    mobile: user.mobile,
    email: null,
    password: "Test!Password1",
    password_confirmation: "Test!Password1",
    terms_accepted: true,
  };
  assert.equal(
    (
      await actions.registerUser({
        ...data,
        access_token: "injected",
        role: "admin",
        country_code: "+91",
        status: true,
      })
    ).success,
    true,
  );
  assert.deepEqual(calls.register, [data]);
  assert.equal(calls.clear, 0);
});
test("duplicate registration fields remain available for correction", async () => {
  const errors = { mobile: ["Taken"], email: ["Taken"] };
  const { actions, calls } = usersHarness({
    register: async () => {
      throw new ApiError("Validation", 422, errors);
    },
  });
  assert.deepEqual(clone((await actions.registerUser({})).errors), errors);
  assert.equal(calls.clear, 0);
});
test("forgot-password always returns the same generic confirmation regardless of backend wording", async () => {
  for (const message of [
    "Known user",
    "Unknown email",
    "Mail delivery failed internally",
  ]) {
    const { actions } = usersHarness({
      forgotPassword: async () => ({ ...response(), message }),
    });
    assert.deepEqual(
      clone(await actions.forgotUserPassword({ email: "a@example.test" })),
      { success: true, message: "resetLinkSent" },
    );
  }
});
test("reset allows only reset fields, clears Farmer session on success and never autoauthenticates", async () => {
  const { actions, calls } = usersHarness();
  const data = {
    email: "a@example.test",
    token: "reset-token",
    password: "New!Password1",
    password_confirmation: "New!Password1",
  };
  const result = await actions.resetUserPassword({
    ...data,
    status: true,
    user_id: 9,
  });
  assert.deepEqual(calls.reset, [data]);
  assert.equal(calls.clear, 1);
  assert.equal(result.data, undefined);
  assert.equal(result.success, true);
});
test("expired reset token returns a field error and leaves the session unchanged", async () => {
  const errors = { token: ["Invalid reset token"] };
  const { actions, calls } = usersHarness({
    resetPassword: async () => {
      throw new ApiError("Invalid link", 422, errors);
    },
  });
  assert.deepEqual(clone((await actions.resetUserPassword({})).errors), errors);
  assert.equal(calls.clear, 0);
});

function dalHarness({
  token = "farmer-token",
  me = async () => response(user),
} = {}) {
  const calls = { me: 0, redirects: [] };
  const dal = load("src/lib/userAuth/dal.ts", {
    react: {
      cache: (fn) => {
        let cached;
        return () => (cached ??= fn());
      },
    },
    "next-intl/server": serverIntl,
    "@/i18n/navigation": {
      redirect: (value) => {
        calls.redirects.push(value);
        throw Error("NEXT_REDIRECT");
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/apis/account/auth": {
      accountAuthAPI: {
        me: async () => {
          calls.me++;
          return me();
        },
      },
    },
    "./session": { readUserToken: async () => token },
  });
  return { dal, calls };
}
test("DAL uses no API without Farmer cookie and caches verification within a render", async () => {
  const guest = dalHarness({ token: null });
  assert.equal(await guest.dal.getCurrentUser(), null);
  assert.equal(guest.calls.me, 0);
  const valid = dalHarness();
  await Promise.all([valid.dal.getCurrentUser(), valid.dal.getCurrentUser()]);
  assert.equal(valid.calls.me, 1);
});
test("DAL rejects inactive/expired sessions without mistaking backend outages for logout", async () => {
  for (const status of [401, 403, 419]) {
    const { dal } = dalHarness({
      me: async () => {
        throw new ApiError("Rejected", status);
      },
    });
    assert.equal(await dal.getCurrentUser(), null);
  }
  assert.equal(
    await dalHarness({
      me: async () => response({ ...user, status: false }),
    }).dal.getCurrentUser(),
    null,
  );
  await assert.rejects(
    dalHarness({
      me: async () => {
        throw new ApiError("Outage", 503);
      },
    }).dal.getCurrentUser(),
    (error) => error.status === 503,
  );
});
test("protected boundary requires verified Farmer and preserves locale on redirect", async () => {
  const { dal, calls } = dalHarness({ token: null });
  await assert.rejects(dal.requireUser(), /NEXT_REDIRECT/);
  assert.deepEqual(clone(calls.redirects), [
    { href: "/account/login", locale: "hi" },
  ]);
  assert.deepEqual(clone(await dalHarness().dal.requireUser()), user);
});
test("Redux initializes, updates and resets Admin and Farmer identities independently", () => {
  const farmer = load("src/store/slices/userAuthSlice.ts", {
    "@reduxjs/toolkit": toolkit,
  });
  const admin = load("src/store/slices/adminAuthSlice.ts", {
    "@reduxjs/toolkit": toolkit,
  });
  const { makeStore } = load("src/store/store.ts", {
    "@reduxjs/toolkit": toolkit,
    "./slices/adminAuthSlice": admin,
    "./slices/userAuthSlice": farmer,
  });
  const adminUser = { id: 1, email: "admin@example.test" };
  const store = makeStore({ user: adminUser, isAuthenticated: true });
  assert.equal(store.getState().webUser.isAuthenticated, false);
  store.dispatch(farmer.setUserAuth(user));
  store.dispatch(farmer.setUserAuthLoading(true));
  assert.equal(store.getState().webUser.isLoading, true);
  store.dispatch(farmer.resetUserAuth());
  assert.deepEqual(clone(store.getState().adminUser), {
    user: adminUser,
    isAuthenticated: true,
  });
  assert.equal(store.getState().webUser.user, null);
  const farmerStore = makeStore(undefined, {
    user,
    isAuthenticated: true,
    isLoading: false,
  });
  assert.equal(farmerStore.getState().adminUser.user, null);
});

function proxyHarness(path, cookieNames = []) {
  const proxy = load("src/proxy.ts", {
    "next-intl/middleware": () => () => ({ i18n: true }),
    "next/server": {
      NextResponse: { redirect: (url) => ({ redirect: url.pathname }) },
    },
    "./i18n/routing": { routing: { locales: ["en", "hi"] } },
    "./lib/userAuth/constants": { USER_COOKIE: "web_access_token" },
  }).default;
  return proxy({
    nextUrl: { pathname: path },
    url: `http://localhost${path}`,
    cookies: {
      get: (name) =>
        cookieNames.includes(name) ? { value: "cookie" } : undefined,
    },
  });
}
test("proxy protects Farmer routes and never uses an Admin cookie for Farmer access", () => {
  assert.deepEqual(clone(proxyHarness("/account/dashboard")), {
    redirect: "/account/login",
  });
  assert.deepEqual(
    clone(proxyHarness("/account/dashboard", ["admin_access_token"])),
    { redirect: "/account/login" },
  );
  assert.deepEqual(
    clone(proxyHarness("/account/dashboard", ["web_access_token"])),
    { i18n: true },
  );
  assert.deepEqual(clone(proxyHarness("/hi/account/dashboard/")), {
    redirect: "/hi/account/login",
  });
});
test("Farmer guest routes stay public; stale cookies do not cause a login/dashboard loop", () => {
  for (const route of ["login", "register", "reset-password"]) {
    for (const cookieNames of [
      [],
      ["web_access_token"],
      ["admin_access_token"],
    ])
      assert.deepEqual(clone(proxyHarness(`/account/${route}`, cookieNames)), {
        i18n: true,
      });
  }
});
test("existing Admin proxy behavior stays isolated from Farmer sessions", () => {
  assert.deepEqual(
    clone(proxyHarness("/admin/dashboard", ["web_access_token"])),
    { redirect: "/admin/login" },
  );
  assert.deepEqual(
    clone(proxyHarness("/admin/dashboard", ["admin_access_token"])),
    { i18n: true },
  );
  assert.deepEqual(
    clone(proxyHarness("/admin/login", ["admin_access_token"])),
    { redirect: "/admin/dashboard" },
  );
  assert.deepEqual(clone(proxyHarness("/admin/login", ["web_access_token"])), {
    i18n: true,
  });
});

function nodes(tree) {
  if (tree == null || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function formHarness(
  file,
  {
    result = { success: true, data: user },
    submitting = false,
    props = {},
    values = {},
  } = {},
) {
  const calls = {
    rules: {},
    errors: [],
    routes: [],
    actions: [],
    auth: [],
    toasts: [],
    state: [],
    closed: 0,
  };
  let cursor = 0;
  const router = {
    replace: (...args) => calls.routes.push(args),
    refresh: () => calls.routes.push(["refresh"]),
  };
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in calls.state)) calls.state[index] = initial;
      return [
        calls.state[index],
        (value) => {
          calls.state[index] =
            typeof value === "function" ? value(calls.state[index]) : value;
        },
      ];
    },
  };
  const action = async (data) => {
    calls.actions.push(clone(data));
    return result;
  };
  const form = {
    register: (name, rules) => {
      calls.rules[name] = rules;
      return { name };
    },
    handleSubmit: (fn) => fn,
    getValues: (name) => values[name],
    clearErrors() {},
    setError: (...args) => calls.errors.push(args),
    reset: () => calls.state.push("reset"),
    formState: { errors: {}, isSubmitting: submitting },
  };
  const deps = {
    react,
    "react-hook-form": { useForm: () => form },
    "next-intl": intl,
    "react-hot-toast": {
      success: (message) => calls.toasts.push(["success", message]),
      error: (message) => calls.toasts.push(["error", message]),
    },
    "@/actions/account/auth": { loginUser: action, logoutUser: action },
    "@/actions/account/users": {
      registerUser: action,
      forgotUserPassword: action,
      resetUserPassword: action,
    },
    "@/components/common/AccountInput": "AccountInput",
    "@/i18n/navigation": { Link: "Link", useRouter: () => router },
    "@/hooks/useUserAuth": {
      useUserAuth: () => ({ setAuth: (value) => calls.auth.push(value) }),
    },
    "@/hooks/useModal": {
      useModal: () => ({
        isOpen: false,
        openModal: () => calls.state.push("open"),
        closeModal() {},
      }),
    },
    "@/icons": new Proxy({}, { get: (_, key) => String(key) }),
    "./ForgotPasswordDialog": "ForgotPasswordDialog",
    "@headlessui/react": {
      Dialog: "Dialog",
      DialogBackdrop: "DialogBackdrop",
      DialogPanel: "DialogPanel",
      DialogTitle: "DialogTitle",
      Description: "Description",
    },
  };
  const Component = load(root + file, deps).default;
  const render = () => {
    cursor = 0;
    return Component({ isOpen: true, onClose: () => calls.closed++, ...props });
  };
  const tree = render();
  return {
    calls,
    tree,
    render,
    form: nodes(tree).find((node) => node.type === "form"),
  };
}
test("login maps identifier and password errors without discarding the retry values", async () => {
  const h = formHarness("login/_components/LoginForm.tsx", {
    result: {
      success: false,
      message: "Rejected",
      errors: { login: ["Invalid identifier"], password: ["Required"] },
    },
  });
  assert.equal(h.calls.rules.password.minLength, undefined);
  await h.form.props.onSubmit({ login: user.mobile, password: "legacy" });
  assert.deepEqual(
    h.calls.errors.slice(0, 2).map(([field, error]) => [field, error.message]),
    [
      ["login", "Invalid identifier"],
      ["password", "Required"],
    ],
  );
  assert.equal(h.calls.auth.length, 0);
  assert.equal(h.calls.routes.length, 0);
});
test("successful login populates only Farmer state and redirects to dashboard", async () => {
  for (const login of [user.mobile, "farmer@example.test"]) {
    const h = formHarness("login/_components/LoginForm.tsx");
    await h.form.props.onSubmit({ login, password: "legacy" });
    assert.deepEqual(clone(h.calls.auth), [user]);
    assert.deepEqual(h.calls.routes, [["/account/dashboard"], ["refresh"]]);
  }
});

test("login uses a single text username field with the original icon and no telephone keyboard restriction", () => {
  const h = formHarness("login/_components/LoginForm.tsx");
  const input = nodes(h.tree).find((node) => node.props?.name === "login");
  assert.equal(input.type, "AccountInput");
  assert.equal(input.props.type, "text");
  assert.equal(input.props.autoComplete, "username");
  assert.equal(input.props.inputMode, undefined);
  assert.equal(input.props.icon, "PhoneIcon");
  assert.equal(input.props.label, "login.identifier");
  assert.equal(input.props.placeholder, "login.identifierPlaceholder");
  assert.equal(
    nodes(h.tree).some((node) =>
      ["mobile", "email", "country_code"].includes(node.props?.name),
    ),
    false,
  );
});

test("identifier validation accepts emails, uppercase, plus/dots and trimmed Indian mobile numbers", () => {
  const h = formHarness("login/_components/LoginForm.tsx");
  const rules = h.calls.rules.login;
  assert.equal(rules.required, "login.identifierRequired");
  assert.equal(rules.maxLength.value, 255);
  for (const raw of [
    "farmer@example.com",
    "ramesh.kumar@gmail.com",
    "farmer+test@example.com",
    "FARMER@EXAMPLE.COM",
    "  farmer@example.com \t",
    "  FARMER+TEST@EXAMPLE.COM  ",
    "9876543210",
    "8765432109",
    "7654321098",
    "6543210987",
    " \t9876543210 \n",
  ]) {
    const login = rules.setValueAs(raw);
    assert.equal(login, raw.trim());
    assert.equal(rules.validate(login), true, raw);
  }
});

test("identifier validation rejects empty input, malformed emails and invalid or prefixed mobile numbers", () => {
  const { calls } = formHarness("login/_components/LoginForm.tsx");
  const rules = calls.rules.login;
  for (const raw of [
    "",
    " \t\n",
    "farmer@",
    "@gmail.com",
    "farmer.com",
    "farmer@gmail",
    "farmer@@gmail.com",
    "first last@example.com",
    "987654321",
    "98765432101",
    "1234567890",
    "98765abc10",
    "+919876543210",
    "919876543210",
    "98765 43210",
    "98765-43210",
    "arbitrary text",
  ]) {
    const login = rules.setValueAs(raw);
    assert.notEqual(rules.validate(login), true, raw);
    if (!login) assert.equal(rules.required, "login.identifierRequired");
  }
});

test("login trims only the identifier before submission and preserves every password character", async () => {
  for (const password of [" legacy password! ", "   ", "legacy"]) {
    const h = formHarness("login/_components/LoginForm.tsx");
    const login = h.calls.rules.login.setValueAs(
      " \tFARMER+TEST@EXAMPLE.COM \n",
    );
    assert.equal(h.calls.rules.password.required, "login.passwordRequired");
    assert.equal(h.calls.rules.password.setValueAs, undefined);
    assert.equal(h.calls.rules.password.validate, undefined);
    const passwordInput = nodes(h.tree).find(
      (node) => node.props?.name === "password",
    );
    assert.equal(passwordInput.props.type, "password");
    assert.equal(passwordInput.props.autoComplete, "current-password");
    await h.form.props.onSubmit({ login, password });
    assert.deepEqual(h.calls.actions, [
      { login: "FARMER+TEST@EXAMPLE.COM", password },
    ]);
    const action = authHarness();
    await action.actions.loginUser({ login, password });
    assert.deepEqual(action.calls.login, [{ login, password }]);
  }
});

test("login ignores another submission while the existing request is pending", async () => {
  const h = formHarness("login/_components/LoginForm.tsx", {
    submitting: true,
  });
  await h.form.props.onSubmit({ login: user.mobile, password: "legacy" });
  assert.equal(h.calls.actions.length, 0);
  assert.equal(
    nodes(h.tree).find(
      (node) => node.type === "button" && node.props.type === "submit",
    ).props.disabled,
    true,
  );
});
test("registration requires separate names, optional email, strong matching passwords and accepted terms", async () => {
  const h = formHarness("register/_components/RegisterForm.tsx", {
    values: { password: "Strong!Pass123" },
  });
  const rules = h.calls.rules;
  assert.ok(rules.first_name.required);
  assert.ok(rules.last_name.required);
  assert.equal(rules.email.required, undefined);
  assert.equal(rules.first_name.validate("   "), "validation.firstName");
  for (const weak of [
    "short",
    "lowercase123!",
    "UPPERCASE123!",
    "MixedNoDigits!",
    "MixedNoSymbols123",
  ])
    assert.notEqual(rules.password.validate(weak), true);
  assert.equal(rules.password.validate("Strong!Pass123"), true);
  assert.equal(
    rules.password_confirmation.validate("wrong"),
    "validation.passwordMatch",
  );
  assert.equal(rules.password_confirmation.validate("Strong!Pass123"), true);
  assert.equal(rules.terms_accepted.validate(false), "validation.terms");
  assert.equal(rules.terms_accepted.validate(true), true);
  await h.form.props.onSubmit({ first_name: "A", last_name: "B", email: "" });
  assert.equal(h.calls.actions[0].email, null);
  assert.equal(h.calls.auth.length, 0);
  assert.deepEqual(h.calls.routes, [["/account/login"], ["refresh"]]);
});
function registrationControl({ accepted = false, result } = {}) {
  const values = {
    first_name: "Test",
    last_name: "Farmer",
    mobile: "9876543210",
    email: "",
    password: "Strong!Pass123",
    password_confirmation: "Strong!Pass123",
    terms_accepted: accepted,
  };
  const h = formHarness("register/_components/RegisterForm.tsx", {
    values,
    result,
  });
  const form = require("react-hook-form").createFormControl({
    defaultValues: values,
    mode: "onTouched",
  });
  const checkbox = {
    name: "terms_accepted",
    type: "checkbox",
    value: "on",
    checked: accepted,
    disabled: false,
    attributes: {},
  };
  let terms;
  for (const [name, rules] of Object.entries(h.calls.rules)) {
    const field = form.register(name, rules);
    if (name === "terms_accepted") {
      terms = field;
      field.ref(checkbox);
    }
  }
  // Reproduce RegisterForm's disabled={isSubmitting} on the native checkbox.
  const unsubscribe = form.subscribe({
    formState: { isSubmitting: true },
    callback: (state) => {
      checkbox.disabled = state.isSubmitting;
    },
  });
  const errors = [];
  return {
    h,
    form,
    checkbox,
    unsubscribe,
    errors,
    submit: () =>
      form.handleSubmit(h.form.props.onSubmit, (error) => errors.push(error))(),
    async check(checked) {
      checkbox.checked = checked;
      await terms.onChange({ type: "change", target: checkbox });
    },
  };
}

test("checked terms survive submission-time disabling and reach registration as boolean true", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const h = registrationControl({ accepted: true, result: pending });
  try {
    const submitted = h.submit();
    await new Promise(setImmediate);
    assert.equal(h.checkbox.checked, true);
    assert.equal(h.checkbox.disabled, true);
    assert.equal(h.errors.length, 0);
    assert.equal(h.h.calls.actions.length, 1);
    assert.equal(h.h.calls.actions[0].terms_accepted, true);
    assert.equal(h.h.calls.actions[0].email, null);
    assert.equal(h.h.calls.routes.length, 0);
    finish({ success: true });
    await submitted;
    assert.equal(h.checkbox.disabled, false);
    assert.deepEqual(h.h.calls.routes, [["/account/login"], ["refresh"]]);
    assert.equal(h.h.calls.auth.length, 0);
  } finally {
    finish({ success: true });
    h.unsubscribe();
  }
});

test("unchecked terms block registration and checking them clears the error and permits retry", async () => {
  const h = registrationControl();
  try {
    await h.submit();
    assert.equal(h.h.calls.actions.length, 0);
    assert.equal(h.errors[0].terms_accepted.message, "validation.terms");
    assert.equal(h.form.getFieldState("terms_accepted").invalid, true);
    assert.equal(h.checkbox.disabled, false);
    await h.check(true);
    assert.equal(h.form.getFieldState("terms_accepted").invalid, false);
    await h.submit();
    assert.equal(h.h.calls.actions.length, 1);
    assert.equal(h.h.calls.actions[0].terms_accepted, true);
  } finally {
    h.unsubscribe();
  }
});

test("unchecking accepted terms restores the validation error without submitting", async () => {
  const h = registrationControl({ accepted: true });
  try {
    await h.check(false);
    await h.submit();
    assert.equal(h.h.calls.actions.length, 0);
    assert.equal(
      h.form.getFieldState("terms_accepted").error.message,
      "validation.terms",
    );
    assert.equal(h.form.getValues("terms_accepted"), false);
  } finally {
    h.unsubscribe();
  }
});

test("registration duplicate mobile/email errors stay on their fields", async () => {
  const h = formHarness("register/_components/RegisterForm.tsx", {
    result: {
      success: false,
      message: "Duplicate",
      errors: { mobile: ["Taken mobile"], email: ["Taken email"] },
    },
  });
  await h.form.props.onSubmit({ email: "a@example.test" });
  assert.deepEqual(
    h.calls.errors.slice(0, 2).map(([key, value]) => [key, value.message]),
    [
      ["mobile", "Taken mobile"],
      ["email", "Taken email"],
    ],
  );
  assert.equal(h.calls.routes.length, 0);
});
test("reset handles missing query values, hides the token and reports expired token errors", async () => {
  const missing = formHarness(
    "reset-password/_components/ResetPasswordForm.tsx",
    { props: { token: "", email: "" } },
  );
  assert.equal(missing.form, undefined);
  const h = formHarness("reset-password/_components/ResetPasswordForm.tsx", {
    props: { token: "link-token", email: "a@example.test" },
    result: {
      success: false,
      message: "Invalid token",
      errors: { token: ["Expired"] },
    },
  });
  assert.equal(
    nodes(h.tree).some((node) => node.props?.name === "token"),
    false,
  );
  await h.form.props.onSubmit({
    email: "a@example.test",
    password: "New!Password1",
    password_confirmation: "New!Password1",
  });
  assert.equal(h.calls.actions[0].token, "link-token");
  assert.equal(h.calls.errors.at(-1)[1].message, "reset.invalidLink");
  assert.equal(h.calls.routes.length, 0);
});
test("successful reset returns to Login without changing Farmer state", async () => {
  const h = formHarness("reset-password/_components/ResetPasswordForm.tsx", {
    props: { token: "link-token", email: "a@example.test" },
  });
  await h.form.props.onSubmit({
    email: "a@example.test",
    password: "New!Password1",
    password_confirmation: "New!Password1",
  });
  assert.equal(h.calls.auth.length, 0);
  assert.deepEqual(h.calls.routes, [["/account/login"], ["refresh"]]);
});
test("recovery dialog validates email, shows generic success and guards dismissal during submission", async () => {
  const h = formHarness("login/_components/ForgotPasswordDialog.tsx");
  assert.ok(h.calls.rules.email.required);
  assert.equal(h.calls.rules.email.pattern.value.test("invalid"), false);
  await h.form.props.onSubmit({ email: "a@example.test" });
  assert.ok(
    nodes(h.render()).some(
      (node) =>
        node.props?.role === "status" &&
        node.props.children === "feedback.resetLinkSent",
    ),
  );
  const busy = formHarness("login/_components/ForgotPasswordDialog.tsx", {
    submitting: true,
  });
  nodes(busy.tree)
    .find((node) => node.type === "Dialog")
    .props.onClose();
  assert.equal(busy.calls.closed, 0);
});
test("all editable controls are disabled during a request", () => {
  for (const file of [
    "login/_components/LoginForm.tsx",
    "register/_components/RegisterForm.tsx",
    "reset-password/_components/ResetPasswordForm.tsx",
  ]) {
    const h = formHarness(file, {
      submitting: true,
      props: { token: "x", email: "a@example.test" },
    });
    const inputs = nodes(h.tree).filter((node) => node.type === "AccountInput");
    assert.ok(inputs.length > 0);
    assert.equal(
      inputs.every((node) => node.props.disabled),
      true,
    );
  }
});

test("password visibility button changes the input type and retains accessible label/error associations", () => {
  let visible = false;
  const Component = load("src/components/common/AccountInput.tsx", {
    react: {
      useState: () => [
        visible,
        (fn) => {
          visible = fn(visible);
        },
      ],
    },
    "next-intl": intl,
    "@/components/admin/form/input/InputField": "Input",
    "@/components/admin/form/Label": "Label",
    "@/icons": { EyeIcon: "Eye", EyeCloseIcon: "EyeClose" },
  }).default;
  const props = {
    id: "password",
    label: "Password",
    icon: "Lock",
    type: "password",
    error: "Required",
  };
  let tree = Component(props);
  assert.equal(
    nodes(tree).find((node) => node.type === "Input").props.type,
    "password",
  );
  nodes(tree)
    .find((node) => node.type === "button")
    .props.onClick();
  tree = Component(props);
  assert.equal(
    nodes(tree).find((node) => node.type === "Input").props.type,
    "text",
  );
  assert.equal(
    nodes(tree).find((node) => node.type === "button").props["aria-label"],
    "hidePassword",
  );
  assert.equal(
    nodes(tree).find((node) => node.type === "Input").props["aria-describedby"],
    "password-error",
  );
});
test("language changes preserve reset token/email query parameters", () => {
  const routes = [];
  const Component = load("src/components/common/AccountLanguageSwitcher.tsx", {
    react: { useTransition: () => [false, (fn) => fn()] },
    "next-intl": { ...intl, useLocale: () => "en" },
    "next/navigation": {
      useSearchParams: () =>
        new URLSearchParams({
          token: "link-token",
          email: "a+test@example.test",
        }),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ replace: (...args) => routes.push(args) }),
      usePathname: () => "/account/reset-password",
    },
  }).default;
  nodes(Component())
    .find((node) => node.type === "button" && node.props.lang === "hi")
    .props.onClick();
  const [url, options] = routes[0];
  assert.equal(
    new URL(url, "http://localhost").searchParams.get("email"),
    "a+test@example.test",
  );
  assert.equal(
    new URL(url, "http://localhost").searchParams.get("token"),
    "link-token",
  );
  assert.equal(options.locale, "hi");
});
test("returning to a tab rechecks once, retains session on outage and redirects expired sessions", async () => {
  let outcome = { success: false };
  let apiCalls = 0;
  const listeners = {};
  const calls = { auth: 0, reset: 0, routes: [] };
  const target = {
    addEventListener: (name, fn) => {
      listeners[name] = fn;
    },
    removeEventListener() {},
  };
  let cleanup;
  const Component = load(
    "src/providers/UserSessionGuard.tsx",
    {
      react: {
        useEffect: (fn) => {
          cleanup = fn();
        },
      },
      "@/actions/account/auth": {
        getAuthenticatedUser: async () => {
          apiCalls++;
          return outcome;
        },
      },
      "@/hooks/useUserAuth": {
        useUserAuth: () => ({
          setAuth: () => calls.auth++,
          resetAuth: () => calls.reset++,
          setLoading() {},
        }),
      },
      "@/i18n/navigation": {
        useRouter: () => ({
          replace: (url) => calls.routes.push(url),
          refresh() {},
        }),
      },
    },
    { window: target, document: { ...target, visibilityState: "visible" } },
  ).default;
  Component({ children: "dashboard" });
  assert.equal(apiCalls, 0);
  await Promise.all([listeners.focus(), listeners.visibilitychange()]);
  assert.equal(apiCalls, 1);
  assert.equal(calls.reset, 0);
  outcome = { success: true, data: user };
  await listeners.focus();
  assert.equal(calls.auth, 1);
  outcome = { success: true, data: null };
  await listeners.focus();
  assert.equal(calls.reset, 1);
  assert.deepEqual(calls.routes, ["/account/login"]);
  cleanup();
});
test("all account message keys match in English and Hindi and Hindi contains real translated text", () => {
  const en = JSON.parse(
    fs.readFileSync("src/messages/en.json", "utf8"),
  ).account;
  const hi = JSON.parse(
    fs.readFileSync("src/messages/hi.json", "utf8"),
  ).account;
  function keys(value, prefix = "") {
    return Object.entries(value).flatMap(([key, item]) =>
      typeof item === "object"
        ? keys(item, `${prefix}${key}.`)
        : `${prefix}${key}`,
    );
  }
  assert.deepEqual(keys(en), keys(hi));
  assert.match(hi.login.title, /[\u0900-\u097f]/u);
  assert.equal(JSON.stringify(hi).includes("???"), false);
  assert.match(en.register.terms, /<terms>.*<\/terms>/);
  assert.match(hi.register.terms, /<terms>.*<\/terms>/);
  assert.equal(en.login.identifier, "Email or Mobile Number");
  assert.equal(hi.login.identifier, "ईमेल या मोबाइल नंबर");
  assert.equal(
    en.login.identifierPlaceholder,
    "Enter your email or mobile number",
  );
  assert.equal(
    hi.login.identifierPlaceholder,
    "अपना ईमेल या मोबाइल नंबर दर्ज करें",
  );
  assert.equal(
    en.login.identifierRequired,
    "Email or mobile number is required.",
  );
  assert.equal(
    hi.login.identifierRequired,
    "ईमेल या मोबाइल नंबर दर्ज करना आवश्यक है।",
  );
  assert.equal(
    en.login.identifierInvalid,
    "Enter a valid email address or 10-digit mobile number.",
  );
  assert.equal(
    hi.login.identifierInvalid,
    "कृपया सही ईमेल पता या 10 अंकों का मोबाइल नंबर दर्ज करें।",
  );
});
