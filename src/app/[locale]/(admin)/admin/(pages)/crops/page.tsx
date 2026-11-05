import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropsHeader from "./_components/CropsHeader";
import CropsContent from "./_components/CropsContent";

export const instant = false;

export default async function CropsPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crops");
  return (
    <>
      <CropsHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <CropsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
