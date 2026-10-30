import { Suspense } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { setRequestLocale } from "next-intl/server";
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

function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      Loading admin...
    </div>
  );
}
