const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const root = "src/app/[locale]/(admin)/admin/(pages)/seed-lots/";
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(file, dependencies = {}, globals = {}) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: loadedModule,
    exports: loadedModule.exports,
    FormData,
    File,
    Blob,
    Response,
    URLSearchParams,
    ...globals,
    require(name) {
      if (name === "react/jsx-runtime") return jsx;
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  return loadedModule.exports;
}
const knowledge = load("src/types/admin/knowledgeSource.ts"),
  seeds = load("src/types/admin/seed.ts"),
  domain = load("src/types/admin/seedLot.ts");
const ApiError = load("src/lib/api/ApiError.ts").ApiError;
const payload = {
  seed_id: 7,
  lot_number: "LOT-1",
  seed_class: null,
  seed_treatment_status: null,
  production_date: null,
  test_date: null,
  valid_until: null,
  germination_percentage: "0",
  physical_purity_percentage: null,
  genetic_purity_percentage: "99.99",
  certification_number: null,
  certification_body: null,
  notes: null,
  is_active: true,
};
const product = {
  id: 7,
  name: "सरसों",
  sku: "SKU-1",
  crop_name: "Mustard",
  crop_variety_name: "Brijraj",
  crop_id: 2,
  crop_variety_id: 3,
  primary_image: null,
  material_type: "seed",
  is_active: false,
  setup_status: "completed",
};
const lot = {
  ...payload,
  id: 4,
  verification_status: "verified",
  verified_at: "2026-11-01T10:00:00Z",
  verifier: { id: 1, first_name: "A", last_name: "B" },
  seed: product,
  report_url: "https://private-api.test/admin/seed-lots/4/report",
  computed_validity_status: "expired",
};
const pagination = { current_page: 2, last_page: 3, per_page: 10, total: 21 };
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
function serviceHarness(responses = [], admin = { is_super_user: true }) {
  const calls = [],
    invalidations = [];
  const service = load("src/lib/apis/admin/seedLots.ts", {
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
  const actions = load("src/actions/admin/seedLots.ts", {
    "next/cache": { revalidatePath: (value) => invalidations.push(value) },
    "next-intl/server": translations,
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!admin) throw new ApiError("Sign in", 401);
        return admin;
      },
    },
    "@/lib/apis/admin/seedLots": service,
    "@/lib/api/handleActionError": errorHandler,
    "@/types/admin/knowledgeSource": knowledge,
  });
  return { service: service.seedLotsAPI, actions, calls, invalidations };
}
test("lot client uses verified methods, backend filters and protected binary report endpoint", async () => {
  const h = serviceHarness();
  await h.service.list({
    seed_id: 7,
    is_active: "0",
    validity_status: "expired",
    verification_status: "outdated",
    page: 2,
  });
  await h.service.show(4);
  await h.service.create(payload);
  await h.service.update(4, payload);
  await h.service.updateStatus(4, true);
  await h.service.updateVerification(4, "outdated");
  await h.service.report(4);
  await h.service.delete(4);
  assert.deepEqual(
    h.calls.map((c) => [c.url, c.options.method ?? "GET"]),
    [
      ["/admin/seed-lots", "GET"],
      ["/admin/seed-lots/4", "GET"],
      ["/admin/seed-lots", "POST"],
      ["/admin/seed-lots/4", "PATCH"],
      ["/admin/seed-lots/4/status", "PATCH"],
      ["/admin/seed-lots/4/verification", "PATCH"],
      ["/admin/seed-lots/4/report", "GET"],
      ["/admin/seed-lots/4", "DELETE"],
    ],
  );
  assert.equal(h.calls[0].options.params.is_active, "0");
  assert.equal(h.calls[6].options.responseType, "binary");
  assert.equal(h.calls[7].options.data, undefined);
});
test("report upload is native multipart, update overrides PATCH, unchanged report omitted and removal explicit", async () => {
  const h = serviceHarness(Array(4).fill({ status: true, data: lot }));
  await h.actions.saveSeedLot(null, payload);
  await h.actions.saveSeedLot(4, { ...payload, report_file: null });
  const form = new FormData();
  form.set(
    "report_file",
    new File(["PDF"], "report.pdf", { type: "application/pdf" }),
  );
  form.set("verified_by", "intruder");
  await h.actions.saveSeedLot(
    4,
    { ...payload, verified_by: 99, report_file: null },
    form,
  );
  await h.actions.saveSeedLot(null, payload, form);
  assert.equal(Object.hasOwn(h.calls[0].options.data, "report_file"), false);
  assert.equal(h.calls[1].options.data.report_file, null);
  const uploaded = h.calls[2].options.data;
  assert.ok(uploaded instanceof FormData);
  assert.equal(uploaded.get("_method"), "PATCH");
  assert.equal(h.calls[2].options.method, "POST");
  assert.equal(uploaded.get("germination_percentage"), "0");
  assert.equal(uploaded.get("is_active"), "1");
  assert.equal(uploaded.get("production_date"), "");
  assert.equal(uploaded.get("verified_by"), null);
  assert.ok(uploaded.get("report_file") instanceof File);
  assert.equal(h.calls[3].options.data.get("_method"), null);
  assert.equal(h.invalidations.length, 12);
});
test("mutations authenticate, authorize review separately and allow ordinary-admin activation", async () => {
  const anon = serviceHarness([], null);
  await anon.actions.saveSeedLot(null, payload);
  await anon.actions.updateSeedLotStatus(4, true);
  await anon.actions.updateSeedLotVerification(4, "pending");
  await anon.actions.deleteSeedLot(4);
  assert.equal(anon.calls.length, 0);
  const h = serviceHarness(Array(3).fill({ status: true, data: lot }), {
    is_super_user: false,
  });
  assert.equal(
    (
      await h.actions.saveSeedLot(4, {
        ...payload,
        verification_status: "verified",
      })
    ).success,
    false,
  );
  assert.equal(
    (await h.actions.updateSeedLotVerification(4, "pending")).success,
    false,
  );
  assert.equal((await h.actions.updateSeedLotStatus(4, true)).success, true);
  assert.equal((await h.actions.saveSeedLot(4, payload)).success, true);
  assert.equal(
    (
      await h.actions.saveSeedLot(null, {
        ...payload,
        verification_status: "pending",
      })
    ).success,
    true,
  );
  assert.equal(h.calls[1].options.data.verification_status, undefined);
  for (const id of [0, -1, 1.5, "4", Infinity]) {
    assert.equal((await h.actions.deleteSeedLot(id)).success, false);
    assert.equal(
      (await h.actions.updateSeedLotStatus(id, false)).success,
      false,
    );
  }
});
test("server validates report count/type/extension/size without losing zero quality or leaking review fields", async () => {
  for (const file of [
    new File([], "empty.pdf", { type: "application/pdf" }),
    new File(["x"], "bad.exe", { type: "application/pdf" }),
    new File(["x"], "bad.pdf", { type: "image/webp" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    }),
  ]) {
    const h = serviceHarness(),
      form = new FormData();
    form.set("report_file", file);
    const result = await h.actions.saveSeedLot(4, payload, form);
    assert.equal(result.success, false);
    assert.ok(result.errors.report_file);
    assert.equal(h.calls.length, 0);
  }
  const h = serviceHarness(),
    form = new FormData();
  for (let i = 0; i < 2; i++)
    form.append(
      "report_file",
      new File(["x"], "x.jpg", { type: "image/jpeg" }),
    );
  assert.equal((await h.actions.saveSeedLot(4, payload, form)).success, false);
});
test("backend validation/conflicts stay recoverable, failures never invalidate, and redirect control flow survives", async () => {
  const errors = { lot_number: ["Duplicate"], report_file: ["Invalid file"] };
  const h = serviceHarness([
    new ApiError("Invalid", 422, errors),
    new ApiError("Referenced lot", 409),
    new ApiError("Private SQL detail", 500),
    { status: false },
  ]);
  assert.deepEqual((await h.actions.saveSeedLot(4, payload)).errors, errors);
  assert.equal((await h.actions.deleteSeedLot(4)).message, "Referenced lot");
  assert.equal(
    (await h.actions.updateSeedLotStatus(4, false)).message,
    "failed",
  );
  assert.equal((await h.actions.saveSeedLot(4, payload)).success, false);
  assert.equal(h.invalidations.length, 0);
  await assert.rejects(
    serviceHarness([
      Object.assign(Error("NEXT_REDIRECT"), { controlFlow: true }),
    ]).actions.saveSeedLot(4, payload),
    /NEXT_REDIRECT/,
  );
});
function findAll(element, predicate) {
  if (!element || typeof element !== "object") return [];
  return [
    ...(predicate(element) ? [element] : []),
    ...[element.props?.children ?? []]
      .flat(Infinity)
      .flatMap((e) => findAll(e, predicate)),
  ];
}
function hooks() {
  const slots = [];
  let cursor = 0,
    pending = Promise.resolve();
  return {
    reset() {
      cursor = 0;
    },
    done: () => pending,
    react: {
      useRef(initial) {
        const i = cursor++;
        return (slots[i] ??= { current: initial });
      },
      useState(initial) {
        const i = cursor++;
        slots[i] ??= { value: initial };
        return [
          slots[i].value,
          (value) =>
            (slots[i].value =
              typeof value === "function" ? value(slots[i].value) : value),
        ];
      },
      useCallback: (value) => value,
      useTransition: () => [
        false,
        (fn) => {
          pending = Promise.resolve(fn());
        },
      ],
    },
  };
}
const mock = (name) => ({ __esModule: true, default: name });
const ui = {
  "next-intl": {
    useTranslations: () => (key, args) =>
      args ? `${key}:${JSON.stringify(args)}` : key,
    useFormatter: () => ({ dateTime: (date) => date.toISOString() }),
  },
  "@/components/admin/common/ComponentCard": mock("card"),
  "@/components/admin/form/input/InputField": mock("input"),
  "@/components/admin/form/Label": mock("label"),
  "@/components/admin/common/FilterSelect": mock("select"),
  "@/components/admin/form/switch/Switch": mock("switch"),
  "@/components/admin/form/date-picker": mock("date"),
  "@/components/common/ImagePreview": mock("image"),
  "@/icons": new Proxy({}, { get: (_, key) => key }),
  "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect":
    mock("relation"),
  "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog":
    mock("confirm"),
  "@/types/admin/seed": seeds,
  "@/types/admin/seedLot": domain,
  "@/types/admin/knowledgeSource": knowledge,
};
function formHarness(
  record = lot,
  respond = async () => ({ success: false, message: "Retry" }),
  canReview = false,
) {
  const state = hooks(),
    rules = {},
    errors = [],
    calls = [],
    pushes = [],
    notifications = [];
  let values, drop;
  const form = {
    control: {},
    formState: { errors: {}, isSubmitting: false },
    register(name, rule) {
      rules[name] = rule;
      return { name };
    },
    getValues: (name) => (name ? values[name] : values),
    setValue(name, value) {
      values[name] = value;
    },
    setError(name, error) {
      errors.push({ name, ...error });
    },
    clearErrors() {},
    trigger() {},
    reset(next) {
      values = next;
    },
    handleSubmit: (fn) => () => fn(values),
  };
  const Form = load(root + "_components/SeedLotForm.tsx", {
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
            name,
            value: values[name],
            onChange: (value) => (values[name] = value),
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
    "@/i18n/navigation": {
      Link: "link",
      useRouter: () => ({ push: (href) => pushes.push(href) }),
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
      __esModule: true,
      default: {
        success: (text) => notifications.push(text),
        error: (text) => notifications.push(text),
      },
    },
    "@/actions/admin/seedLots": {
      saveSeedLot: async (...args) => {
        calls.push(args);
        return respond(...args);
      },
    },
  }).default;
  const render = () => {
    state.reset();
    return Form({ lot: record, selection: null, canReview });
  };
  render();
  return {
    render,
    values: () => values,
    fill: (next) => Object.assign(values, next),
    rules,
    errors,
    calls,
    pushes,
    notifications,
    drop: (accepted, rejected = []) => drop.onDrop(accepted, rejected),
    async submit() {
      findAll(render(), (e) => e.type === "form")[0].props.onSubmit({});
      await state.done();
    },
  };
}
test("lot defaults preserve historical seed, optional nulls and zero; dates validate only verified ordering", () => {
  const h = formHarness();
  assert.equal(h.values().seed_id, "7");
  assert.equal(h.values().germination_percentage, "0");
  assert.equal(h.values().seed_class, "");
  for (const v of ["", "0", "100", "99.99", "0.01"])
    assert.equal(h.rules.germination_percentage.validate(v), true);
  for (const v of ["-1", "100.01", "0.001", "no"])
    assert.notEqual(h.rules.germination_percentage.validate(v), true);
  assert.equal(h.rules.production_date.validate("2028-02-29"), true);
  assert.notEqual(h.rules.production_date.validate("2026-02-29"), true);
  h.fill({ production_date: "2026-01-01", test_date: "2026-06-01" });
  assert.equal(h.rules.valid_until.validate.order("2026-02-01"), true); // Expiry may precede testing under the verified API contract.
  assert.notEqual(h.rules.test_date.validate.order("2025-12-31"), true);
  assert.equal(h.rules.valid_until.validate.order(""), true);
  const created = formHarness(null);
  assert.equal(created.values().is_active, true);
  assert.equal(created.values().verification_status, "pending");
});
test("ordinary edit omits unchanged verification and owned metadata; field errors preserve draft/report for retry", async () => {
  const h = formHarness(lot, async () => ({
    success: false,
    message: "Fix",
    errors: { lot_number: ["Duplicate"], "report_file.0": ["Invalid"] },
  }));
  const report = new File(["PDF"], "report.pdf", { type: "application/pdf" });
  h.drop([report]);
  h.fill({ lot_number: "Changed" });
  await h.submit();
  const saved = h.calls[0][1];
  assert.equal(Object.hasOwn(saved, "verification_status"), false);
  assert.equal(Object.hasOwn(saved, "verified_by"), false);
  assert.equal(saved.germination_percentage, "0");
  assert.equal(h.values().lot_number, "Changed");
  assert.equal(h.values().report[0], report);
  assert.deepEqual(
    h.errors.map((e) => e.name),
    ["lot_number", "report"],
  );
  assert.equal(h.pushes.length, 0);
});
test("report removal is confirmed and staged; undo and discarding replacement restore original report", async () => {
  const h = formHarness();
  const button = (text) =>
    findAll(
      h.render(),
      (e) => e.type === "button" && e.props.children === text,
    )[0];
  button("report.remove").props.onClick();
  assert.equal(h.calls.length, 0);
  findAll(h.render(), (e) => e.type === "confirm")[0].props.onConfirm();
  assert.equal(h.calls.length, 0);
  await h.submit();
  assert.equal(h.calls[0][1].report_file, null);
  assert.ok(button("report.undo"));
  button("report.undo").props.onClick();
  await h.submit();
  assert.equal(Object.hasOwn(h.calls[1][1], "report_file"), false);
  h.drop([new File(["x"], "new.png", { type: "image/png" })]);
  button("report.discard").props.onClick();
  assert.equal(
    findAll(
      h.render(),
      (e) => e.type === "link" && e.props.children === "report.download",
    )[0].props.href,
    "/admin/seed-lots/4/report",
  );
});
test("invalid report selection keeps accepted draft and successful create retains its ID on repeat save", async () => {
  const h = formHarness(null, async () => ({ success: true, data: lot }));
  h.fill({ seed_id: "7", lot_number: "New" });
  const valid = new File(["x"], "report.png", { type: "image/png" });
  h.drop([valid]);
  h.drop([], [{}]);
  assert.equal(h.values().report[0], valid);
  await h.submit();
  assert.equal(h.calls[0][0], null);
  assert.equal(h.calls[0][1].verification_status, "pending");
  assert.equal(h.values().report.length, 0);
  await h.submit();
  assert.equal(h.calls[1][0], 4);
});
test("seed selection updates preview from selected summary without a client detail request", () => {
  const h = formHarness(),
    controller = findAll(
      h.render(),
      (e) => e.type === "controller" && e.props.name === "seed_id",
    )[0];
  const relation = controller.props.render({
    field: { value: "7", onChange: (value) => h.fill({ seed_id: value }) },
  });
  relation.props.onChange("8");
  relation.props.onSelectionChange({
    id: 8,
    seed: { ...product, id: 8, name: "New product" },
  });
  const content = JSON.stringify(h.render());
  assert.ok(content.includes("New product"));
  assert.equal(h.calls.length, 0);
  relation.props.onChange("");
  relation.props.onSelectionChange(null);
  assert.ok(JSON.stringify(h.render()).includes("form.previewEmpty"));
});
test("protected report proxy authenticates, fixes backend target, streams binary and preserves control-flow errors", async () => {
  const calls = [];
  let authenticated = true,
    response = new Blob(["PRIVATE PDF"], { type: "application/pdf" });
  const route = load(root + "[id]/report/route.ts", {
    "@/lib/auth/dal": {
      requireAdmin: async () => {
        if (!authenticated) throw new ApiError("Sign in", 401);
      },
    },
    "@/lib/apis/admin/seedLots": {
      seedLotsAPI: {
        report: async (id) => {
          calls.push(id);
          if (response instanceof Error) throw response;
          return response;
        },
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": errorHandler,
  });
  const get = (id) => route.GET({}, { params: Promise.resolve({ id }) });
  const success = await get("4");
  assert.equal(await success.text(), "PRIVATE PDF");
  assert.equal(success.headers.get("content-type"), "application/pdf");
  assert.match(
    success.headers.get("content-disposition"),
    /seed-lot-4-report.pdf/,
  );
  assert.equal(success.headers.get("cache-control"), "private, no-store");
  assert.equal(success.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await get("../../secret")).status, 404);
  authenticated = false;
  assert.equal((await get("4")).status, 401);
  assert.deepEqual(calls, [4]);
  authenticated = true;
  response = Object.assign(Error("REDIRECT"), { controlFlow: true });
  await assert.rejects(get("4"), /REDIRECT/);
});
test("five filters preserve inactive 0 and unrelated query, and applying/resetting clears page", () => {
  const state = hooks(),
    pushes = [];
  let values;
  const Filters = load(root + "_components/SeedLotsFilters.tsx", {
    ...ui,
    react: state.react,
    "react-hook-form": {
      Controller: "controller",
      useForm(options) {
        values ??= options.defaultValues;
        return {
          control: {},
          register: (name) => ({ name }),
          handleSubmit: (fn) => () => fn(values),
          reset: (next) => (values = next),
        };
      },
    },
    "next/navigation": {
      useSearchParams: () =>
        new URLSearchParams("page=3&unrelated=keep&is_active=1"),
    },
    "@/i18n/navigation": {
      useRouter: () => ({ push: (value) => pushes.push(value) }),
    },
  }).default;
  const render = () => {
    state.reset();
    return Filters({
      initialFilters: {
        keyword: " text ",
        seed_id: "7",
        verification_status: "outdated",
        is_active: "0",
        validity_status: "expired",
      },
      selection: null,
    });
  };
  findAll(render(), (e) => e.type === "form")[0].props.onSubmit();
  assert.match(pushes[0], /is_active=0/);
  assert.match(pushes[0], /validity_status=expired/);
  assert.match(pushes[0], /unrelated=keep/);
  assert.doesNotMatch(pushes[0], /page=/);
  findAll(
    render(),
    (e) => e.type === "button" && e.props.type === "button",
  )[0].props.onClick();
  assert.equal(pushes[1], "/admin/seed-lots?unrelated=keep");
});
test("listing uses embedded product and backend validity without computing expiry client-side", () => {
  const List = load(root + "_components/SeedLotsList.tsx", {
    ...ui,
    "@/i18n/navigation": { Link: "link" },
    "@/components/admin/ui/badge/Badge": mock("badge"),
    "@/components/admin/common/UrlPagination": mock("pagination"),
    "@/components/admin/ui/table": {
      Table: "table",
      TableHeader: "thead",
      TableBody: "tbody",
      TableRow: "tr",
      TableCell: "td",
    },
    "./SeedLotRowActions": mock("actions"),
  }).default;
  const tree = List({
    result: { data: [lot], pagination },
    filtered: false,
    canReview: false,
  });
  assert.ok(JSON.stringify(tree).includes("validity.expired"));
  assert.ok(JSON.stringify(tree).includes("सरसों"));
  assert.equal(
    findAll(tree, (e) => e.type === "thead")[0].props.children.props.children
      .length,
    9,
  );
  assert.equal(
    findAll(tree, (e) => e.type === "tbody")[0].props.children[0].props
      .children[0].props.children,
    11,
  );
});
test("row mutations wait for confirmation, guard duplicates/dismissal, and keep conflicts open for retry", async () => {
  const state = hooks(),
    calls = [],
    notices = [];
  let resolve;
  const Actions = load(root + "_components/SeedLotRowActions.tsx", {
    ...ui,
    react: state.react,
    "@headlessui/react": {
      Menu: "menu",
      MenuButton: "menuButton",
      MenuItem: "item",
      MenuItems: "items",
    },
    "@/i18n/navigation": { Link: "link", useRouter: () => ({ push() {} }) },
    "@/hooks/useModal": {
      useModal() {
        const [isOpen, open] = state.react.useState(false);
        return {
          isOpen,
          openModal: () => open(true),
          closeModal: () => open(false),
        };
      },
    },
    "react-hot-toast": {
      __esModule: true,
      default: {
        success: (value) => notices.push(value),
        error: (value) => notices.push(value),
      },
    },
    "@/actions/admin/seedLots": {
      deleteSeedLot: (id) => {
        calls.push(["delete", id]);
        return new Promise((done) => (resolve = done));
      },
      updateSeedLotStatus: async (id, value) => {
        calls.push(["status", id, value]);
        return { success: true };
      },
      updateSeedLotVerification: async (id, value) => {
        calls.push(["review", id, value]);
        return { success: true };
      },
    },
  }).default;
  const render = (record = { ...lot, is_active: false }, canReview = false) => {
    state.reset();
    return Actions({ lot: record, canReview });
  };
  assert.equal(
    findAll(
      render(),
      (e) =>
        e.type === "button" &&
        String(e.props.children).startsWith("actions.verifyAs"),
    ).length,
    0,
  );
  assert.equal(
    findAll(
      render(lot),
      (e) => e.type === "button" && e.props.children === "actions.delete",
    ).length,
    0,
  );
  findAll(
    render(),
    (e) => e.type === "button" && e.props.children === "actions.delete",
  )[0].props.onClick();
  assert.equal(calls.length, 0);
  const dialog = () => findAll(render(), (e) => e.type === "confirm")[0];
  dialog().props.onConfirm();
  dialog().props.onConfirm();
  dialog().props.onClose();
  assert.equal(calls.length, 1);
  assert.equal(dialog().props.busy, true);
  resolve({ success: false, message: "Referenced lot" });
  await new Promise((done) => setImmediate(done));
  assert.match(dialog().props.description, /Referenced lot/);
  assert.equal(dialog().props.busy, false);
  dialog().props.onClose();
  assert.equal(dialog(), undefined);
  findAll(
    render(),
    (e) => e.type === "button" && e.props.children === "actions.activate",
  )[0].props.onClick();
  dialog().props.onConfirm();
  await new Promise((done) => setImmediate(done));
  assert.deepEqual(calls[1], ["status", 4, true]);
  assert.equal(dialog(), undefined);
  const reviewButton = findAll(
    render(undefined, true),
    (e) =>
      e.type === "button" &&
      String(e.props.children).includes('"status":"verification.pending"'),
  )[0];
  reviewButton.props.onClick();
  dialog().props.onConfirm();
  await new Promise((done) => setImmediate(done));
  assert.deepEqual(calls[2], ["review", 4, "pending"]);
});
test("seed master search uses paginated API filters and exposes only the selected preview summary", async () => {
  const calls = [];
  const master = load("src/lib/apis/admin/cropStageTimelines.ts", {
    "server-only": {},
    "@/lib/api/request": {},
    "@/lib/api/ApiError": { ApiError },
    ...Object.fromEntries(
      [
        "crops",
        "cropStages",
        "cropVarieties",
        "seasons",
        "knowledgeSources",
        "regions",
        "activityCategories",
      ].map((name) => [`@/lib/apis/admin/${name}`, {}]),
    ),
    "@/lib/apis/admin/seeds": {
      seedsAPI: {
        list: async (params) => {
          calls.push(params);
          return {
            status: true,
            data: [
              {
                ...product,
                slug: "seed",
                translations: { hi: {} },
                images: [{ secret: "not needed" }],
              },
            ],
            pagination,
          };
        },
        show: async (id) => {
          calls.push(id);
          return { status: true, data: { ...product, slug: "seed" } };
        },
      },
    },
  });
  const options = await master.getTimelineOptions(
    "seed",
    null,
    true,
    "mustard",
    2,
  );
  assert.deepEqual(clone(calls[0]), {
    keyword: "mustard",
    page: 2,
    per_page: 20,
    is_active: 1,
    setup_status: "completed",
    verification_status: "verified",
  });
  assert.equal(options.options[0].label, "सरसों");
  assert.equal(options.options[0].seed.sku, "SKU-1");
  assert.equal(options.options[0].seed.translations, undefined);
  assert.equal(options.options[0].seed.images, undefined);
  const selections = await master.getTimelineSelections(
    { seed: options },
    { seed: 7 },
  );
  assert.equal(selections.seed.id, 7);
  assert.equal(calls.length, 1);
  await master.getTimelineOptions("seed", null, false);
  assert.equal(calls[1].is_active, undefined);
});
test("editor reads lot once and preserves unavailable historical selection from embedded summary", async () => {
  const calls = [];
  const Editor = load(root + "_components/SeedLotEditor.tsx", {
    "next-intl/server": translations,
    "next/navigation": {
      notFound() {
        throw Object.assign(Error("NOT_FOUND"), { controlFlow: true });
      },
    },
    "@/lib/auth/dal": { requireAdmin: async () => ({ is_super_user: false }) },
    "@/lib/apis/admin/seedLots": {
      seedLotsAPI: {
        show: async (id) => {
          calls.push(["lot", id]);
          return { status: true, data: lot };
        },
      },
    },
    "@/lib/apis/admin/cropStageTimelines": {
      getTimelineOptions: async () => {
        calls.push(["options"]);
        return { options: [], pagination };
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": errorHandler,
    "./SeedLotForm": mock("form"),
    "./SeedLotDetails": mock("details"),
  }).default;
  const edited = await Editor({ id: "4" });
  assert.equal(edited.props.selection.id, 7);
  assert.equal(edited.props.selection.seed, product);
  assert.equal(edited.props.selection.is_active, false);
  assert.equal(edited.props.canReview, false);
  assert.deepEqual(calls, [["lot", 4], ["options"]]);
  calls.length = 0;
  assert.equal((await Editor({ id: "4", viewOnly: true })).type, "details");
  assert.deepEqual(calls, [["lot", 4]]);
  await assert.rejects(Editor({ id: "not-id" }), /NOT_FOUND/);
});
test("new message namespaces have matching keys, ICU arguments and real Hindi for every UI label", () => {
  const en = JSON.parse(
      fs.readFileSync("src/messages/en.json", "utf8"),
    ).seedLots,
    hi = JSON.parse(fs.readFileSync("src/messages/hi.json", "utf8")).seedLots;
  function flatten(value, prefix = "") {
    return Object.entries(value).flatMap(([key, child]) =>
      typeof child === "object"
        ? flatten(child, `${prefix}${key}.`)
        : [[`${prefix}${key}`, child]],
    );
  }
  const english = flatten(en),
    hindi = new Map(flatten(hi));
  assert.equal(english.length, hindi.size);
  for (const [key, value] of english) {
    const translated = hindi.get(key);
    assert.equal(typeof translated, "string", key);
    assert.deepEqual(
      translated.match(/\{\w+\}/g)?.sort(),
      value.match(/\{\w+\}/g)?.sort(),
      key,
    );
    assert.doesNotMatch(translated, /\?\?|\uFFFD/, key);
  }
  assert.match(hi.title, /[\u0900-\u097f]/);
});
