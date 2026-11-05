import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import type { PageProps } from "@/types/api";
import RegionsContent from "./_components/RegionsContent";

// Auth redirects in the parent layout interrupt Next.js instant validation.
export const instant = false;

export default async function RegionsPage({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("regions");

  return (
    <>
      <PageBreadcrumb
        pageTitle={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("management") },
          { label: t("allRegions") },
        ]}
      />
      <Suspense
        fallback={
          <SuspenseFallback variant="table" rows={10} title={t("loading")} />
        }
      >
        <RegionsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
