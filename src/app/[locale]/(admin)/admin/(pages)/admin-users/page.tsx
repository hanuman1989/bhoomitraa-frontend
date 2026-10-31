import { Suspense } from "react";
import type { PageProps } from "@/types/api";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import { requireAdmin } from "@/lib/auth/dal";

import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import AdminUserList from "./_components/AdminUserList";
import AdminUsersFilters from "./_components/AdminUsersFilters";
import UrlPagination from "@/components/admin/common/UrlPagination";

import { adminUsersAPI } from "@/lib/apis/admin/adminUsers";
import { setRequestLocale, getTranslations } from "next-intl/server";

function getQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function AdminUsersContent({ searchParams }: PageProps) {
  const tUi = await getTranslations("adminUsers.page");

  await requireAdmin();
  const params = await searchParams;

  const keyword = getQueryValue(params.keyword).trim();
  const rawStatus = getQueryValue(params.status);

  const status: "" | "1" | "0" =
    rawStatus === "1" || rawStatus === "0" ? rawStatus : "";

  const rawPage = Number(getQueryValue(params.page) || "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const result = await adminUsersAPI.list({
    keyword: keyword || undefined,
    status: status || undefined,
    page,
    per_page: 3,
  });

  return (
    <>
      <AdminUsersFilters
        key={JSON.stringify([keyword, status])}
        initialFilters={{ keyword, status }}
      />
      <AdminUserList users={result.data} />
      {result.pagination && result.pagination.last_page > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tUi("showingRange", {
              from: result.pagination.from ?? 0,
              to: result.pagination.to ?? 0,
              total: result.pagination.total,
            })}
          </p>

          <UrlPagination
            currentPage={result.pagination.current_page}
            totalPages={result.pagination.last_page}
          />
        </div>
      )}
    </>
  );
}

export default async function AdminUsersPage({
  searchParams,
  params,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tUi = await getTranslations("adminUsers.page");
  const breadcrumbs = [
    { label: tUi("home"), href: "/admin/dashboard" },
    { label: tUi("adminUsers") },
  ];

  return (
    <>
      <PageBreadcrumb
        pageTitle={tUi("adminUsers")}
        description={tUi("manageAdministratorAccountsAndAccess")}
        breadcrumbs={breadcrumbs}
      />
      <div className="w-full max-w-full min-w-0 overflow-x-auto">
        <Suspense
          fallback={
            <SuspenseFallback
              variant="table"
              rows={6}
              title={tUi("loadingAdminUsers")}
            />
          }
        >
          <AdminUsersContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
