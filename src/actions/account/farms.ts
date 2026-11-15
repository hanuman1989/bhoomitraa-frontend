"use server";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/userAuth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import { ApiError } from "@/lib/api/ApiError";
import { accountFarmsAPI } from "@/lib/apis/account/farms";
import { accountRegionsAPI } from "@/lib/apis/account/regions";
import type { ActionResult, PaginatedResponse } from "@/types/api";
import type {
  Farm,
  FarmBasicPayload,
  FarmDetailsPayload,
  FarmFilters,
  FarmSummary,
  BoundaryDraft,
} from "@/types/account/farm";
import type { FarmRegion, FarmRegionType } from "@/types/account/region";
import { signedFarmSatelliteSources } from "@/components/common/maps/farmStaticMap.server";
import type { FarmSatelliteSources } from "@/components/common/maps/farmStaticMap";

export interface FarmManagerData {
  farms: PaginatedResponse<Farm>;
  summary: FarmSummary;
}

export async function getFarmerFarmSummary(): Promise<
  ActionResult<FarmSummary>
> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    const response = await accountFarmsAPI.summary();
    return response.status
      ? { success: true, data: response.data, message: "" }
      : { success: false, message: t("summaryFailed") };
  } catch (error: unknown) {
    return handleActionError<FarmSummary>(error, t("summaryFailed"));
  }
}

export async function getFarmerFarms(filters: FarmFilters): Promise<
  ActionResult<PaginatedResponse<Farm>> & {
    satellitePreviews?: FarmSatelliteSources;
  }
> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    const response = await accountFarmsAPI.list({
      ...filters,
      include_boundary: 1,
    });
    return response.status
      ? {
          success: true,
          data: response,
          satellitePreviews: signedFarmSatelliteSources(response.data),
          message: "",
        }
      : { success: false, message: t("loadFailed") };
  } catch (error) {
    return handleActionError(error, t("loadFailed"));
  }
}
export async function getFarmManagerData(
  filters: FarmFilters = {},
): Promise<ActionResult<FarmManagerData>> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    const [farms, summary] = await Promise.all([
      accountFarmsAPI.list(filters),
      accountFarmsAPI.summary(),
    ]);
    if (!farms.status || !summary.status)
      return { success: false, message: t("loadFailed") };
    return {
      success: true,
      data: { farms, summary: summary.data },
      message: "",
    };
  } catch (error) {
    return handleActionError(error, t("loadFailed"));
  }
}
export async function getFarmRegions(
  regionType: FarmRegionType,
  parentId?: number,
): Promise<ActionResult<FarmRegion[]>> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    if (
      !["state", "district", "subdistrict"].includes(regionType) ||
      (parentId !== undefined && (!Number.isInteger(parentId) || parentId < 1))
    ) {
      return { success: false, message: t("regionsFailed") };
    }
    const response = await accountRegionsAPI.list(regionType, parentId);
    if (!response.status)
      return { success: false, message: t("regionsFailed") };
    const regions = [...response.data];
    for (let page = 2; page <= response.pagination.last_page; page++) {
      const next = await accountRegionsAPI.list(regionType, parentId, page);
      if (!next.status) return { success: false, message: t("regionsFailed") };
      regions.push(...next.data);
    }
    return {
      success: true,
      data: regions.filter((region) => region.region_type === regionType),
      message: "",
    };
  } catch (error) {
    return handleActionError(error, t("regionsFailed"));
  }
}
export async function getFarmWorkspace(): Promise<
  ActionResult<{
    farms: Farm[];
    summary: FarmSummary;
    satellitePreviews?: FarmSatelliteSources;
  }>
> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    const [first, summary] = await Promise.all([
      accountFarmsAPI.list({ include_boundary: 1, per_page: 100, page: 1 }),
      accountFarmsAPI.summary(),
    ]);
    if (!first.status || !summary.status)
      return { success: false, message: t("loadFailed") };
    const farms = [...first.data];
    for (let page = 2; page <= first.pagination.last_page; page++) {
      const response = await accountFarmsAPI.list({
        include_boundary: 1,
        per_page: 100,
        page,
      });
      if (!response.status) return { success: false, message: t("loadFailed") };
      farms.push(...response.data);
    }
    return {
      success: true,
      data: {
        farms,
        summary: summary.data,
        satellitePreviews: signedFarmSatelliteSources(farms),
      },
      message: "",
    };
  } catch (error) {
    return handleActionError(error, t("loadFailed"));
  }
}
export async function getFarmerFarm(id: number): Promise<ActionResult<Farm>> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    const response = await accountFarmsAPI.get(id);
    return {
      success: response.status,
      data: response.data,
      message: response.status ? "" : t("loadFailed"),
    };
  } catch (error) {
    return handleActionError(error, t("loadFailed"));
  }
}
export async function saveFarmerFarm(
  values: FarmBasicPayload & BoundaryDraft,
  key: string,
  id?: number,
  boundaryOnly = false,
): Promise<ActionResult<Farm>> {
  const t = await getTranslations("farmerFarms");
  let basicSaved = false;
  try {
    await requireUser();
    const basic: FarmBasicPayload = {
      name: values.name,
      description: values.description,
      ownership_type: values.ownership_type,
      area: values.area,
      area_unit: values.area_unit,
      state_id: values.state_id,
      district_id: values.district_id,
      tehsil_id: values.tehsil_id,
      village: values.village,
      address: values.address,
    };
    const boundary: BoundaryDraft = {
      boundary: values.boundary,
      boundary_source: values.boundary_source,
      gps_accuracy_m: values.gps_accuracy_m,
    };
    if (id && !boundaryOnly) {
      const updated = await accountFarmsAPI.update(id, basic);
      if (!updated.status) return { success: false, message: t("saveFailed") };
      basicSaved = true;
    }
    const response = id
      ? await accountFarmsAPI.updateBoundary(id, boundary)
      : await accountFarmsAPI.create({ ...basic, ...boundary }, key);
    return response.status
      ? {
          success: true,
          data: response.data,
          message: t(id ? "updated" : "created"),
        }
      : {
          success: false,
          message: basicSaved
            ? t("partialSaveFailed", { message: t("saveFailed") })
            : t("saveFailed"),
        };
  } catch (error) {
    const result = await handleActionError<Farm>(error, t("saveFailed"));
    if (!id && error instanceof ApiError && error.status === 409)
      return { ...result, message: t("creationConflict") };
    return basicSaved
      ? {
          ...result,
          message: t("partialSaveFailed", { message: result.message }),
        }
      : result;
  }
}
export async function updateFarmerFarmStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<Farm>> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    const response = await accountFarmsAPI.updateStatus(id, active);
    return {
      success: response.status,
      data: response.data,
      message: response.status ? t("updated") : t("saveFailed"),
    };
  } catch (error) {
    return handleActionError(error, t("saveFailed"));
  }
}
export async function updateFarmerFarmDetails(
  id: number,
  values: FarmDetailsPayload,
): Promise<ActionResult<Farm>> {
  const t = await getTranslations("farmerFarms");
  try {
    await requireUser();
    const response = await accountFarmsAPI.updateDetails(id, {
      khasra_number: values.khasra_number,
      khata_number: values.khata_number,
      patwari_halka_number: values.patwari_halka_number,
      soil_type: values.soil_type,
      land_type: values.land_type,
      farmland_type: values.farmland_type,
      water_availability: values.water_availability,
      irrigation_source: values.irrigation_source,
      notes: values.notes,
    });
    return {
      success: response.status,
      data: response.data,
      message: response.status ? t("updated") : t("saveFailed"),
    };
  } catch (error) {
    return handleActionError(error, t("saveFailed"));
  }
}
