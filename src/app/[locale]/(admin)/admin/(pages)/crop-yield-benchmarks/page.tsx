import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropYieldBenchmarkHeader from "./_components/CropYieldBenchmarkHeader";
import CropYieldBenchmarksContent from "./_components/CropYieldBenchmarksContent";

export const instant = false;
export default async function Page({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropYieldBenchmarks");
  return (
    <>
      <CropYieldBenchmarkHeader mode="list" />
      <Suspense
        fallback={<SuspenseFallback variant="table" title={t("loading")} />}
      >
        <CropYieldBenchmarksContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
