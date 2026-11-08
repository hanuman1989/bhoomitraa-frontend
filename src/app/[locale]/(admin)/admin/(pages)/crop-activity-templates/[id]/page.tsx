import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import CropActivityTemplatesHeader from "../_components/CropActivityTemplatesHeader";
import CropActivityTemplateDetails from "../_components/CropActivityTemplateDetails";

export const instant = false;
export default async function CropActivityTemplateDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropActivityTemplates");
  return (
    <>
      <CropActivityTemplatesHeader mode="preview" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropActivityTemplateDetails id={id} />
      </Suspense>
    </>
  );
}
