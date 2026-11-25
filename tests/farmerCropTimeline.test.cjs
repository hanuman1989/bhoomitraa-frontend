const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");
const base = "src/app/[locale]/(account)/account/(protected)/";
const timelineDir = base + "crop-timeline/";
const feature = timelineDir + "_components/";
const tick = () => new Promise((resolve) => setImmediate(resolve));
const clone = (value) => JSON.parse(JSON.stringify(value));
function load(file, deps = {}, globals = {}) {
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
    Promise,
    setTimeout,
    clearTimeout,
    ...globals,
    require: (name) =>
      name === "react/jsx-runtime"
        ? jsx
        : Object.hasOwn(deps, name)
          ? deps[name]
          : (() => {
              throw Error(`Unexpected dependency ${name} in ${file}`);
            })(),
  });
  return mod.exports;
}
function hooks() {
  const slots = [];
  let cursor = 0;
  let queue = [];
  const changed = (a, b) =>
    !a || !b || a.length !== b.length || a.some((v, i) => v !== b[i]);
  const react = {
    startTransition: (fn) => fn(),
    useState(initial) {
      const i = cursor++;
      slots[i] ??= {
        value: typeof initial === "function" ? initial() : initial,
      };
      return [
        slots[i].value,
        (value) => {
          slots[i].value =
            typeof value === "function" ? value(slots[i].value) : value;
        },
      ];
    },
    useRef(initial) {
      return (slots[cursor++] ??= { current: initial });
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps))
        queue.push(() => {
          slots[i]?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || changed(slots[i].deps, deps))
        slots[i] = { value: fn(), deps };
      return slots[i].value;
    },
  };
  return {
    react,
    render(fn, props) {
      cursor = 0;
      const tree = fn(props);
      const current = queue;
      queue = [];
      current.forEach((fn) => fn());
      return tree;
    },
    cleanup() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
function nodes(tree) {
  return !tree || typeof tree !== "object"
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];
}
// next-intl returns a stable translator, so the stub does too.
const translator = (key, params) =>
  params ? `${key}:${JSON.stringify(params)}` : key;
const translate = () => translator;

function activity(id, overrides = {}) {
  return {
    id,
    section_key: "growth_stage:5",
    title: `Activity ${id}`,
    other_title: `गतिविधि ${id}`,
    description: null,
    instructions: "Do it",
    category: { id: 2, name: "Irrigation", icon: "DropletsIcon", tone: "blue" },
    type: "task",
    type_label: "Task",
    priority: "medium",
    priority_label: "Medium priority",
    schedule_type: "after_sowing",
    schedule_label: "After Sowing",
    when_label: "20–45 days after sowing · 21 Nov – 16 Dec 2026 · 22 days left",
    when_tone: "due",
    time_state: "due",
    start_date: "2026-11-21",
    start_date_label: "21 Nov 2026",
    end_date: "2026-12-16",
    end_date_label: "16 Dec 2026",
    month_key: "2026-11",
    month_label: "November 2026",
    planned_start_date: "2026-11-21",
    planned_end_date: "2026-12-16",
    planned_range_label: "21 Nov – 16 Dec 2026",
    is_rescheduled: false,
    last_tile: { key: "time_left", label: "Time left", value: "22 days" },
    status: "pending",
    status_label: "Pending",
    status_line: "Status: Pending",
    started_at_label: null,
    completed_at_label: null,
    flags: {
      allow_status_update: true,
      allow_notes: true,
      allow_expenses: false,
      allow_labour: false,
      allow_attachments: false,
      allow_rescheduling: false,
    },
    records: { notes: 0, expenses: 0, labour: 0, photos: 0 },
    records_total: 0,
    record_types_remaining: 1,
    notes: [],
    smart_actions: [],
    tools_remaining: 0,
    ...overrides,
  };
}
function timeline(overrides = {}) {
  return {
    id: 41,
    status: "active",
    generated: true,
    can_generate: false,
    editable: true,
    crop: {
      name: "Wheat",
      other_name: "गेहूँ",
      image: null,
      variety: "DBW 370",
      season: "Rabi",
      farm: "Mall 9 Bigha",
      area_label: "1.361 Acre",
      location: "Jaipur",
      sowing_date: "2026-11-01",
      sowing_date_label: "1 Nov 2026",
      expected_harvest_label: "9 Feb – 1 Mar 2027",
      days: { label: "Days after sowing", value: "Day 23" },
    },
    alert: { show: false },
    stats: {
      growth_stages: 1,
      activities: 3,
      due_now: 1,
      late: 1,
      completed: 0,
      total_tasks: 3,
    },
    current_stage_id: 5,
    sections: [
      {
        key: "before_sowing:7",
        type: "before_sowing",
        title: "Before Sowing",
        other_title: "बुवाई से पहले",
        stage: null,
        marker: { icon: "ShovelIcon", icons: [], more: 0 },
        activity_count: 1,
        done_count: 0,
        total_count: 1,
        activities: [
          activity(7, {
            section_key: "before_sowing:7",
            time_state: "late",
            when_tone: "late",
            start_date: "2026-10-22",
          }),
        ],
      },
      {
        key: "growth_stage:5",
        type: "growth_stage",
        title: "Tillering",
        other_title: "कल्ले निकलना",
        stage: {
          id: 5,
          sequence: 3,
          sequence_label: "Growth stage 03",
          range_label: "20–45 days after sowing",
          state: "current",
        },
        marker: { icon: "DropletsIcon", icons: [], more: 0 },
        activity_count: 2,
        done_count: 0,
        total_count: 2,
        activities: [
          activity(8),
          activity(9, {
            status: "in_progress",
            status_label: "In progress",
            start_date: "2026-11-25",
          }),
        ],
      },
    ],
    ...overrides,
  };
}

function timelineHarness(data, actionResponses = {}, globals = {}) {
  const runtime = hooks();
  const calls = [];
  const notices = [];
  const workspace = [];
  const cursorTargets = [];
  const actions = Object.fromEntries(
    [
      "addActivityNote",
      "deleteActivityNote",
      "generateCropTimeline",
      "markTimelineAlertSeen",
      "rescheduleActivity",
      "updateActivityStatus",
    ].map((name) => [
      name,
      async (...args) => {
        calls.push([name, ...args]);
        return actionResponses[name]
          ? actionResponses[name](...args)
          : { success: true, message: "" };
      },
    ]),
  );
  const deps = {
    react: runtime.react,
    "next-intl": { useTranslations: translate },
    "react-hot-toast": {
      success: (message) => notices.push(["success", message]),
      error: (message) => notices.push(["error", message]),
    },
    "@/actions/account/farm-crop-timeline": actions,
    "../../_components/AccountFarmContext": {
      useAccountFarms: () => ({
        crops: {
          open: (options) => workspace.push(["open", options]),
          refresh: () => workspace.push(["refresh"]),
        },
      }),
    },
    "../../crops/_components/CropConfirmDialog": "CropConfirmDialog",
    "../../crops/_components/CropUi": { cropButton: "button" },
    "./TimelineActions": { TimelineActionsContext: { Provider: "Provider" } },
    "./TimelineToolbar": { __esModule: true, default: "TimelineToolbar" },
    "./TimelineRail": { __esModule: true, default: "TimelineRail" },
    "./useScrollbarCursor": (element) => cursorTargets.push(element),
    // The page's scrolling parent is given by the test as `node.scrollParent`.
    "./timelineScroll": {
      scrollBehavior: () => "smooth",
      scrollParent: (node) => node.scrollParent,
    },
  };
  for (const name of [
    "TimelineHeader",
    "TimelineReadyAlert",
    "TimelineSummary",
    "TimelineCalendarList",
    "TimelineEmptyState",
    "TimelineGeneratingLoader",
    "AddNoteDialog",
    "RescheduleDialog",
    "UnderProgressDialog",
    "SmartActionDialog",
    "TimelineScrollButtons",
  ])
    deps[`./${name}`] = name;
  const Component = load(feature + "CropTimeline.tsx", deps, {
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    document: { getElementById: () => null },
    ...globals,
  }).default;
  const props = { timeline: data, variant: "dialog", onClose: () => {} };
  return {
    calls,
    notices,
    workspace,
    cursorTargets,
    runtime,
    render: (extra = {}) => runtime.render(Component, { ...props, ...extra }),
  };
}
const find = (tree, type) => nodes(tree).find((node) => node.type === type);

test("the crop timeline route is a server page that renders the shared component and hides other farmers' crops", async () => {
  const page = timelineDir + "[id]/page.tsx";
  assert.ok(fs.existsSync(page));
  const calls = [];
  const notFound = () => {
    throw new Error("NEXT_NOT_FOUND");
  };
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  let response = { status: true, data: timeline(), message: "" };
  const pageModule = load(page, {
    react: { Suspense: "Suspense" },
    "next/navigation": { notFound },
    "next-intl/server": {
      getTranslations: async () => (key) => key,
      setRequestLocale: () => {},
    },
    "@/lib/apis/account/farm-crop-timeline": {
      accountCropTimelineAPI: {
        get: async (id) => {
          calls.push(id);
          if (response instanceof Error) throw response;
          return response;
        },
      },
    },
    "@/lib/api/ApiError": { ApiError },
    "@/lib/api/handleActionError": {
      handleActionError: async (_, fallback) => ({ message: fallback }),
    },
    "../../crops/_components/CropUi": { CropNotice: "CropNotice" },
    "../_components/CropTimeline": "CropTimeline",
    "../_components/CropTimelineSkeleton": "CropTimelineSkeleton",
  });
  const tree = await pageModule.default({
    params: Promise.resolve({ locale: "en", id: "41" }),
    searchParams: Promise.resolve({ activity: "9" }),
  });
  assert.equal(tree.type, "Suspense");
  const Content = tree.props.children.type;
  const content = (id, activity) =>
    Content({
      id,
      searchParams: Promise.resolve(activity ? { activity } : {}),
    });

  const rendered = await content("41", "9");
  assert.equal(rendered.type, "CropTimeline");
  assert.equal(rendered.props.variant, "page");
  assert.equal(rendered.props.focusActivityId, 9);
  assert.deepEqual(calls, [41]);

  await assert.rejects(content("abc"), /NEXT_NOT_FOUND/);
  await assert.rejects(content("0"), /NEXT_NOT_FOUND/);
  assert.deepEqual(calls, [41]);
  response = new ApiError("Not found", 404);
  await assert.rejects(content("42"), /NEXT_NOT_FOUND/);
  response = new ApiError("Forbidden", 403);
  await assert.rejects(content("43"), /NEXT_NOT_FOUND/);
  response = new ApiError("Server", 500);
  assert.equal((await content("44")).type, "CropNotice");
});

test("the dialog and the page render the same CropTimeline component", async () => {
  const runtime = hooks();
  const requests = [];
  const Dialog = load(feature + "CropTimelineDialog.tsx", {
    react: runtime.react,
    "@headlessui/react": {
      Dialog: "Dialog",
      DialogBackdrop: "DialogBackdrop",
      DialogPanel: "DialogPanel",
    },
    "next-intl": { useTranslations: translate },
    "@/actions/account/farm-crop-timeline": {
      getCropTimeline: async (id) => {
        requests.push(["get", id]);
        return { success: true, data: timeline() };
      },
      generateCropTimeline: async (id) => {
        requests.push(["generate", id]);
        return { success: false, message: "failed" };
      },
    },
    "@/icons": new Proxy({}, { get: (_, name) => name }),
    "../../crops/_components/CropUi": { CropNotice: "CropNotice" },
    "./CropTimeline": "CropTimeline",
    "./CropTimelineSkeleton": "CropTimelineSkeleton",
    "./TimelineGeneratingLoader": "TimelineGeneratingLoader",
  }).default;
  const props = { id: 41, onClose: () => {} };
  runtime.render(Dialog, props);
  await tick();
  const shared = find(runtime.render(Dialog, props), "CropTimeline");
  assert.equal(shared.props.variant, "dialog");
  assert.equal(shared.props.timeline.id, 41);
  assert.deepEqual(requests, [["get", 41]]);
  const page = fs.readFileSync(timelineDir + "[id]/page.tsx", "utf8");
  assert.match(page, /from "\.\.\/_components\/CropTimeline"/);
  assert.match(
    fs.readFileSync(feature + "CropTimelineDialog.tsx", "utf8"),
    /from "\.\/CropTimeline"/,
  );

  // Generation failures keep the dialog open with the error and a Retry.
  const failing = hooks();
  const Generating = load(feature + "CropTimelineDialog.tsx", {
    react: failing.react,
    "@headlessui/react": {
      Dialog: "Dialog",
      DialogBackdrop: "DialogBackdrop",
      DialogPanel: "DialogPanel",
    },
    "next-intl": { useTranslations: translate },
    "@/actions/account/farm-crop-timeline": {
      getCropTimeline: async () => ({ success: true, data: timeline() }),
      generateCropTimeline: async (id) => {
        requests.push(["generate", id]);
        return { success: false, message: "failed" };
      },
    },
    "@/icons": new Proxy({}, { get: (_, name) => name }),
    "../../crops/_components/CropUi": { CropNotice: "CropNotice" },
    "./CropTimeline": "CropTimeline",
    "./CropTimelineSkeleton": "CropTimelineSkeleton",
    "./TimelineGeneratingLoader": "TimelineGeneratingLoader",
  }).default;
  const generateProps = { id: 41, generate: true, onClose: () => {} };
  assert.ok(
    find(failing.render(Generating, generateProps), "TimelineGeneratingLoader"),
  );
  await tick();
  const failed = failing.render(Generating, generateProps);
  assert.equal(find(failed, "TimelineGeneratingLoader"), undefined);
  assert.equal(find(failed, "CropTimeline"), undefined);
  assert.ok(find(failed, "CropNotice"));
  assert.ok(
    nodes(failed).some(
      (n) => n.type === "button" && [n.props.children].flat().includes("retry"),
    ),
  );
});

test("the timeline has no language switch and uses the app locale", () => {
  const files = [
    ...fs.readdirSync(feature).map((name) => feature + name),
    timelineDir + "[id]/page.tsx",
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /LanguageSwitcher|LanguageIcon|useLocale|setLocale|languages\.ts|i18n\/languages/,
      file,
    );
  }
});

test("the ready alert shows only when the API says so and is marked seen once on dismiss", async () => {
  const hidden = timelineHarness(timeline());
  assert.equal(find(hidden.render(), "TimelineReadyAlert"), undefined);

  const shown = timelineHarness(timeline({ alert: { show: true } }));
  const alert = find(shown.render(), "TimelineReadyAlert");
  assert.deepEqual(clone(alert.props).sowingDate, "1 Nov 2026");
  assert.equal(alert.props.activities, 3);
  alert.props.onDismiss();
  assert.equal(find(shown.render(), "TimelineReadyAlert"), undefined);
  assert.deepEqual(shown.calls, [["markTimelineAlertSeen", 41]]);
});

test("in-progress activities and their stage open by default and the scroll target is the earliest one", () => {
  const h = timelineHarness(timeline());
  const tree = h.render();
  const actions = find(tree, "Provider").props.value;
  assert.equal(actions.isOpen(9), true);
  assert.equal(actions.isOpen(8), false);
  assert.equal(actions.isOpen(7), false);
  const rail = find(tree, "TimelineRail");
  assert.equal(rail.props.isSectionOpen("growth_stage:5"), true);
  assert.equal(rail.props.isSectionOpen("before_sowing:7"), false);
  // Panels default open; toggling closes them.
  assert.equal(actions.isPanelOpen(9, "records"), true);
  actions.togglePanel(9, "records");
  assert.equal(
    find(h.render(), "Provider").props.value.isPanelOpen(9, "records"),
    false,
  );
});

test("an activity change replaces the activity, totals and section progress with the server response", async () => {
  const updated = activity(8, {
    status: "completed",
    status_label: "Completed",
    time_state: "done",
  });
  const h = timelineHarness(timeline(), {
    updateActivityStatus: async () => ({
      success: true,
      message: "Activity marked as done.",
      data: {
        activity: updated,
        stats: { ...timeline().stats, completed: 1, due_now: 0 },
        current_stage_id: 5,
        section: { key: "growth_stage:5", done_count: 1, total_count: 2 },
      },
    }),
  });
  const actions = find(h.render(), "Provider").props.value;
  actions.complete(timeline().sections[1].activities[0]);
  await tick();
  const tree = h.render();
  assert.deepEqual(h.calls, [["updateActivityStatus", 8, "complete"]]);
  assert.equal(find(tree, "TimelineSummary").props.stats.completed, 1);
  const section = find(tree, "TimelineRail").props.sections[1];
  assert.equal(section.section.done_count, 1);
  assert.equal(section.activities[0].status, "completed");
  assert.deepEqual(h.notices, [["success", "Activity marked as done."]]);
});

test("filters hide unmatched sections, and expense, labour, photo and smart actions open placeholders", () => {
  const h = timelineHarness(timeline());
  let tree = h.render();
  find(tree, "TimelineToolbar").props.onFilters({
    search: "",
    status: "late",
    category: "all",
  });
  tree = h.render();
  const sections = find(tree, "TimelineRail").props.sections;
  assert.deepEqual(
    sections.map((s) => s.section.key),
    ["before_sowing:7"],
  );
  const actions = find(tree, "Provider").props.value;
  actions.placeholder(timeline().sections[1].activities[0], "expenses");
  assert.equal(
    find(h.render(), "UnderProgressDialog").props.title,
    "records.addExpense",
  );
  actions.smartAction(timeline().sections[1].activities[0], {
    key: "weather_forecast",
    label: "Weather Forecast",
  });
  assert.equal(
    find(h.render(), "SmartActionDialog").props.action.key,
    "weather_forecast",
  );
});

test("the dialog and the page both get the scroll buttons and the scrollbar cursor on their scroll container", () => {
  for (const variant of ["dialog", "page"]) {
    const h = timelineHarness(timeline());
    let tree = h.render({ variant });
    const buttons = find(tree, "TimelineScrollButtons");
    assert.ok(buttons, variant);
    assert.equal(buttons.props.scroller, null);
    assert.equal(buttons.props.content, null);
    // The dialog body scrolls itself around a content wrapper; the page's
    // content is its root, inside its scrolling parent.
    const refs = nodes(tree).filter(
      (n) => n.type === "div" && typeof n.props.ref === "function",
    );
    const scroller = { name: "scroller" };
    const content = { name: "content", scrollParent: scroller };
    if (variant === "dialog") {
      assert.match(refs[0].props.className, /overflow-y-auto/);
      refs[0].props.ref(scroller);
      refs[1].props.ref(content);
    } else refs[0].props.ref(content);
    tree = h.render({ variant });
    const wired = find(tree, "TimelineScrollButtons");
    assert.equal(wired.props.scroller, scroller);
    assert.equal(wired.props.content, content);
    assert.match(
      wired.props.className,
      variant === "dialog" ? /\babsolute\b/ : /\bfixed\b/,
    );
    assert.equal(h.cursorTargets.at(-1), scroller);
  }
});

test("Go to current clears hiding filters, opens, smoothly scrolls to and briefly highlights the current activity", () => {
  const frames = [];
  const timers = [];
  const scrolled = [];
  const h = timelineHarness(
    timeline(),
    {},
    {
      requestAnimationFrame: (fn) => frames.push(fn),
      setTimeout: (fn, ms) => timers.push([fn, ms]),
      clearTimeout: () => {},
      document: {
        getElementById: (id) => ({
          scrollIntoView: (options) => scrolled.push([id, clone(options)]),
        }),
      },
    },
  );
  const runFrames = () => frames.splice(0).forEach((fn) => fn());
  let tree = h.render();
  runFrames();
  // The on-load scroll is the same effect and stays an instant jump.
  assert.deepEqual(scrolled, [
    ["timeline-activity-9", { block: "start", behavior: "auto" }],
  ]);
  let toolbar = find(tree, "TimelineToolbar");
  assert.equal(toolbar.props.hasCurrent, true);
  toolbar.props.onCollapseAll();
  toolbar.props.onFilters({ search: "", status: "late", category: "all" });
  find(h.render(), "TimelineToolbar").props.onGoToCurrent();
  tree = h.render();
  toolbar = find(tree, "TimelineToolbar");
  assert.deepEqual(clone(toolbar.props.filters), {
    search: "",
    status: "all",
    category: "all",
  });
  assert.equal(
    find(tree, "TimelineRail").props.isSectionOpen("growth_stage:5"),
    true,
  );
  const actions = find(tree, "Provider").props.value;
  assert.equal(actions.isOpen(9), true);
  assert.equal(actions.isHighlighted(9), true);
  assert.equal(actions.isHighlighted(8), false);
  runFrames();
  assert.deepEqual(scrolled.at(-1), [
    "timeline-activity-9",
    { block: "start", behavior: "smooth" },
  ]);
  const highlight = timers.find(([, ms]) => ms === 1500);
  assert.ok(highlight);
  highlight[0]();
  assert.equal(
    find(h.render(), "Provider").props.value.isHighlighted(9),
    false,
  );

  // Filters that already show the current activity are kept.
  const kept = { search: "", status: "in_progress", category: "all" };
  find(h.render(), "TimelineToolbar").props.onFilters(kept);
  find(h.render(), "TimelineToolbar").props.onGoToCurrent();
  assert.deepEqual(
    clone(find(h.render(), "TimelineToolbar").props.filters),
    kept,
  );
});

test("without an In progress activity the first due one is current, and with neither Go to current is unavailable", () => {
  const due = timeline();
  due.sections[1].activities[1] = activity(9, { start_date: "2026-11-25" });
  const h = timelineHarness(due);
  find(h.render(), "TimelineToolbar").props.onGoToCurrent();
  assert.equal(find(h.render(), "Provider").props.value.isHighlighted(8), true);

  const none = timeline();
  for (const section of none.sections)
    section.activities = section.activities.map((item) =>
      activity(item.id, { time_state: "upcoming", status: "pending" }),
    );
  const idle = timelineHarness(none);
  const toolbar = find(idle.render(), "TimelineToolbar");
  assert.equal(toolbar.props.hasCurrent, false);
  toolbar.props.onGoToCurrent();
  const actions = find(idle.render(), "Provider").props.value;
  assert.equal(
    [7, 8, 9].some((id) => actions.isHighlighted(id)),
    false,
  );
});

test("the toolbar has icon-only Expand/Collapse all with tooltips and a labelled Go to current after them", () => {
  const Toolbar = load(feature + "TimelineToolbar.tsx", {
    react: { useId: () => "no-current" },
    "next-intl": { useTranslations: translate },
    "@/icons": new Proxy({}, { get: (_, name) => name }),
    "@/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") },
    "../../crops/_components/CropUi": { cropButton: "btn", cropControl: "ctl" },
    "@/components/common/Tooltip": "Tooltip",
  }).default;
  const onGoToCurrent = () => {};
  const render = (hasCurrent) =>
    nodes(
      Toolbar({
        filters: { search: "", status: "all", category: "all" },
        categories: [],
        view: "stages",
        hasCurrent,
        onFilters: () => {},
        onView: () => {},
        onExpandAll: () => {},
        onCollapseAll: () => {},
        onGoToCurrent,
      }),
    ).filter((n) => n.type === "Tooltip");
  const [expand, collapse, current] = render(true);
  for (const [tip, label, icon] of [
    [expand, "expandAll", "ChevronsUpDownIcon"],
    [collapse, "collapseAll", "ChevronsDownUpIcon"],
  ]) {
    assert.equal(tip.props.content, label);
    const button = tip.props.children;
    assert.equal(button.type, "button");
    assert.equal(button.props["aria-label"], label);
    assert.equal(button.props.title, undefined);
    assert.equal(button.props.children.type, icon);
  }
  // Go to current has a visible label, so it only gets a tooltip when unavailable.
  assert.equal(current.props.content, null);
  const button = current.props.children;
  const children = [button.props.children].flat();
  assert.equal(children[0].type, "CrosshairIcon");
  assert.ok(children.includes("goToCurrent"));
  assert.equal(button.props["aria-disabled"], false);
  assert.equal(button.props["aria-describedby"], undefined);
  assert.equal(button.props.onClick, onGoToCurrent);

  const unavailable = render(false).at(-1);
  assert.equal(unavailable.props.content, "noCurrent");
  assert.equal(unavailable.props.id, "no-current");
  assert.equal(unavailable.props.children.props["aria-disabled"], true);
  assert.equal(
    unavailable.props.children.props["aria-describedby"],
    "no-current",
  );
  assert.equal(unavailable.props.children.props.onClick, undefined);
});

test("the scroll buttons stay in place, are disabled where they cannot scroll, page one screen from the target, and use one scroll listener", () => {
  const runtime = hooks();
  const frames = [];
  const timers = [];
  const observed = [];
  let resized;
  class ResizeObserver {
    constructor(fn) {
      resized = fn;
    }
    observe(element) {
      observed.push(element);
    }
    disconnect() {
      observed.length = 0;
    }
  }
  const Buttons = load(
    feature + "TimelineScrollButtons.tsx",
    {
      react: runtime.react,
      "next-intl": { useTranslations: translate },
      "@/icons": new Proxy({}, { get: (_, name) => name }),
      "@/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") },
      "./timelineScroll": {
        scrollBehavior: () => "smooth",
        scrollEventTarget: (element) => element,
      },
      "@/components/common/Tooltip": "Tooltip",
    },
    {
      requestAnimationFrame: (fn) => frames.push(fn),
      cancelAnimationFrame: () => {},
      setTimeout: (fn) => timers.push(fn),
      clearTimeout: () => {},
      ResizeObserver,
    },
  ).default;
  const listeners = [];
  const scrolls = [];
  const scroller = {
    scrollTop: 0,
    scrollHeight: 2000,
    clientHeight: 600,
    addEventListener: (type, fn, options) =>
      listeners.push([type, fn, options]),
    removeEventListener: (type, fn) =>
      listeners.splice(
        listeners.findIndex(([t, f]) => t === type && f === fn),
        1,
      ),
    scrollTo: (options) => scrolls.push(clone(options)),
  };
  const content = { name: "content" };
  const props = { scroller, content, className: "absolute" };
  const render = () => runtime.render(Buttons, props);
  // The rendered <button> inside each RoundButton's tooltip.
  const element = (tree, label) => {
    const round = nodes(tree).find((n) => n.props?.label === label);
    return round.type(round.props).props.children;
  };
  const labels = ["previousPage", "nextPage", "scrollToTop"];
  const disabled = (tree) =>
    labels.map((label) => element(tree, label).props["aria-disabled"]);
  const press = (label) => element(render(), label).props.onClick?.();
  const scrollTo = (top) => {
    scroller.scrollTop = top;
    listeners[0][1]();
  };
  const settle = () => timers.splice(0).forEach((fn) => fn());

  assert.equal(render(), null);
  // One passive scroll listener and one ResizeObserver on scroller and content.
  assert.deepEqual(
    listeners.map(([type, , options]) => [type, options.passive]),
    [["scroll", true]],
  );
  assert.equal(observed.length, 2);
  assert.equal(observed[0], scroller);
  assert.equal(observed[1], content);
  frames.splice(0).forEach((fn) => fn());

  // At the top all three show in a fixed column; Previous and Top are disabled.
  let tree = render();
  assert.deepEqual(
    nodes(tree)
      .filter((n) => n.props?.label)
      .map((n) => n.props.label),
    labels,
  );
  assert.deepEqual(disabled(tree), [true, false, true]);
  assert.match(tree.props.className, /pointer-events-none/);
  assert.match(tree.props.className, /\babsolute\b/);
  press("previousPage");
  press("scrollToTop");
  assert.deepEqual(scrolls, [], "disabled buttons do nothing");

  // One visible screen less 48 px; a quick second click pages on from the target.
  press("nextPage");
  press("nextPage");
  assert.deepEqual(scrolls, [
    { top: 552, behavior: "smooth" },
    { top: 1104, behavior: "smooth" },
  ]);
  scrollTo(552);
  assert.deepEqual(disabled(render()), [false, false, false]);
  // Clamped at the bottom, where Next page is disabled.
  press("nextPage");
  assert.equal(scrolls.at(-1).top, 1400);
  scrollTo(1400);
  settle();
  assert.deepEqual(disabled(render()), [false, true, false]);
  const count = scrolls.length;
  press("nextPage");
  assert.equal(scrolls.length, count);
  press("previousPage");
  assert.equal(scrolls.at(-1).top, 848);
  scrollTo(100);
  settle();
  press("previousPage");
  assert.equal(scrolls.at(-1).top, 0);
  scrollTo(700);
  settle();
  press("scrollToTop");
  assert.deepEqual(scrolls.at(-1), { top: 0, behavior: "smooth" });

  // Each is a real labelled button with a side tooltip that keeps focus on press;
  // disabled ones stay focusable (aria-disabled) and lose the hover colour.
  scrollTo(0);
  tree = render();
  for (const [label, icon, off] of [
    ["previousPage", "ChevronUpIcon", true],
    ["nextPage", "ChevronDownIcon", false],
    ["scrollToTop", "ArrowUpToLineIcon", true],
  ]) {
    const round = nodes(tree).find((n) => n.props?.label === label);
    const tip = round.type(round.props);
    assert.equal(tip.type, "Tooltip");
    assert.equal(tip.props.content, label);
    assert.equal(tip.props.side, "start");
    const button = tip.props.children;
    assert.equal(button.type, "button");
    assert.equal(button.props.type, "button");
    assert.equal(button.props.disabled, undefined);
    assert.equal(button.props["aria-disabled"], off);
    assert.equal(button.props["aria-label"], label);
    assert.match(button.props.className, /rounded-full/);
    assert.match(button.props.className, /size-12/);
    assert.match(button.props.className, /bg-success-700/);
    assert.match(button.props.className, /focus-visible:outline-2/);
    if (off) {
      assert.match(button.props.className, /opacity-40/);
      assert.match(button.props.className, /cursor-not-allowed/);
      assert.doesNotMatch(button.props.className, /hover:bg-success-800/);
    } else assert.match(button.props.className, /hover:bg-success-800/);
    assert.equal(button.props.children.type, icon);
    let prevented = false;
    button.props.onMouseDown({ preventDefault: () => (prevented = true) });
    assert.equal(prevented, true);
  }

  // Content changes are seen without a scroll event.
  scrollTo(1400);
  scroller.scrollHeight = 3000;
  resized();
  assert.deepEqual(disabled(render()), [false, false, false]);
  // A timeline that fits without scrolling shows no buttons.
  scroller.scrollTop = 0;
  scroller.scrollHeight = 600;
  resized();
  assert.equal(render(), null);
  assert.equal(listeners.length, 1);
  runtime.cleanup();
  assert.equal(listeners.length, 0);
  assert.equal(observed.length, 0);
});

test("scrolling respects reduced motion and the page scrolls in its nearest scrolling parent", () => {
  let reduced = false;
  const main = { style: "auto", parentElement: null };
  const wrapper = { style: "visible", parentElement: main };
  const scroll = load(
    feature + "timelineScroll.ts",
    {},
    {
      window: { matchMedia: () => ({ matches: reduced }) },
      getComputedStyle: (node) => ({ overflowY: node.style }),
      document: { scrollingElement: "document", documentElement: "root" },
    },
  );
  assert.equal(scroll.scrollBehavior(), "smooth");
  reduced = true;
  assert.equal(scroll.scrollBehavior(), "auto");
  assert.equal(scroll.scrollParent({ parentElement: wrapper }), main);
  main.style = "hidden";
  assert.equal(scroll.scrollParent({ parentElement: wrapper }), "document");
});

test("the scrollbar cursor is a pointer over the scrollbar, grabbing while pressed, and off on touch-only devices", () => {
  let hover = true;
  const windowListeners = {};
  const effects = [];
  const useScrollbarCursor = load(
    feature + "useScrollbarCursor.ts",
    { react: { useEffect: (fn) => effects.push(fn) } },
    {
      window: {
        matchMedia: () => ({ matches: hover }),
        addEventListener: (type, fn) => (windowListeners[type] = fn),
        removeEventListener: (type) => delete windowListeners[type],
      },
    },
  ).default;
  const listeners = {};
  // A 300 px wide scroller at x = 100 with a 6 px scrollbar at its end.
  const element = {
    style: { cursor: "" },
    scrollHeight: 1000,
    clientHeight: 400,
    clientWidth: 294,
    clientLeft: 0,
    getBoundingClientRect: () => ({ left: 100 }),
    addEventListener: (type, fn) => (listeners[type] = fn),
    removeEventListener: (type) => delete listeners[type],
  };
  useScrollbarCursor(element);
  const cleanup = effects.pop()();
  const at = (clientX, target = element) => ({ target, clientX, button: 0 });
  listeners.mousemove(at(397));
  assert.equal(element.style.cursor, "pointer");
  listeners.mousemove(at(150));
  assert.equal(element.style.cursor, "");
  // Content children keep their normal cursor.
  listeners.mousemove(at(397, {}));
  assert.equal(element.style.cursor, "");
  listeners.mousedown(at(150));
  assert.equal(element.style.cursor, "");
  listeners.mousedown(at(397));
  assert.equal(element.style.cursor, "grabbing");
  listeners.mousemove(at(150));
  assert.equal(element.style.cursor, "grabbing");
  windowListeners.mouseup();
  assert.equal(element.style.cursor, "");
  listeners.mousemove(at(397));
  listeners.mouseleave();
  assert.equal(element.style.cursor, "");
  // A right-to-left layout puts the scrollbar at the start.
  element.clientLeft = 6;
  listeners.mousemove(at(103));
  assert.equal(element.style.cursor, "pointer");
  element.scrollHeight = 400;
  listeners.mousemove(at(103));
  assert.equal(element.style.cursor, "");
  cleanup();
  assert.deepEqual(Object.keys(listeners), []);
  assert.deepEqual(Object.keys(windowListeners), []);

  hover = false;
  useScrollbarCursor(element);
  assert.equal(effects.pop()(), undefined);
  assert.deepEqual(Object.keys(listeners), []);
});

test("a crop without a timeline shows the empty state and the generate fallback for active crops", async () => {
  const empty = timeline({
    generated: false,
    can_generate: true,
    sections: [],
    stats: { ...timeline().stats, activities: 0 },
  });
  const h = timelineHarness(empty, {
    generateCropTimeline: async () => ({
      success: true,
      data: timeline({ alert: { show: true } }),
    }),
  });
  const state = find(h.render(), "TimelineEmptyState");
  assert.ok(state);
  assert.equal(find(h.render(), "TimelineSummary"), undefined);
  state.props.onGenerate();
  assert.ok(find(h.render(), "TimelineGeneratingLoader"));
  await tick();
  const tree = h.render();
  assert.ok(find(tree, "TimelineReadyAlert"));
  assert.deepEqual(h.workspace, [["refresh"]]);
});

function wizard(status) {
  const runtime = hooks();
  const generated = [];
  const server = {
    id: 41,
    farm: { id: 8 },
    revision: 12,
    status,
    next_step: 3,
    completed_step: 2,
    can_finalize: true,
    has_pending_edit: status === "active",
    wizard_progress: {
      crop_selection: "completed",
      boundary: "completed",
      review_save: "pending",
    },
  };
  const deps = {
    react: runtime.react,
    "next-intl": { useTranslations: () => (key) => key },
    "react-hot-toast": { success: () => {}, error: () => {} },
    "@headlessui/react": Object.fromEntries(
      [
        "Dialog",
        "DialogBackdrop",
        "DialogPanel",
        "DialogTitle",
        "Description",
      ].map((name) => [name, name]),
    ),
    "@/actions/account/farm-crops": {
      getFarmerCrop: async () => ({ success: true, data: server }),
      getCropReview: async () => ({ success: true, data: server }),
      finalizeFarmerCrop: async () => ({
        success: true,
        data: { ...server, status: "active" },
      }),
    },
    "@/icons": new Proxy({}, { get: (_, name) => name }),
    "./CropUi": {
      CropNotice: "Notice",
      cropButton: "button",
      cropPrimary: "primary",
    },
    "./CropWizardStepper": {
      default: "Stepper",
      cropSteps: ["crop_selection", "boundary", "review_save"],
    },
  };
  for (const name of [
    "CropSelectionStep",
    "CropBoundaryStep",
    "CropReviewStep",
    "CropConfirmDialog",
  ])
    deps[`./${name}`] = name;
  const Component = load(
    base + "crops/_components/CropWizardDialog.tsx",
    deps,
  ).default;
  const props = {
    id: 41,
    onClose: () => {},
    onChanged: () => {},
    onSaved: () => {},
    onGenerateTimeline: (id) => generated.push(id),
  };
  return {
    generated,
    render: () => runtime.render(Component, props),
  };
}
const submitLabel = (tree) =>
  [
    nodes(tree).find((n) => n.type === "button" && n.props.type === "submit")
      .props.children,
  ]
    .flat()
    .find((child) => typeof child === "string");

test("the wizard shows Save & Generate only in add mode and Edit keeps Update Crop without touching the timeline", async () => {
  for (const [status, label, generates] of [
    ["draft", "saveCrop", true],
    ["active", "updateCrop", false],
  ]) {
    const h = wizard(status);
    h.render();
    await tick();
    h.render();
    await tick();
    const tree = h.render();
    assert.equal(submitLabel(tree), label);
    await find(tree, "CropReviewStep").props.onFinalize(12);
    assert.deepEqual(h.generated, generates ? [41] : []);
  }
});

test("the timeline page is a full-page workspace that keeps Crop Manager active", () => {
  const config = load(base + "_config/accountModules.ts", {
    "@/icons": new Proxy({}, { get: (_, name) => name }),
  });
  const route = config.resolveAccountRoute("/account/crop-timeline/41");
  assert.deepEqual(clone(route), {
    mode: "full-page",
    activeModule: "crop-manager",
    titleKey: "modules.crop-manager",
  });
  assert.equal(config.resolveAccountRoute("/account/crops").mode, "panel");
  assert.equal(
    config.resolveAccountRoute("/account/crop-timelines/41").activeModule,
    null,
  );
});

test("English/Hindi timeline messages match and keep their placeholders", () => {
  const read = (locale) =>
    JSON.parse(
      fs.readFileSync(path.join("src/messages", `${locale}.json`), "utf8"),
    );
  const flatten = (object, prefix = "") =>
    Object.entries(object).flatMap(([key, value]) =>
      typeof value === "object"
        ? flatten(value, `${prefix}${key}.`)
        : [[`${prefix}${key}`, value]],
    );
  const en = Object.fromEntries(flatten(read("en").farmerCropTimeline));
  const hi = Object.fromEntries(flatten(read("hi").farmerCropTimeline));
  assert.deepEqual(Object.keys(hi).sort(), Object.keys(en).sort());
  const placeholders = (text) =>
    [...text.matchAll(/\{(\w+)/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(en))
    assert.deepEqual(placeholders(hi[key]), placeholders(en[key]), key);
  for (const [key, english, hindi] of [
    ["scrollToTop", "Scroll to top", "ऊपर जाएँ"],
    ["previousPage", "Previous page", "पिछला भाग"],
    ["nextPage", "Next page", "अगला भाग"],
    ["toolbar.goToCurrent", "Go to current", "वर्तमान पर जाएँ"],
    ["toolbar.noCurrent", "No current activity", "कोई वर्तमान गतिविधि नहीं"],
  ]) {
    assert.equal(en[key], english, key);
    assert.equal(hi[key], hindi, key);
  }
  for (const key of [
    "updateCrop",
    "viewTimeline",
    "timelineNotGenerated",
    "generateTimeline",
    "lockedSelection",
    "sowingShiftNote",
  ]) {
    assert.ok(read("en").farmerCrops[key], key);
    assert.ok(read("hi").farmerCrops[key], key);
  }
  assert.equal(read("en").farmerCrops.timelineUnavailable, undefined);
});

test("cancelled crops can be deleted permanently after confirmation; drafts and active crops keep their actions", async () => {
  const deleted = [];
  const notices = [];
  let removed = 0;
  const Confirm = load(base + "crops/_components/CropDeleteConfirm.tsx", {
    react: {
      useRef: (value) => ({ current: value }),
      useState: (value) => [value, () => {}],
    },
    "next-intl": { useTranslations: () => (key) => key },
    "react-hot-toast": {
      success: (message) => notices.push(["success", message]),
      error: (message) => notices.push(["error", message]),
    },
    "@/actions/account/farm-crops": {
      deleteFarmerCrop: async (id) => {
        deleted.push(id);
        return {
          success: true,
          message: "Crop removed from active cultivation.",
        };
      },
    },
    "./CropConfirmDialog": "CropConfirmDialog",
  }).default;
  const dialog = (status) =>
    Confirm({
      crop: { id: 41, name: "Wheat", status },
      onClose: () => {},
      onRemoved: () => removed++,
    });
  assert.equal(dialog("draft").props.confirmLabel, "deleteDraft");
  assert.equal(dialog("active").props.confirmLabel, "cancelCrop");
  const cancelled = dialog("cancelled");
  assert.equal(cancelled.props.title, "deleteCrop");
  // Permanent deletions use the red confirm button; cancelling keeps the green one.
  assert.equal(cancelled.props.danger, true);
  assert.equal(dialog("draft").props.danger, true);
  assert.equal(dialog("active").props.danger, false);
  assert.equal(cancelled.props.description, "deleteCropDescription");
  // Nothing is deleted until the farmer confirms.
  assert.deepEqual(deleted, []);
  await cancelled.props.onConfirm();
  assert.deepEqual(deleted, [41]);
  assert.equal(removed, 1);
  assert.deepEqual(notices, [["success", "cropDeleted"]]);
  const item = fs.readFileSync(
    base + "crops/_components/CropListItem.tsx",
    "utf8",
  );
  assert.match(item, /editable \|\| crop\.status === "cancelled"/);
});
