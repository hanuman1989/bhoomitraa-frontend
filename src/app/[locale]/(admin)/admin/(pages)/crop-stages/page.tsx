import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropStagesHeader from "./_components/CropStagesHeader";
import CropStagesContent from "./_components/CropStagesContent";

export const instant = false;

export default async function CropStagesPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropStages");
  return (
    <>
      <CropStagesHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <CropStagesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
