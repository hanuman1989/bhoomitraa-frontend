import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import CropCategoriesHeader from "../_components/CropCategoriesHeader";
import CropCategoryEditor from "../_components/CropCategoryEditor";

export const instant = false;

export default async function CreateCropCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cropCategories");
  return (
    <>
      <CropCategoriesHeader mode="create" />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <CropCategoryEditor />
      </Suspense>
    </>
  );
}
