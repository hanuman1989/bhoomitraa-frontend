import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

import SeedPriceHeader from "../_components/SeedPriceHeader";
import SeedPriceEditor from "../_components/SeedPriceEditor";

export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seedPrices");
  return (
    <>
      <SeedPriceHeader mode="view" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <SeedPriceEditor id={id} viewOnly />
      </Suspense>
    </>
  );
}
