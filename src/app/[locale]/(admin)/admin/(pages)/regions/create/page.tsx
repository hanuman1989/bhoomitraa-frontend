import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import RegionEditorContent from "../_components/RegionEditorContent";

// Auth redirects in the parent layout interrupt Next.js instant validation.
export const instant = false;

export default async function CreateRegionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("regions");
  return (
    <>
      <PageBreadcrumb
        pageTitle={t("form.createTitle")}
        description={t("form.description")}
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("allRegions"), href: "/admin/regions" },
          { label: t("form.createTitle") },
        ]}
      />
      <Suspense fallback={<SuspenseFallback title={t("form.loading")} />}>
        <RegionEditorContent />
      </Suspense>
    </>
  );
}
