import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import ActivityCategoriesHeader from "./_components/ActivityCategoriesHeader";
import ActivityCategoriesContent from "./_components/ActivityCategoriesContent";

export const instant = false;

export default async function ActivityCategoriesPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("activityCategories");
  return (
    <>
      <ActivityCategoriesHeader />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={8} title={t("loading")} />
        }
      >
        <ActivityCategoriesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
