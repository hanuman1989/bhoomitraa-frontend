import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import SeasonsHeader from "../../_components/SeasonsHeader";
import SeasonEditor from "../../_components/SeasonEditor";

export const instant = false;

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seasons");
  return (
    <>
      <SeasonsHeader mode="edit" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <SeasonEditor id={id} />
      </Suspense>
    </>
  );
}
