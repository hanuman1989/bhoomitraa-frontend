import { Suspense, type ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import UserAuthBoundary from "@/providers/UserAuthBoundary";
import AccountDashboardClient from "./_components/AccountDashboardClient";

export default async function AccountProtectedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="bg-success-50 text-success-900 dark:text-success-300 fixed inset-0 flex items-center justify-center dark:bg-gray-950"
        >
          {t("loading")}
        </div>
      }
    >
      <UserAuthBoundary>
        <AccountDashboardClient>{children}</AccountDashboardClient>
      </UserAuthBoundary>
    </Suspense>
  );
}
