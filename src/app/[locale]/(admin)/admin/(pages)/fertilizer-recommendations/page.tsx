import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import FertilizerRecommendationHeader from "./_components/FertilizerRecommendationHeader";
import FertilizerRecommendationsContent from "./_components/FertilizerRecommendationsContent";

export const instant = false;
export default async function Page({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fertilizerRecommendations");
  return (
    <>
      <FertilizerRecommendationHeader mode="list" />
      <Suspense
        fallback={<SuspenseFallback variant="table" title={t("loading")} />}
      >
        <FertilizerRecommendationsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
