import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import StageTimelinesHeader from "./_components/StageTimelinesHeader";
import StageTimelinesContent from "./_components/StageTimelinesContent";

export const instant = false;

export default async function StageTimelinesPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stageTimelines");
  return (
    <>
      <StageTimelinesHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <StageTimelinesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
