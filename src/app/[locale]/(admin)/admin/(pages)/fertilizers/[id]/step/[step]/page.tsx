import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import FertilizerEditor from "../../../_components/FertilizerEditor";

export const instant = false;
export default async function FertilizerStepPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; step: string }>;
}) {
  const { locale, id, step } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fertilizers");
  return (
    <Suspense
      fallback={<SuspenseFallback variant="page" title={t("loading")} />}
    >
      <FertilizerEditor id={id} step={step} />
    </Suspense>
  );
}
