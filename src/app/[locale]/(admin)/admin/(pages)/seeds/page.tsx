import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import SeedHeader from "./_components/SeedHeader";
import SeedsContent from "./_components/SeedsContent";

export const instant = false;
export default async function SeedsPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seeds");
  return (
    <>
      <SeedHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={10} title={t("loading")} />
        }
      >
        <SeedsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
