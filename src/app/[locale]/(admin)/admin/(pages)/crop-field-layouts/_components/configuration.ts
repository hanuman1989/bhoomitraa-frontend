import type {
  FieldLayoutConfiguration,
  FieldLayoutConfigurationField,
  FieldLayoutDefinition,
} from "@/types/admin/cropFieldLayout";

// Shift the decimal exponent to avoid values such as 28.999999999999996 cm.
function shiftDecimal(value: number, places: number): number {
  const [digits, exponent = "0"] = value.toString().split("e");
  return Number(`${digits}e${Number(exponent) + places}`);
}

function usesCentimeters(field: FieldLayoutConfigurationField): boolean {
  return field.storage_unit === "m" && field.display_unit === "cm";
}

export function displayConfigurationNumber(
  field: FieldLayoutConfigurationField,
  value: number,
): number {
  return usesCentimeters(field) ? shiftDecimal(value, 2) : value;
}

export function configurationUnit(field: FieldLayoutConfigurationField) {
  return field.display_unit === "count" ? null : field.display_unit;
}

export function configurationDefaults(
  definition: FieldLayoutDefinition | undefined,
  configuration: FieldLayoutConfiguration = {},
): Record<string, string> {
  return Object.fromEntries(
    (definition?.fields ?? []).map((field) => {
      const saved = configuration[field.key];
      return [
        field.key,
        typeof saved === "number"
          ? String(displayConfigurationNumber(field, saved))
          : String(saved ?? field.default ?? ""),
      ];
    }),
  );
}

export function applicableConfigurationFields(
  definition: FieldLayoutDefinition,
  values: Readonly<Record<string, string | number>>,
) {
  return definition.fields.filter((field) =>
    Object.entries(field.required_when ?? {}).every(([key, expectedValue]) => {
      const controller = definition.fields.find(
        (candidate) => candidate.key === key,
      );
      return (values[key] || controller?.default) === expectedValue;
    }),
  );
}

type ConfigurationError = "required" | "invalid" | "rowsDoNotFit";

export function prepareConfiguration(
  definition: FieldLayoutDefinition,
  values: Readonly<Record<string, string>>,
): {
  configuration: FieldLayoutConfiguration;
  errors: Record<string, ConfigurationError>;
} {
  const configuration: FieldLayoutConfiguration = {};
  const errors: Record<string, ConfigurationError> = {};
  for (const field of applicableConfigurationFields(definition, values)) {
    const value = values[field.key]?.trim() || field.default || "";
    if (value === "") {
      if (field.required || field.required_when) errors[field.key] = "required";
      continue;
    }
    if (field.type === "select") {
      if (field.options?.includes(value)) configuration[field.key] = value;
      else errors[field.key] = "invalid";
      continue;
    }

    const input = Number(value);
    const stored = usesCentimeters(field) ? shiftDecimal(input, -2) : input;
    if (
      !Number.isFinite(stored) ||
      (field.type === "integer" && !Number.isInteger(stored)) ||
      (field.min !== undefined && stored < field.min) ||
      (field.max !== undefined && stored > field.max)
    ) {
      errors[field.key] = "invalid";
      continue;
    }
    configuration[field.key] = stored;
  }

  if (definition.value === "raised_bed_multi_row") {
    const { rows_per_bed, row_spacing_m, bed_width_m } = configuration;
    if (
      typeof rows_per_bed === "number" &&
      typeof row_spacing_m === "number" &&
      typeof bed_width_m === "number" &&
      (rows_per_bed - 1) * row_spacing_m > bed_width_m + 1e-9
    ) {
      errors.row_spacing_m = "rowsDoNotFit";
    }
  }
  return { configuration, errors };
}
