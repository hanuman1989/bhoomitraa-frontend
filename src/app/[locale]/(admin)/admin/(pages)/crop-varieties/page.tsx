import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropVarietiesHeader from "./_components/CropVarietiesHeader";
import CropVarietiesContent from "./_components/CropVarietiesContent";

export const instant = false;
export default async function CropVarietiesPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropVarieties");
  return (
    <>
      <CropVarietiesHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <CropVarietiesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
