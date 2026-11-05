import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import SeasonsHeader from "../_components/SeasonsHeader";
import SeasonEditor from "../_components/SeasonEditor";

export const instant = false;

export default async function CreateSeasonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seasons");
  return (
    <>
      <SeasonsHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <SeasonEditor />
      </Suspense>
    </>
  );
}
