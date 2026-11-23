"use server";

import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { cropsAPI } from "@/lib/apis/admin/crops";
import { cropStagesAPI } from "@/lib/apis/admin/cropStages";
import {
  getTimelineOption,
  stageTimelinesAPI,
} from "@/lib/apis/admin/cropStageTimelines";
import { activityCategoriesAPI } from "@/lib/apis/admin/activityCategories";
import { cropActivityTemplatesAPI } from "@/lib/apis/admin/cropActivityTemplates";
import { cropVarietiesAPI } from "@/lib/apis/admin/cropVarieties";
import { seasonsAPI } from "@/lib/apis/admin/seasons";
import type { ActionResult, PaginatedResponse } from "@/types/api";
import type {
  CropActivityTemplate,
  TemplateSelectionOption,
} from "@/types/admin/cropActivityTemplate";
import type { BuilderWorkspace } from "@/app/[locale]/(admin)/admin/(pages)/crop-activity-timeline-builders/_components/types";

function validId(id: number) {
  return Number.isSafeInteger(id) && id > 0;
}

// The builder needs every record for one crop; Laravel caps per_page at 100.
async function allPages<T>(
  load: (page: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const records: T[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await load(page);
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      !response.pagination
    )
      throw new ApiError("Invalid list response", 502);
    records.push(...response.data);
    lastPage = response.pagination.last_page;
    page++;
  } while (page <= lastPage);
  return records;
}

/** Read-only workspace for one crop, assembled from existing admin endpoints. */
export async function loadTimelineWorkspace(
  cropId: number,
): Promise<ActionResult<BuilderWorkspace>> {
  const t = await getTranslations("timelineBuilder.feedback");
  try {
    await requireAdmin();
    if (!validId(cropId)) return { success: false, message: t("invalid") };
    const [crop, stages, timelines, templates, categories, varieties, seasons] =
      await Promise.all([
        cropsAPI.show(cropId),
        allPages((page) =>
          cropStagesAPI.list({
            crop_id: cropId,
            status: 1,
            page,
            per_page: 100,
          }),
        ),
        allPages((page) =>
          stageTimelinesAPI.list({
            crop_id: cropId,
            status: 1,
            page,
            per_page: 100,
          }),
        ),
        allPages((page) =>
          cropActivityTemplatesAPI.list({
            crop_id: cropId,
            page,
            per_page: 100,
          }),
        ),
        allPages((page) =>
          activityCategoriesAPI.list({ status: 1, page, per_page: 100 }),
        ),
        // Inactive records stay included so saved selections keep their names.
        allPages((page) =>
          cropVarietiesAPI.list({ crop_id: cropId, page, per_page: 100 }),
        ),
        allPages((page) => seasonsAPI.list({ page, per_page: 100 })),
      ]);
    if (!crop.status || !crop.data?.id)
      return { success: false, message: t("loadFailed") };
    return {
      success: true,
      message: "",
      data: {
        crop: {
          id: crop.data.id,
          name: crop.data.name,
          image_url: crop.data.image_url,
        },
        stages: stages.map(({ id, name, code, sequence }) => ({
          id,
          name,
          code,
          sequence,
        })),
        varieties: varieties.map(({ id, name, slug, is_active }) => ({
          id,
          name: name ?? slug,
          is_active,
        })),
        seasons: seasons.map(({ id, name, slug, is_active }) => ({
          id,
          name: name ?? slug,
          is_active,
        })),
        timelines,
        templates,
        categories: categories.map(({ id, name, icon }) => ({
          id,
          name,
          icon,
        })),
      },
    };
  } catch (error: unknown) {
    return handleActionError<BuilderWorkspace>(error, t("loadFailed"));
  }
}

/** Full record (translations and districts) for section dialogs. */
export async function loadTimelineTemplate(
  id: number,
): Promise<ActionResult<CropActivityTemplate>> {
  const t = await getTranslations("timelineBuilder.feedback");
  try {
    await requireAdmin();
    if (!validId(id)) return { success: false, message: t("invalid") };
    const response = await cropActivityTemplatesAPI.show(id);
    if (!response.status || !response.data?.id)
      return { success: false, message: t("loadFailed") };
    return { success: true, message: "", data: response.data };
  } catch (error: unknown) {
    return handleActionError<CropActivityTemplate>(error, t("loadFailed"));
  }
}

/** Chip labels for Common Configuration knowledge sources kept in localStorage. */
export async function loadSourceLabels(
  ids: number[],
): Promise<ActionResult<TemplateSelectionOption[]>> {
  const t = await getTranslations("timelineBuilder.feedback");
  try {
    await requireAdmin();
    if (!Array.isArray(ids) || ids.length > 100 || !ids.every(validId))
      return { success: false, message: t("invalid") };
    const options = await Promise.all(
      ids.map((id) => getTimelineOption("source", id)),
    );
    return {
      success: true,
      message: "",
      data: options.map(({ id, label, is_active, verified }) => ({
        id,
        label,
        is_active,
        verified,
      })),
    };
  } catch (error: unknown) {
    return handleActionError<TemplateSelectionOption[]>(error, t("loadFailed"));
  }
}
