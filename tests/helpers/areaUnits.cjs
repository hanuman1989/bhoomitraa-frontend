const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Backend metadata fixture only. Production conversions never import test data.
const config = {
  default_unit: "hectare",
  units: [
    [
      "bigha_kaccha",
      "Kaccha Bigha",
      "कच्चा बीघा",
      "1618.74256896",
      "17424 square feet",
    ],
    [
      "bigha_pakka",
      "Pakka Bigha",
      "पक्का बीघा",
      "2529.28548",
      "27225 square feet",
    ],
    ["hectare", "Hectare", "हेक्टेयर", "10000"],
    ["acre", "Acre", "एकड़", "4046.8564224"],
    ["sqm", "Square Metre", "वर्ग मीटर", "1"],
    ["sqft", "Square Foot", "वर्ग फुट", "0.09290304"],
    ["sqyd", "Square Yard", "वर्ग गज", "0.83612736"],
    ["guntha", "Guntha", "गुंठा", "101.17141056"],
  ].map(([value, label, label_hi, square_meter_factor, definition]) => ({
    value,
    label,
    label_hi,
    square_meter_factor,
    ...(definition ? { definition } : {}),
  })),
};
const moduleObject = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/lib/areaUnits.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { module: moduleObject, exports: moduleObject.exports },
);
const utils = moduleObject.exports;
const label = (unit) =>
  utils.getAreaUnitLabel(unit, config, "en") ??
  (unit === "bigha" ? "Bigha (standard unconfirmed)" : "Unconfirmed unit");
const metadata = { config, status: "ready", label, retry() {} };
const dependencies = {
  "@/lib/areaUnits": utils,
  "@/hooks/useAreaUnits": { __esModule: true, default: () => metadata },
  "@/components/common/AreaUnitSelect": "AreaUnitSelect",
};
module.exports = { config, utils, metadata, dependencies };
