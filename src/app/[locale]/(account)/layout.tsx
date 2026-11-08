import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import "simplebar-react/dist/simplebar.min.css";
import "swiper/css/bundle";
import UserAuthBoundary from "@/providers/UserAuthBoundary";

export default async function UserRootLayout({
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
      <UserAuthBoundary>{children}</UserAuthBoundary>
    </Suspense>
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
