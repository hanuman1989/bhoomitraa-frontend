const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");

const file = "src/components/common/Tooltip.tsx";
function loadTooltip() {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const deps = {
    "react/jsx-runtime": jsx,
    "@/utils": { cn: (...classes) => classes.filter(Boolean).join(" ") },
  };
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: (name) => {
      if (!Object.hasOwn(deps, name))
        throw Error(`Unexpected dependency ${name}`);
      return deps[name];
    },
  });
  return mod.exports.default;
}
const nodes = (tree) =>
  !tree || typeof tree !== "object"
    ? []
    : Array.isArray(tree)
      ? tree.flatMap(nodes)
      : [tree, ...nodes(tree.props?.children)];

const Tooltip = loadTooltip();
const render = (props) => Tooltip({ children: "trigger", ...props });
const bubbleOf = (tree) =>
  nodes(tree).find(
    (n) => n.type === "span" && /\binvisible\b/.test(n.props.className),
  );

test("the tooltip is shared: a dark bubble shown on hover and keyboard focus", () => {
  const tree = render({ content: "Expand all" });
  assert.match(tree.props.className, /group\/tooltip/);
  assert.match(tree.props.className, /\binline-flex\b/);
  const tip = bubbleOf(tree);
  assert.match(tip.props.className, /\binvisible\b/);
  assert.match(tip.props.className, /pointer-events-none/);
  assert.match(tip.props.className, /group-hover\/tooltip:visible/);
  assert.match(tip.props.className, /group-has-focus-visible\/tooltip:visible/);
  const bubble = nodes(tip).find((n) => n.props?.children === "Expand all");
  assert.match(bubble.props.className, /rounded-lg/);
  // Short text stays on one line; long text wraps at a maximum width.
  assert.match(bubble.props.className, /\bw-max\b/);
  assert.match(bubble.props.className, /\bmax-w-xs\b/);
  assert.match(bubble.props.className, /bg-gray-800/);
  assert.match(bubble.props.className, /dark:bg-gray-700/);
  assert.match(bubble.props.className, /text-white/);
});

test("a tooltip without an id repeats the trigger's name and is hidden from assistive technology", () => {
  const named = bubbleOf(render({ content: "Expand all" }));
  assert.equal(named.props["aria-hidden"], true);
  assert.equal(named.props.role, undefined);
  const described = bubbleOf(
    render({ content: "No current activity", id: "tip" }),
  );
  assert.equal(described.props.role, "tooltip");
  assert.equal(described.props.id, "tip");
  assert.equal(described.props["aria-hidden"], undefined);
});

test("the tooltip sits on the requested side with logical start and end", () => {
  const side = (value) =>
    bubbleOf(render({ content: "Tip", side: value })).props.className;
  assert.match(side(undefined), /\bbottom-full\b.*\bmb-2\.5\b/);
  assert.match(side("bottom"), /\btop-full\b.*\bmt-2\.5\b/);
  assert.match(side("start"), /\bend-full\b.*\bme-2\.5\b/);
  assert.match(side("end"), /\bstart-full\b.*\bms-2\.5\b/);
  // Logical sides only, so right-to-left layouts mirror them.
  for (const value of [undefined, "bottom", "start", "end"])
    assert.doesNotMatch(side(value), /\b(left|right)-/);
});

test("without content only the trigger renders, and the wrapper takes extra classes", () => {
  const tree = render({ content: null, className: "absolute end-4" });
  assert.equal(bubbleOf(tree), undefined);
  assert.deepEqual([tree.props.children].flat().filter(Boolean), ["trigger"]);
  assert.match(tree.props.className, /absolute end-4/);
});
