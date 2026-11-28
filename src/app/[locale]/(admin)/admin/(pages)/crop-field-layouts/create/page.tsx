import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import FieldLayoutEditor from "../_components/FieldLayoutEditor";

export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropFieldLayouts");
  return (
    <Suspense
      fallback={<SuspenseFallback variant="page" title={t("loading")} />}
    >
      <FieldLayoutEditor />
    </Suspense>
  );
}
