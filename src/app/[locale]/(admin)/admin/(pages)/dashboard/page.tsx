import { Suspense } from "react";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import DashboardSummary from "./_components/DashboardSummary";
import DashboardSkeleton from "./_components/DashboardSkeleton";
const breadcrumbs = [
  { label: "Home", href: "/admin/dashboard" },
  { label: "Dashboard" },
];
interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    year?: string;
  }>;
}
export default function DashboardPage({ searchParams }: PageProps) {
  return (
    <>
      <PageBreadcrumb pageTitle="Dashboard" breadcrumbs={breadcrumbs} />
      <Suspense fallback={<DashboardSkeleton variant="summary" />}>
        <DashboardSummary searchParams={searchParams} />
      </Suspense>
    </>
  );
}
