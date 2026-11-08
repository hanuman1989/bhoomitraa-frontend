import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import TimelineGeneratorContent from "./_components/TimelineGeneratorContent";

export const instant = false;

export default async function FarmerSmartTimelinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("farmerSmartTimeline");
  return (
    <>
      <PageBreadcrumb
        pageTitle={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("farmManager") },
          { label: t("menu") },
        ]}
      />
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <TimelineGeneratorContent />
      </Suspense>
    </>
  );
}
