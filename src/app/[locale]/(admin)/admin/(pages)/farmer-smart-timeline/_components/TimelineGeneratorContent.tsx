import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { getTimelineOptions } from "@/lib/apis/admin/cropStageTimelines";
import { handleActionError } from "@/lib/api/handleActionError";
import type { TimelineChoices } from "@/types/admin/cropStageTimeline";
import TimelineGeneratorForm from "./TimelineGeneratorForm";

export default async function TimelineGeneratorContent() {
  const t = await getTranslations("farmerSmartTimeline");
  await requireAdmin();
  const choices: TimelineChoices = {};
  let failure = "";
  const results = await Promise.allSettled([
    getTimelineOptions("crop", null, true),
    getTimelineOptions("season", null, true),
    getTimelineOptions("district", null, true),
  ]);
  for (const [index, kind] of (
    ["crop", "season", "district"] as const
  ).entries()) {
    const result = results[index];
    if (result.status === "fulfilled") choices[kind] = result.value;
    else
      failure = (
        await handleActionError(result.reason, t("feedback.loadFailed"))
      ).message;
  }
  return <TimelineGeneratorForm choices={choices} initialFailure={failure} />;
}
