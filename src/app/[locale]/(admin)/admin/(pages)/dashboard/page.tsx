import { setRequestLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import DashboardSummary from "./_components/DashboardSummary";
import DashboardSkeleton from "./_components/DashboardSkeleton";

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
  }>;
}
export default async function DashboardPage({
  searchParams,
  params,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tUi = await getTranslations("dashboard.page");
  const breadcrumbs = [
    { label: tUi("home"), href: "/admin/dashboard" },
    { label: tUi("dashboard") },
  ];

  return (
    <>
      <PageBreadcrumb pageTitle={tUi("dashboard")} breadcrumbs={breadcrumbs} />
      <Suspense fallback={<DashboardSkeleton variant="summary" />}>
        <DashboardSummary searchParams={searchParams} />
      </Suspense>
    </>
  );
}
