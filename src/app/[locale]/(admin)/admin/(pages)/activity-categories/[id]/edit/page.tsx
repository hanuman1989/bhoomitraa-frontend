import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import ActivityCategoriesHeader from "../../_components/ActivityCategoriesHeader";
import ActivityCategoryEditor from "../../_components/ActivityCategoryEditor";

export const instant = false;

export default async function EditActivityCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("activityCategories");
  return (
    <>
      <ActivityCategoriesHeader mode="edit" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <ActivityCategoryEditor id={id} />
      </Suspense>
    </>
  );
}
