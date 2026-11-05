import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import StageTimelinesHeader from "../../_components/StageTimelinesHeader";
import StageTimelineEditor from "../../_components/StageTimelineEditor";

export const instant = false;

export default async function EditStageTimelinePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stageTimelines");
  return (
    <>
      <StageTimelinesHeader mode="edit" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <StageTimelineEditor id={id} />
      </Suspense>
    </>
  );
}
