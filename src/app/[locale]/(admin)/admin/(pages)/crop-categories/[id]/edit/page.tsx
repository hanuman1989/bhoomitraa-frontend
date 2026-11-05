import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import CropCategoriesHeader from "../../_components/CropCategoriesHeader";
import CropCategoryEditor from "../../_components/CropCategoryEditor";

export const instant = false;

export default async function EditCropCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropCategories");
  return (
    <>
      <CropCategoriesHeader mode="edit" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropCategoryEditor id={id} />
      </Suspense>
    </>
  );
}
