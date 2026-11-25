"use server";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/userAuth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import {
  accountCropCatalogAPI,
  accountFarmCropsAPI,
} from "@/lib/apis/account/farm-crops";
import type {
  ActionResult,
  ApiParams,
  ApiResponse,
  PaginatedResponse,
} from "@/types/api";
import type {
  BoundaryStepPayload,
  CropCatalog,
  CropDetail,
  CropFilters,
  CropSaveResult,
  CropSelection,
} from "@/types/account/farmCrop";

async function read<T>(
  request: () => Promise<ApiResponse<T>>,
): Promise<ActionResult<T>> {
  const t = await getTranslations("farmerCrops");
  try {
    await requireUser();
    const response = await request();
    return {
      success: response.status,
      data: response.data,
      message: response.status ? "" : t("loadFailed"),
    };
  } catch (error) {
    return handleActionError<T>(error, t("loadFailed"));
  }
}
export async function getCropCatalog<K extends keyof CropCatalog>(
  kind: K,
  params: ApiParams = {},
): Promise<ActionResult<PaginatedResponse<CropCatalog[K]>>> {
  const t = await getTranslations("farmerCrops");
  try {
    await requireUser();
    const response = await accountCropCatalogAPI.list(kind, params);
    return {
      success: response.status,
      data: response,
      message: response.status ? "" : t("loadFailed"),
    };
  } catch (error) {
    return handleActionError(error, t("loadFailed"));
  }
}
export async function getCropOptions<
  K extends "seasons" | "categories" | "varieties",
>(kind: K, params: ApiParams = {}): Promise<ActionResult<CropCatalog[K][]>> {
  const t = await getTranslations("farmerCrops");
  try {
    await requireUser();
    const first = await accountCropCatalogAPI.list(kind, {
      ...params,
      per_page: 100,
    });
    if (!first.status) return { success: false, message: t("loadFailed") };
    const records = [...first.data];
    for (let page = 2; page <= first.pagination.last_page; page++) {
      const next = await accountCropCatalogAPI.list(kind, {
        ...params,
        per_page: 100,
        page,
      });
      if (!next.status) return { success: false, message: t("loadFailed") };
      records.push(...next.data);
    }
    return { success: true, data: records, message: "" };
  } catch (error) {
    return handleActionError(error, t("loadFailed"));
  }
}
export async function getFarmerCrops(filters: CropFilters) {
  const t = await getTranslations("farmerCrops");
  try {
    await requireUser();
    const response = await accountFarmCropsAPI.list(filters);
    return {
      success: response.status,
      data: response,
      message: response.status ? "" : t("loadFailed"),
    };
  } catch (error) {
    return handleActionError<
      PaginatedResponse<import("@/types/account/farmCrop").CropCycle>
    >(error, t("loadFailed"));
  }
}
export async function getCropSummary(filters: CropFilters = {}) {
  return read(() => accountFarmCropsAPI.summary(filters));
}
export async function getCropMap() {
  return read(() => accountFarmCropsAPI.map());
}
export async function getFarmerCrop(id: number) {
  return read(() => accountFarmCropsAPI.get(id));
}
export async function getCropReview(id: number) {
  return read(() => accountFarmCropsAPI.review(id));
}
export async function getCropOccupancy(farmId: number, excludeCropId?: number) {
  return read(() => accountFarmCropsAPI.occupancy(farmId, excludeCropId));
}

async function mutate(
  request: () => Promise<ApiResponse<CropDetail>>,
): Promise<CropSaveResult> {
  const t = await getTranslations("farmerCrops");
  try {
    await requireUser();
    const response = await request();
    return {
      success: response.status,
      data: response.data,
      message: response.status ? t("saved") : t("saveFailed"),
    };
  } catch (error) {
    return {
      ...(await handleActionError<CropDetail>(error, t("saveFailed"))),
      conflict: error instanceof ApiError && error.status === 409,
    };
  }
}
export async function createFarmerCrop(data: CropSelection, key: string) {
  return mutate(() => accountFarmCropsAPI.create(data, key));
}
export async function saveCropSelection(
  id: number,
  revision: number,
  data: CropSelection,
) {
  return mutate(() => accountFarmCropsAPI.selection(id, revision, data));
}
export async function saveCropBoundary(
  id: number,
  revision: number,
  data: BoundaryStepPayload,
) {
  return mutate(() => accountFarmCropsAPI.boundary(id, revision, data));
}
export async function finalizeFarmerCrop(id: number, revision: number) {
  const result = await mutate(() => accountFarmCropsAPI.finalize(id, revision));
  if (result.success) revalidatePath("/account/crops");
  return result;
}
export async function discardCropEdit(id: number, revision: number) {
  return mutate(() => accountFarmCropsAPI.discardEdit(id, revision));
}
export async function deleteFarmerCrop(id: number): Promise<ActionResult> {
  const t = await getTranslations("farmerCrops");
  try {
    await requireUser();
    const result = await accountFarmCropsAPI.delete(id);
    if (result.status) revalidatePath("/account/crops");
    return {
      success: result.status,
      message: result.status ? t("removed") : t("saveFailed"),
    };
  } catch (error) {
    return handleActionError(error, t("saveFailed"));
  }
}
