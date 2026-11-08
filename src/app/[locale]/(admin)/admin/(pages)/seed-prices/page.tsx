import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import SeedPriceHeader from "./_components/SeedPriceHeader";
import SeedPricesContent from "./_components/SeedPricesContent";

export const instant = false;
export default async function Page({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seedPrices");
  return (
    <>
      <SeedPriceHeader mode="list" />
      <Suspense
        fallback={<SuspenseFallback variant="table" title={t("loading")} />}
      >
        <SeedPricesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
