import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

import FertilizerRecommendationHeader from "../_components/FertilizerRecommendationHeader";
import FertilizerRecommendationEditor from "../_components/FertilizerRecommendationEditor";

export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fertilizerRecommendations");
  return (
    <>
      <FertilizerRecommendationHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <FertilizerRecommendationEditor />
      </Suspense>
    </>
  );
}
