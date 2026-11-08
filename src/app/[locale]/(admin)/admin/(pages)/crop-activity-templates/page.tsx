import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropActivityTemplatesHeader from "./_components/CropActivityTemplatesHeader";
import CropActivityTemplatesContent from "./_components/CropActivityTemplatesContent";

export const instant = false;

export default async function CropActivityTemplatesPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropActivityTemplates");
  return (
    <>
      <CropActivityTemplatesHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <CropActivityTemplatesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
