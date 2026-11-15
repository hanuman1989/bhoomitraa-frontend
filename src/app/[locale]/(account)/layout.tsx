import { setRequestLocale } from "next-intl/server";
import AppToaster from "@/components/common/AppToaster";

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
    <>
      {children}
      <AppToaster />
    </>
  );
}
