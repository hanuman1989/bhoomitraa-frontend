import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import CropsHeader from "../_components/CropsHeader";
import CropEditor from "../_components/CropEditor";

export const instant = false;

export default async function CreateCropPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crops");
  return (
    <>
      <CropsHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropEditor />
      </Suspense>
    </>
  );
}
