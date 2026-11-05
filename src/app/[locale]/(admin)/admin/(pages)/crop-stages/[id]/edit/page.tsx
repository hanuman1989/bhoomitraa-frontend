import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import CropStagesHeader from "../../_components/CropStagesHeader";
import CropStageEditor from "../../_components/CropStageEditor";

export const instant = false;

export default async function EditCropStagePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropStages");
  return (
    <>
      <CropStagesHeader mode="edit" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropStageEditor id={id} />
      </Suspense>
    </>
  );
}
