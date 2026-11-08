import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";

import SeedLotHeader from "../_components/SeedLotHeader";
import SeedLotEditor from "../_components/SeedLotEditor";

export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seedLots");
  return (
    <>
      <SeedLotHeader mode="view" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <SeedLotEditor id={id} viewOnly />
      </Suspense>
    </>
  );
}
