import { Suspense, type ReactNode } from "react";
import { SidebarProvider } from "@/context/SidebarContext";
import { setRequestLocale, getTranslations } from "next-intl/server";
import AdminShell from "./_components/AdminShell";
import { requireAdmin } from "@/lib/auth/dal";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <SidebarProvider>
      <AdminShell>{children}</AdminShell>
    </SidebarProvider>
  );
}

export default async function AdminPagesLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<AdminLoading />}>
      <ProtectedAdminLayout>{children}</ProtectedAdminLayout>
    </Suspense>
  );
}

async function AdminLoading() {
  const tUi = await getTranslations("ui.adminLoading");

  return <div className="p-6">{tUi("loadingAdminPanel")}</div>;
}
