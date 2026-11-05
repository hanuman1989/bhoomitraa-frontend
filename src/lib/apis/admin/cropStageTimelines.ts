import "server-only";

import { apiRequest } from "@/lib/api/request";
import { ApiError } from "@/lib/api/ApiError";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { cropStagesAPI } from "@/lib/apis/admin/cropStages";
import { cropVarietiesAPI } from "@/lib/apis/admin/cropVarieties";
import { seasonsAPI } from "@/lib/apis/admin/seasons";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import { regionsAPI } from "@/lib/apis/admin/regions";
import type { ApiParams, ApiResponse } from "@/types/api";
import type { Region } from "@/types/admin/region";
import type {
  StageTimeline,
  StageTimelinePayload,
  StageTimelinesResponse,
  TimelineRelationKind,
  TimelineOption,
  TimelineOptionPage,
  TimelineState,
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";

const endpoint = "/admin/crop-stage-timelines";
export const stageTimelinesAPI = {
  list: (params: ApiParams = {}) =>
    apiRequest<StageTimelinesResponse>(endpoint, { params }),
  show: (id: number) =>
    apiRequest<ApiResponse<StageTimeline>>(`${endpoint}/${id}`),
  create: (data: StageTimelinePayload) =>
    apiRequest<ApiResponse<StageTimeline>>(endpoint, { method: "POST", data }),
  update: (id: number, data: StageTimelinePayload) =>
    apiRequest<ApiResponse<StageTimeline>>(`${endpoint}/${id}`, {
      method: "PATCH",
      data,
    }),
  updateStatus: (id: number, is_active: boolean) =>
    apiRequest<ApiResponse<StageTimeline>>(`${endpoint}/${id}/status`, {
      method: "PATCH",
      data: { is_active },
    }),
  delete: (id: number) =>
    apiRequest<ApiResponse<null>>(`${endpoint}/${id}`, { method: "DELETE" }),
};

// Only labels and eligibility flags reach the dropdown; source attachments stay server-side.
export async function getTimelineOption(
  kind: TimelineRelationKind,
  id: number,
): Promise<TimelineOption> {
  switch (kind) {
    case "crop": {
      const r = await cropsAPI.show(id);
      if (!r.status) throw new ApiError("Invalid crop response", 502);
      return {
        id,
        label: r.data.name ?? r.data.slug,
        is_active: r.data.is_active,
      };
    }
    case "stage": {
      const r = await cropStagesAPI.show(id);
      if (!r.status) throw new ApiError("Invalid stage response", 502);
      return {
        id,
        label: r.data.name ?? r.data.code,
        crop_id: r.data.crop_id,
        is_active: r.data.is_active,
      };
    }
    case "variety": {
      const r = await cropVarietiesAPI.show(id);
      if (!r.status) throw new ApiError("Invalid variety response", 502);
      return {
        id,
        label: r.data.name ?? r.data.slug,
        crop_id: r.data.crop_id,
        is_active: r.data.is_active,
      };
    }
    case "season": {
      const r = await seasonsAPI.show(id);
      if (!r.status) throw new ApiError("Invalid season response", 502);
      return {
        id,
        label: r.data.name ?? r.data.slug,
        is_active: r.data.is_active,
      };
    }
    case "source": {
      const r = await knowledgeSourcesAPI.show(id);
      if (!r.status) throw new ApiError("Invalid source response", 502);
      return {
        id,
        label: r.data.title,
        is_active: r.data.is_active,
        verified: r.data.verification_status === "verified",
      };
    }
  }
}

export async function getTimelineOptions(
  kind: TimelineRelationKind,
  cropId: number | null,
  eligible: boolean,
  keyword = "",
  page = 1,
): Promise<TimelineOptionPage> {
  const params = { keyword: keyword || undefined, page, per_page: 20 };
  switch (kind) {
    case "crop": {
      const r = await cropsAPI.list({
        ...params,
        ...(eligible && { is_active: 1 }),
      });
      if (!r.status || !r.pagination)
        throw new ApiError("Invalid crops response", 502);
      return {
        options: r.data.map((crop) => ({
          id: crop.id,
          label: crop.name ?? crop.slug,
          is_active: crop.is_active,
        })),
        pagination: r.pagination,
      };
    }
    case "stage": {
      const r = await cropStagesAPI.list({
        ...params,
        crop_id: cropId,
        ...(eligible && { status: 1 }),
      });
      if (!r.status || !r.pagination)
        throw new ApiError("Invalid stages response", 502);
      return {
        options: r.data.map((stage) => ({
          id: stage.id,
          label: stage.name ?? stage.code,
          crop_id: stage.crop_id,
          is_active: stage.is_active,
        })),
        pagination: r.pagination,
      };
    }
    case "variety": {
      const r = await cropVarietiesAPI.list({
        ...params,
        crop_id: cropId,
        ...(eligible && { status: 1 }),
      });
      if (!r.status || !r.pagination)
        throw new ApiError("Invalid varieties response", 502);
      return {
        options: r.data.map((variety) => ({
          id: variety.id,
          label: variety.name ?? variety.slug,
          crop_id: variety.crop_id,
          is_active: variety.is_active,
        })),
        pagination: r.pagination,
      };
    }
    case "season": {
      const r = await seasonsAPI.list({
        ...params,
        ...(eligible && { status: 1 }),
      });
      if (!r.status || !r.pagination)
        throw new ApiError("Invalid seasons response", 502);
      return {
        options: r.data.map((season) => ({
          id: season.id,
          label: season.name ?? season.slug,
          is_active: season.is_active,
        })),
        pagination: r.pagination,
      };
    }
    case "source": {
      const r = await knowledgeSourcesAPI.list({
        ...params,
        sort_by: "title",
        sort_direction: "asc",
        ...(eligible && { is_active: 1, verification_status: "verified" }),
      });
      if (!r.status || !r.pagination)
        throw new ApiError("Invalid sources response", 502);
      return {
        options: r.data.map((source) => ({
          id: source.id,
          label: source.title,
          is_active: source.is_active,
          verified: source.verification_status === "verified",
        })),
        pagination: r.pagination,
      };
    }
  }
}

async function activeRegions(
  region_type: "state" | "district",
): Promise<Region[]> {
  const result: Region[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const r = await regionsAPI.list({
      region_type,
      is_active: 1,
      per_page: 100,
      page,
    });
    if (!r.status || !r.pagination || !Array.isArray(r.data))
      throw new ApiError("Invalid regions response", 502);
    result.push(...r.data);
    lastPage = r.pagination.last_page;
    page++;
  } while (page <= lastPage);
  return result;
}

export async function getTimelineChoices(
  cropId: number | null,
  eligible: boolean,
  includeSource: boolean,
): Promise<TimelineChoices> {
  const [crop, stage, variety, season, source] = await Promise.all([
    getTimelineOptions("crop", null, eligible),
    !eligible || cropId
      ? getTimelineOptions("stage", cropId, eligible)
      : undefined,
    !eligible || cropId
      ? getTimelineOptions("variety", cropId, eligible)
      : undefined,
    getTimelineOptions("season", null, eligible),
    includeSource ? getTimelineOptions("source", null, false) : undefined,
  ]);
  return { crop, stage, variety, season, source };
}

export async function getTimelineSelections(
  choices: TimelineChoices,
  ids: Partial<Record<TimelineRelationKind, number | null>>,
): Promise<TimelineSelections> {
  const entries = await Promise.all(
    Object.entries(ids).map(async ([key, id]) => {
      const kind = key as TimelineRelationKind;
      return [
        kind,
        id
          ? (choices[kind]?.options.find((option) => option.id === id) ??
            (await getTimelineOption(kind, id)))
          : undefined,
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function getTimelineRegions(
  saved: StageTimeline["regions"] = [],
): Promise<TimelineState[]> {
  const [states, districts] = await Promise.all([
    activeRegions("state"),
    activeRegions("district"),
  ]);
  // Load only saved inactive districts and their missing parents, never villages.
  const missing = saved.filter(
    (region) => !districts.some((district) => district.id === region.id),
  );
  const legacy = await Promise.all(
    missing.map(async (region) => {
      const r = await regionsAPI.show(region.id);
      if (!r.status || r.data.region_type !== "district")
        throw new ApiError("Invalid saved district", 502);
      return r.data;
    }),
  );
  districts.push(...legacy);
  const parentIds = [
    ...new Set(
      districts
        .filter((district) => saved.some((region) => region.id === district.id))
        .map((district) => district.parent_id),
    ),
  ];
  const missingParents = parentIds.filter(
    (id): id is number =>
      id !== null && !states.some((state) => state.id === id),
  );
  states.push(
    ...(await Promise.all(
      missingParents.map(async (id) => {
        const r = await regionsAPI.show(id);
        if (!r.status || r.data.region_type !== "state")
          throw new ApiError("Invalid saved state", 502);
        return r.data;
      }),
    )),
  );
  return states.map((state) => ({
    id: state.id,
    name: state.name ?? String(state.id),
    is_active: state.is_active,
    districts: districts
      .filter((district) => district.parent_id === state.id)
      .map((district) => ({
        id: district.id,
        name: district.name ?? String(district.id),
        is_active: district.is_active,
      })),
  }));
}
