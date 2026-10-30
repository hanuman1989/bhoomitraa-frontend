import { Suspense } from "react";
import type { PageProps } from "@/types/api";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import { requireAdmin } from "@/lib/auth/dal";

import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import AdminUserList from "./_components/AdminUserList";
import AdminUsersFilters from "./_components/AdminUsersFilters";

import { adminUsersAPI } from "@/lib/apis/admin/adminUsers";

const breadcrumbs = [
  { label: "Home", href: "/admin/dashboard" },
  { label: "Admin Users" },
];

function getQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function AdminUsersContent({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;

  const keyword = getQueryValue(params.keyword).trim();
  const rawStatus = getQueryValue(params.status);

  const status: "" | "1" | "0" =
    rawStatus === "1" || rawStatus === "0" ? rawStatus : "";

  const rawPage = Number(params.page || "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const result = await adminUsersAPI.list({
    keyword: keyword || undefined,
    status: status || undefined,
    page,
    per_page: 15,
  });

  return (
    <>
      <AdminUsersFilters initialFilters={{ keyword, status }} />
      <AdminUserList users={result.data} />
    </>
  );
}

export default function AdminUsersPage({ searchParams }: PageProps) {
  return (
    <>
      <PageBreadcrumb
        pageTitle="Admin Users"
        description="Manage administrator accounts and access."
        breadcrumbs={breadcrumbs}
      />
      <div className="w-full max-w-full min-w-0 overflow-x-auto">
        <Suspense
          fallback={
            <SuspenseFallback
              variant="table"
              rows={6}
              title="Loading admin users..."
            />
          }
        >
          <AdminUsersContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
