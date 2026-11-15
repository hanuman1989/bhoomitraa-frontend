// Map API colors mirror the existing TailAdmin theme tokens: success-500,
// theme-purple-500, orange-400, blue-light-500, and success-700 for selection.
const farmColors = ["#12b76a", "#7a5af8", "#fd853a", "#0ba5ec"] as const;
export const DEFAULT_FARM_COLOR = farmColors[0];

export function farmMapColor(id: number, selected = false): string {
  if (selected) return "#027a48";
  return Number.isSafeInteger(id)
    ? farmColors[Math.abs(id) % farmColors.length]
    : DEFAULT_FARM_COLOR;
}
