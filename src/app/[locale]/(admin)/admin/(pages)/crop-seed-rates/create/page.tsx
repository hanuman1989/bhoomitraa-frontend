import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

import CropSeedRateHeader from "../_components/CropSeedRateHeader";
import CropSeedRateEditor from "../_components/CropSeedRateEditor";

export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropSeedRates");
  return (
    <>
      <CropSeedRateHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropSeedRateEditor />
      </Suspense>
    </>
  );
}
