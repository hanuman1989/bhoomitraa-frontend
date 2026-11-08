import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import {
  cropActivityTemplatesAPI,
  getTemplateChoices,
} from "@/lib/apis/admin/cropActivityTemplates";
import {
  getTimelineSelections,
  getTimelineRegions,
} from "@/lib/apis/admin/cropStageTimelines";
import type { CropActivityTemplate } from "@/types/admin/cropActivityTemplate";
import type {
  TimelineChoices,
  TimelineSelections,
  TimelineState,
} from "@/types/admin/cropStageTimeline";
import CropActivityTemplateForm from "./CropActivityTemplateForm";

export default async function CropActivityTemplateEditor({
  id,
}: {
  id?: string;
}) {
  const t = await getTranslations("cropActivityTemplates");
  let template: CropActivityTemplate | null = null;
  let choices: TimelineChoices,
    selections: TimelineSelections,
    states: TimelineState[];
  let canReview = false;
  try {
    const admin = await requireAdmin();
    canReview = admin.is_super_user;
    if (id !== undefined) {
      const numericId = Number(id);
      if (!Number.isSafeInteger(numericId) || numericId < 1) notFound();
      const r = await cropActivityTemplatesAPI.show(numericId);
      if (!r.status || !r.data?.id)
        throw new ApiError(t("feedback.loadFailed"), 502);
      template = r.data;
    }
    [choices, states] = await Promise.all([
      getTemplateChoices(template?.crop_id ?? null, true),
      getTimelineRegions(template?.regions),
    ]);
    selections = template
      ? await getTimelineSelections(choices, {
          crop: template.crop_id,
          variety: template.crop_variety_id,
          category: template.category_id,
          stage: template.crop_stage_id,
          season: template.season_id,
          source: template.source_id,
        })
      : {};
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = await handleActionError(error, t("feedback.loadFailed"));
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
      >
        {failure.message}
      </p>
    );
  }
  return (
    <CropActivityTemplateForm
      key={template?.id ?? "new"}
      template={template}
      choices={choices}
      selections={selections}
      states={states}
      canReview={canReview}
    />
  );
}
