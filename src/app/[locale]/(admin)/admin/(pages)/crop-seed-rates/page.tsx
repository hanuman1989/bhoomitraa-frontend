import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropSeedRateHeader from "./_components/CropSeedRateHeader";
import CropSeedRatesContent from "./_components/CropSeedRatesContent";

export const instant = false;
export default async function Page({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropSeedRates");
  return (
    <>
      <CropSeedRateHeader mode="list" />
      <Suspense
        fallback={<SuspenseFallback variant="table" title={t("loading")} />}
      >
        <CropSeedRatesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
