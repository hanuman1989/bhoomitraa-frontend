import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropVarietiesHeader from "../_components/CropVarietiesHeader";
import CropVarietyEditor from "../_components/CropVarietyEditor";
export const instant = false;
export default async function CreateCropVarietyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
} & Pick<PageProps, "searchParams">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropVarieties");
  return (
    <>
      <CropVarietiesHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropVarietyEditor searchParams={searchParams} />
      </Suspense>
    </>
  );
}
