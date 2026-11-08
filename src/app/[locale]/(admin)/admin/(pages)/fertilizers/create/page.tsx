import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import FertilizerEditor from "../_components/FertilizerEditor";

export const instant = false;
export default async function CreateFertilizerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fertilizers");
  return (
    <Suspense
      fallback={<SuspenseFallback variant="page" title={t("loading")} />}
    >
      <FertilizerEditor />
    </Suspense>
  );
}
