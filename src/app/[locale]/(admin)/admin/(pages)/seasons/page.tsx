import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import SeasonsHeader from "./_components/SeasonsHeader";
import SeasonsContent from "./_components/SeasonsContent";

export const instant = false;

export default async function SeasonsPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seasons");
  return (
    <>
      <SeasonsHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <SeasonsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
