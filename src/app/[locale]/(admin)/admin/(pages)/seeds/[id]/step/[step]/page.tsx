import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import SeedEditor from "../../../_components/SeedEditor";

export const instant = false;
export default async function SeedStepPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; step: string }>;
}) {
  const { locale, id, step } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seeds");
  return (
    <Suspense
      fallback={<SuspenseFallback variant="page" title={t("loading")} />}
    >
      <SeedEditor id={id} step={step} />
    </Suspense>
  );
}
