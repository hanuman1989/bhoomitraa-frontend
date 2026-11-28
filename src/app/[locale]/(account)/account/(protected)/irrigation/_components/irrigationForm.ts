import type {
  CreateIrrigationAssetInput,
  IrrigationAsset,
  IrrigationAssetType,
  IrrigationGeometry,
  IrrigationOptions,
  IrrigationOwnershipType,
  IrrigationPipelineType,
  IrrigationSourceType,
  IrrigationStatus,
  IrrigationWaterAvailability,
  UpdateIrrigationAssetInput,
} from "@/types/account/irrigation";

/** Laravel's limits (StoreIrrigationAssetRequest and the DECIMAL columns). */
export const IRRIGATION_LIMITS = {
  name: 150,
  notes: 5000,
  depth: 99999999.99,
  diameter: 999999.99,
  length: 9999999999.99,
} as const;

/** One form for both categories. Numbers stay text until they are sent. */
export interface IrrigationFormValues {
  name: string;
  source_type: IrrigationSourceType | "";
  pipeline_type: IrrigationPipelineType | "";
  depth_meters: string;
  diameter_mm: string;
  length_meters: string;
  water_availability: IrrigationWaterAvailability | "";
  ownership_type: IrrigationOwnershipType | "";
  status: IrrigationStatus;
  notes: string;
  geometry: IrrigationGeometry | null;
}

/** Depth is recorded only for the source types the API marks (borewell, open well, pond, reservoir). */
export function supportsDepth(
  options: Pick<IrrigationOptions, "source_types"> | null,
  type: string,
): boolean {
  return Boolean(
    options?.source_types.find((option) => option.key === type)?.supports_depth,
  );
}

/** "120.00" → "120": decimals from the API without trailing zeros, for inputs. */
export function trimDecimal(value: string | null): string {
  if (value === null || value.trim() === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : value;
}

export function irrigationFormDefaults(
  category: IrrigationAssetType,
  asset?: IrrigationAsset | null,
): IrrigationFormValues {
  if (!asset)
    return {
      name: "",
      source_type: "",
      pipeline_type: "",
      depth_meters: "",
      diameter_mm: "",
      length_meters: "",
      water_availability: "",
      ownership_type: "",
      status: "operational",
      notes: "",
      geometry: null,
    };
  return {
    name: asset.name,
    source_type: asset.source_type ?? "",
    pipeline_type: asset.pipeline_type ?? "",
    depth_meters: trimDecimal(asset.depth_meters),
    diameter_mm: trimDecimal(asset.diameter_mm),
    // A drawn route's length is calculated, so the manual input starts empty.
    length_meters:
      category === "pipeline" && !asset.geometry
        ? trimDecimal(asset.length_meters)
        : "",
    water_availability: asset.water_availability ?? "",
    ownership_type: asset.ownership_type ?? "",
    status: asset.status,
    notes: asset.notes ?? "",
    geometry: asset.geometry,
  };
}

export type IrrigationNumberError = "invalid" | "positive" | "tooLarge";
/** Optional positive number with at most 2 decimal places, matching Laravel's rules. */
export function irrigationNumberError(
  value: string,
  maximum: number,
): IrrigationNumberError | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(text)) return "invalid";
  if ((text.split(".")[1] ?? "").length > 2) return "invalid";
  const number = Number(text);
  if (!(number > 0)) return "positive";
  return number > maximum ? "tooLarge" : null;
}

const toNumber = (value: string) =>
  value.trim() ? Number(value.trim()) : null;

export function sameGeometry(
  a: IrrigationGeometry | null,
  b: IrrigationGeometry | null,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Request body. Create sends the category; edit never does, and sends the
 * location only when it changed (null removes it). A pipeline with a route gets
 * its length from the server, so a manual length is sent only without one.
 */
export function irrigationPayload(
  category: IrrigationAssetType,
  values: IrrigationFormValues,
  options: Pick<IrrigationOptions, "source_types"> | null,
  original?: IrrigationAsset | null,
): CreateIrrigationAssetInput | UpdateIrrigationAssetInput {
  const geometryChanged = original
    ? !sameGeometry(values.geometry, original.geometry)
    : values.geometry !== null;
  const common = {
    name: values.name.trim(),
    ownership_type: values.ownership_type || null,
    status: values.status,
    notes: values.notes.trim() || null,
    ...(geometryChanged && { geometry: values.geometry }),
  };
  const details =
    category === "source"
      ? {
          source_type: values.source_type as IrrigationSourceType,
          depth_meters: supportsDepth(options, values.source_type)
            ? toNumber(values.depth_meters)
            : null,
          water_availability: values.water_availability || null,
        }
      : {
          pipeline_type: values.pipeline_type as IrrigationPipelineType,
          diameter_mm: toNumber(values.diameter_mm),
          ...(values.geometry === null && {
            length_meters: toNumber(values.length_meters),
          }),
        };
  const body = { ...common, ...details };
  return (original ? body : { asset_type: category, ...body }) as
    CreateIrrigationAssetInput | UpdateIrrigationAssetInput;
}

/** Laravel field names this form can show an error beside. */
export const irrigationFormFields = [
  "name",
  "source_type",
  "pipeline_type",
  "depth_meters",
  "diameter_mm",
  "length_meters",
  "water_availability",
  "ownership_type",
  "status",
  "notes",
  "geometry",
] as const satisfies readonly (keyof IrrigationFormValues)[];
