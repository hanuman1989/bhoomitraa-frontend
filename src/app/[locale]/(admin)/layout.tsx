import { Suspense } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { setRequestLocale, getTranslations } from "next-intl/server";
import "simplebar-react/dist/simplebar.min.css";
import "swiper/css/bundle";
import AdminAuthBoundary from "@/providers/AdminAuthBoundary";

export default async function AdminRootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ThemeProvider>
      <Suspense fallback={<AdminLoading />}>
        <AdminAuthBoundary>{children}</AdminAuthBoundary>
      </Suspense>
    </ThemeProvider>
  );
}

async function AdminLoading() {
  const tUi = await getTranslations("ui.adminLoading");

  return (
    <div className="flex min-h-screen items-center justify-center">
      {tUi("loadingAdmin")}
    </div>
  );
}
