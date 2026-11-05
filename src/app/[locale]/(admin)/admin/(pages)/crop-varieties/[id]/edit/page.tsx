import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import CropVarietiesHeader from "../../_components/CropVarietiesHeader";
import CropVarietyEditor from "../../_components/CropVarietyEditor";
export const instant = false;
export default async function EditCropVarietyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropVarieties");
  return (
    <>
      <CropVarietiesHeader mode="edit" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropVarietyEditor id={id} />
      </Suspense>
    </>
  );
}
