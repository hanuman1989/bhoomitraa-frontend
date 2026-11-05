import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import RegionEditorContent from "../../_components/RegionEditorContent";

// Auth redirects in the parent layout interrupt Next.js instant validation.
export const instant = false;

export default async function EditRegionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const regionId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(regionId)) notFound();
  const t = await getTranslations("regions");
  return (
    <>
      <PageBreadcrumb
        pageTitle={t("form.editTitle")}
        description={t("form.description")}
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("allRegions"), href: "/admin/regions" },
          { label: t("form.editTitle") },
        ]}
      />
      <Suspense fallback={<SuspenseFallback title={t("form.loading")} />}>
        <RegionEditorContent id={regionId} />
      </Suspense>
    </>
  );
}
