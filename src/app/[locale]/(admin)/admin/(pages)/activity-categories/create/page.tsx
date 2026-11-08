import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import ActivityCategoriesHeader from "../_components/ActivityCategoriesHeader";
import ActivityCategoryEditor from "../_components/ActivityCategoryEditor";

export const instant = false;

export default async function CreateActivityCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("activityCategories");
  return (
    <>
      <ActivityCategoriesHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <ActivityCategoryEditor />
      </Suspense>
    </>
  );
}
