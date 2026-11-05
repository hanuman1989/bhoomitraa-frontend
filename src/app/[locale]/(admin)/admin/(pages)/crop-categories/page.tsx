import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropCategoriesHeader from "./_components/CropCategoriesHeader";
import CropCategoriesContent from "./_components/CropCategoriesContent";

export const instant = false;

export default async function CropCategoriesPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropCategories");
  return (
    <>
      <CropCategoriesHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <CropCategoriesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
