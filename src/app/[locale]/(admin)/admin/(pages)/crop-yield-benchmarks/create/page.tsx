import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

import CropYieldBenchmarkHeader from "../_components/CropYieldBenchmarkHeader";
import CropYieldBenchmarkEditor from "../_components/CropYieldBenchmarkEditor";

export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropYieldBenchmarks");
  return (
    <>
      <CropYieldBenchmarkHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropYieldBenchmarkEditor />
      </Suspense>
    </>
  );
}
