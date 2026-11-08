import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import SeedLotHeader from "./_components/SeedLotHeader";
import SeedLotsContent from "./_components/SeedLotsContent";

export const instant = false;
export default async function Page({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seedLots");
  return (
    <>
      <SeedLotHeader mode="list" />
      <Suspense
        fallback={<SuspenseFallback variant="table" title={t("loading")} />}
      >
        <SeedLotsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
