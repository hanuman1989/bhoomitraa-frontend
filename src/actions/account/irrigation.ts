"use server";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/userAuth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import { accountIrrigationAPI } from "@/lib/apis/account/irrigation";
import type { ActionResult } from "@/types/api";
import type {
  CreateIrrigationAssetInput,
  IrrigationAsset,
  IrrigationFilters,
  IrrigationListResponse,
  IrrigationMapCollection,
  IrrigationOptions,
  IrrigationStatus,
  IrrigationSummary,
  UpdateIrrigationAssetInput,
} from "@/types/account/irrigation";

// The Irrigation Manager keeps its own client state and refreshes it after each
// mutation, so these actions don't revalidate the page (that would re-run its
// server reads for nothing).

export type IrrigationPart = "list" | "summary" | "map" | "options";
export interface IrrigationWorkspaceResult {
  list?: ActionResult<IrrigationListResponse>;
  summary?: ActionResult<IrrigationSummary>;
  map?: ActionResult<IrrigationMapCollection>;
  options?: ActionResult<IrrigationOptions>;
}

/** Record ids are positive whole numbers sent as strings; nothing else reaches a URL. */
function validId(id: unknown): id is string {
  return typeof id === "string" && /^[1-9]\d{0,18}$/.test(id);
}

const filterKeys = [
  "asset_type",
  "source_type",
  "pipeline_type",
  "status",
  "search",
  "page",
  "per_page",
] as const;
const writableKeys = [
  "name",
  "source_type",
  "pipeline_type",
  "geometry",
  "length_meters",
  "diameter_mm",
  "depth_meters",
  "water_availability",
  "ownership_type",
  "status",
  "notes",
] as const;
/** Copies only the named keys that are present, so nothing else (an owner id, for example) is forwarded. */
function pick<T extends object>(input: T, keys: readonly string[]): T {
  return Object.fromEntries(
    keys
      .filter((key) => Object.hasOwn(input, key))
      .map((key) => [key, input[key as keyof T]]),
  ) as T;
}

async function read<T>(
  request: () => Promise<{ status: boolean; data: T }>,
  fallback: string,
): Promise<ActionResult<T>> {
  try {
    const response = await request();
    return response.status
      ? { success: true, data: response.data, message: "" }
      : { success: false, message: fallback };
  } catch (error) {
    return handleActionError<T>(error, fallback);
  }
}

/**
 * Client refetches. The requested parts load in parallel in this one action
 * (Next.js runs a client's Server Actions one at a time). Each part reports its
 * own result, so a failed map request never hides the list.
 */
export async function getIrrigationWorkspace(
  filters: IrrigationFilters,
  parts: IrrigationPart[],
): Promise<IrrigationWorkspaceResult> {
  const t = await getTranslations("farmerIrrigation");
  const fallback = t("errors.loadFailed");
  try {
    await requireUser();
  } catch (error) {
    const failure = await handleActionError(error, fallback);
    return Object.fromEntries(parts.map((part) => [part, failure]));
  }
  const query = pick(filters ?? {}, filterKeys);
  const wanted = new Set(parts);
  const [list, summary, map, options] = await Promise.all([
    wanted.has("list")
      ? read(
          () =>
            accountIrrigationAPI.list(query).then((response) => ({
              status: response.status,
              data: response,
            })),
          fallback,
        )
      : undefined,
    wanted.has("summary")
      ? read(() => accountIrrigationAPI.summary(), fallback)
      : undefined,
    wanted.has("map")
      ? read(() => accountIrrigationAPI.map(query), fallback)
      : undefined,
    wanted.has("options")
      ? read(() => accountIrrigationAPI.options(), fallback)
      : undefined,
  ]);
  return {
    ...(list && { list }),
    ...(summary && { summary }),
    ...(map && { map }),
    ...(options && { options }),
  };
}

export async function getIrrigationAsset(
  id: string,
): Promise<ActionResult<IrrigationAsset>> {
  const t = await getTranslations("farmerIrrigation");
  if (!validId(id)) return { success: false, message: t("errors.loadFailed") };
  try {
    await requireUser();
  } catch (error) {
    return handleActionError(error, t("errors.loadFailed"));
  }
  return read(() => accountIrrigationAPI.show(id), t("errors.loadFailed"));
}

async function save(
  request: () => ReturnType<typeof accountIrrigationAPI.update>,
  message: (asset: IrrigationAsset) => string,
): Promise<ActionResult<IrrigationAsset>> {
  const t = await getTranslations("farmerIrrigation");
  try {
    await requireUser();
    const response = await request();
    return response.status
      ? { success: true, data: response.data, message: message(response.data) }
      : { success: false, message: t("errors.saveFailed") };
  } catch (error) {
    return handleActionError<IrrigationAsset>(error, t("errors.saveFailed"));
  }
}

export async function createIrrigationAsset(
  input: CreateIrrigationAssetInput,
): Promise<ActionResult<IrrigationAsset>> {
  const t = await getTranslations("farmerIrrigation");
  const data = {
    ...pick(input, writableKeys),
    asset_type: input.asset_type,
  } as CreateIrrigationAssetInput;
  return save(
    () => accountIrrigationAPI.create(data),
    (asset) =>
      t(
        asset.asset_type === "source"
          ? "toasts.sourceSaved"
          : "toasts.pipelineSaved",
      ),
  );
}

export async function updateIrrigationAsset(
  id: string,
  input: UpdateIrrigationAssetInput,
): Promise<ActionResult<IrrigationAsset>> {
  const t = await getTranslations("farmerIrrigation");
  if (!validId(id)) return { success: false, message: t("errors.saveFailed") };
  // The category can't change, so asset_type is never forwarded.
  const data = pick(input, writableKeys);
  return save(
    () => accountIrrigationAPI.update(id, data),
    (asset) =>
      t(
        asset.asset_type === "source"
          ? "toasts.sourceSaved"
          : "toasts.pipelineSaved",
      ),
  );
}

export async function changeIrrigationStatus(
  id: string,
  status: IrrigationStatus,
): Promise<ActionResult<IrrigationAsset>> {
  const t = await getTranslations("farmerIrrigation");
  if (!validId(id)) return { success: false, message: t("errors.saveFailed") };
  return save(
    () => accountIrrigationAPI.update(id, { status }),
    (asset) => t("toasts.statusChanged", { status: asset.status_label }),
  );
}

export async function deleteIrrigationAsset(id: string): Promise<ActionResult> {
  const t = await getTranslations("farmerIrrigation");
  if (!validId(id))
    return { success: false, message: t("errors.deleteFailed") };
  try {
    await requireUser();
    const response = await accountIrrigationAPI.remove(id);
    return response.status
      ? { success: true, message: t("toasts.deleted") }
      : { success: false, message: t("errors.deleteFailed") };
  } catch (error) {
    return handleActionError(error, t("errors.deleteFailed"));
  }
}
