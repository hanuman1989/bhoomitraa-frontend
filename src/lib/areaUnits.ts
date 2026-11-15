import type { AreaUnitsConfig } from "@/types/account/areaUnit";

/** The only compatibility alias confirmed in Laravel's area_units configuration. */
export function canonicalAreaUnit(unit?: string | null): string {
  return unit === "ha" ? "hectare" : (unit ?? "");
}

export function areaNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (
    typeof value === "string" &&
    !/^\s*\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/iu.test(value)
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function getAreaUnit(
  unit: string | null | undefined,
  config?: AreaUnitsConfig | null,
) {
  return (
    config?.units.find((entry) => entry.value === canonicalAreaUnit(unit)) ??
    null
  );
}

export function getSquareMeterFactor(
  unit: string | null | undefined,
  config?: AreaUnitsConfig | null,
): number | null {
  const factor = areaNumber(getAreaUnit(unit, config)?.square_meter_factor);
  return factor !== null && factor > 0 ? factor : null;
}

export function isSupportedAreaUnit(
  unit: string | null | undefined,
  config?: AreaUnitsConfig | null,
) {
  // Aliases may be displayed, but new API writes require a configured code.
  return Boolean(
    unit &&
    config?.units.some((entry) => entry.value === unit) &&
    getSquareMeterFactor(unit, config) !== null,
  );
}

export function getAreaUnitLabel(
  unit: string | null | undefined,
  config: AreaUnitsConfig | null | undefined,
  locale: string,
): string | null {
  const entry = getAreaUnit(unit, config);
  return entry
    ? locale === "hi" && entry.label_hi
      ? entry.label_hi
      : entry.label
    : null;
}

export function toSquareMeters(
  value: unknown,
  unit: string | null | undefined,
  config?: AreaUnitsConfig | null,
): number | null {
  const number = areaNumber(value),
    factor = getSquareMeterFactor(unit, config);
  const result = number !== null && factor !== null ? number * factor : null;
  return result !== null && Number.isFinite(result) ? result : null;
}

export function fromSquareMeters(
  value: unknown,
  unit: string | null | undefined,
  config?: AreaUnitsConfig | null,
): number | null {
  const number = areaNumber(value),
    factor = getSquareMeterFactor(unit, config);
  const result = number !== null && factor !== null ? number / factor : null;
  return result !== null && Number.isFinite(result) ? result : null;
}

export function convertArea(
  value: unknown,
  fromUnit: string,
  toUnit: string,
  config?: AreaUnitsConfig | null,
) {
  return fromSquareMeters(
    toSquareMeters(value, fromUnit, config),
    toUnit,
    config,
  );
}

export function resolvePreferredAreaUnit(
  preference: string | null | undefined,
  config?: AreaUnitsConfig | null,
): string | null {
  const unit = preference
    ? canonicalAreaUnit(preference)
    : config?.default_unit;
  return isSupportedAreaUnit(unit, config) ? unit! : null;
}

/** Display only; calculations retain their original precision. */
export function formatArea(
  value: unknown,
  locale: string,
  precision = 3,
): string | null {
  const number = areaNumber(value);
  return number === null
    ? null
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(number);
}
