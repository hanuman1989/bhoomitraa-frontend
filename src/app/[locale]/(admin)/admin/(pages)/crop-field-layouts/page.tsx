import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import CropFieldLayoutsContent from "./_components/CropFieldLayoutsContent";

export const instant = false;

export default async function CropFieldLayoutsPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <PageBreadcrumb
        pageTitle={t("cropFieldLayouts.title")}
        description={t("cropFieldLayouts.description")}
        breadcrumbs={[
          { label: t("cropFieldLayouts.home"), href: "/admin/dashboard" },
          {
            label: t("sidebar.items.sowingMethods"),
            href: "/admin/sowing-methods",
          },
          { label: t("cropFieldLayouts.title") },
        ]}
      />
      <Suspense
        fallback={
          <SuspenseFallback
            variant="table"
            rows={10}
            title={t("cropFieldLayouts.loading")}
          />
        }
      >
        <CropFieldLayoutsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
