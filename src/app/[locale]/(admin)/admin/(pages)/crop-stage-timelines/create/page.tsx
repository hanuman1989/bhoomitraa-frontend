import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import StageTimelinesHeader from "../_components/StageTimelinesHeader";
import StageTimelineEditor from "../_components/StageTimelineEditor";

export const instant = false;

export default async function CreateStageTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
} & PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stageTimelines");
  return (
    <>
      <StageTimelinesHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <StageTimelineEditor searchParams={searchParams} />
      </Suspense>
    </>
  );
}
