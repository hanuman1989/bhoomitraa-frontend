import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import FertilizerHeader from "./_components/FertilizerHeader";
import FertilizersContent from "./_components/FertilizersContent";

export const instant = false;
export default async function FertilizersPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fertilizers");
  return (
    <>
      <FertilizerHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={10} title={t("loading")} />
        }
      >
        <FertilizersContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
